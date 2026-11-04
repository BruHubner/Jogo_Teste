'use strict';
window.DanMachiStorage = (() => {
  const key = 'danmachi.campaign.v1';
  const version = 1;
  const integer = (n, min, max) => Number.isInteger(n) && n >= min && n <= max;
  const text = (s, max) => typeof s === 'string' && s.length <= max;
  function valid(state) {
    const I = window.DanMachiItems;
    if (!state || typeof state !== 'object' || !['combat', 'intermission', 'victory'].includes(state.phase)) return false;
    if (!integer(state.floor, 1, 10) || !integer(state.battle, 1, 3) || !integer(state.turn, 0, 1000000) || !integer(state.level, 1, 10)) return false;
    if (!['hp', 'maxHp', 'damage', 'luck', 'armor', 'xp'].every(k => integer(state[k], k === 'hp' || k === 'maxHp' ? 1 : 0, 1000000))) return false;
    if (!Array.isArray(state.upgrades) || state.upgrades.length > 18 || !state.upgrades.every(n => n === 1 || n === 2) || (state.upgrades.length && state.phase !== 'intermission')) return false;
    if (!Array.isArray(state.princesses) || state.princesses.length !== 3 || !state.princesses.every(p => p && text(p.id, 80) && p.id.length && text(p.name, 160) && text(p.summary, 2000))) return false;
    const princessIds = new Set(state.princesses.map(p => p.id));
    if (princessIds.size !== 3 || !Array.isArray(state.rescued) || state.rescued.length > 3 || !state.rescued.every(p => p && princessIds.has(p.id)) || new Set(state.rescued.map(p => p.id)).size !== state.rescued.length) return false;
    if (!(state.firstRescueFloor === null || integer(state.firstRescueFloor, 1, state.floor))) return false;
    const enemy = state.enemy;
    if (!enemy || !text(enemy.name, 160) || !integer(enemy.level, 1, 10) || !integer(enemy.maxHp, 1, 1000000) || !integer(enemy.hp, 0, enemy.maxHp) || !integer(enemy.damage, 0, 1000000) || !integer(enemy.armor, 0, 1000000) || typeof enemy.boss !== 'boolean') return false;
    if ((state.phase === 'combat' && enemy.hp === 0) || (state.phase !== 'combat' && enemy.hp !== 0)) return false;
    if (!text(state.story, 10000) || !text(state.feedback, 10000)) return false;
    if (!Array.isArray(state.inventory) || state.inventory.length !== 5 || !state.equipment || !state.buffs || !integer(state.buffs.damage, 0, 5) || !integer(state.buffs.armor, 0, 5)) return false;
    if (!state.rewards || !(state.rewards.floor === null || integer(state.rewards.floor, 1, state.floor)) || !Array.isArray(state.rewards.pending) || state.rewards.pending.length > 3) return false;
    if (state.rewards.pending.length && (state.phase !== 'intermission' || state.battle !== 3 || enemy.boss || state.rewards.floor !== state.floor)) return false;
    if (!Array.isArray(state.droppedFloors) || state.droppedFloors.length > 10 || new Set(state.droppedFloors).size !== state.droppedFloors.length || !state.droppedFloors.every(n => integer(n, 1, state.floor))) return false;
    if (state.rewards.floor !== null && !state.droppedFloors.includes(state.rewards.floor)) return false;
    const items = [];
    function validItem(item) {
      if (!item || !text(item.id, 60) || !/^item-[1-9]\d*$/.test(item.id) || !I.types.includes(item.type) || !integer(item.rarity, 0, 4)) return false;
      if (item.type === 'amulet' ? !Object.hasOwn(I.attributes, item.attribute) : item.attribute !== null) return false;
      items.push(item);
      return true;
    }
    if (!state.inventory.every(item => item === null || validItem(item))) return false;
    for (const slot of ['sword', 'shield', 'amulet']) {
      const item = state.equipment[slot];
      if (item !== null && (!validItem(item) || item.type !== slot)) return false;
    }
    if (!state.rewards.pending.every(validItem)) return false;
    if (new Set(items.map(item => item.id)).size !== items.length || !integer(state.itemSequence, 1, 1000000) || items.some(item => Number(item.id.slice(5)) >= state.itemSequence)) return false;
    if (!Array.isArray(state.fusion) || state.fusion.length !== 2 || !state.fusion.every(id => id === null || state.inventory.some(item => item && item.id === id)) || (state.fusion[0] !== null && state.fusion[0] === state.fusion[1])) return false;
    return state.hp <= I.effective(state).maxHp;
  }
  function load(storage) {
    try {
      storage = storage || window.localStorage;
      const raw = storage.getItem(key);
      if (!raw) return { state: null, message: 'Nenhuma aventura salva.' };
      if (raw.length > 150000) throw new Error('Dados muito grandes');
      const data = JSON.parse(raw);
      if (data.schemaVersion !== version || !valid(data.state)) throw new Error('Versão ou dados inválidos');
      return { state: data.state, message: 'Aventura recuperada. Itens, recompensas e efeitos foram mantidos.' };
    } catch {
      return { state: null, message: 'Não foi possível recuperar o salvamento. Inicie uma nova aventura; o jogo continua disponível.' };
    }
  }
  function save(state, storage) {
    try {
      storage = storage || window.localStorage;
      if (!state || state.phase === 'gameover') storage.removeItem(key);
      else storage.setItem(key, JSON.stringify({ schemaVersion: version, state }));
      return { ok: true, message: state?.phase === 'gameover' ? 'Campanha encerrada. O salvamento desta aventura foi removido.' : 'Aventura salva automaticamente neste navegador.' };
    } catch {
      return { ok: false, message: 'Não foi possível salvar neste navegador. O progresso atual será perdido ao atualizar a página.' };
    }
  }
  return { key, version, valid, load, save };
})();
