'use strict';
// Inventário e equipamentos guardam itens; atributos base nunca recebem bônus diretamente.
window.DanMachiItems = (() => {
  const rarities = ['Comum', 'Incomum', 'Raro', 'Épico', 'Lendário'];
  const types = ['sword', 'shield', 'amulet', 'heal', 'damagePotion', 'armorPotion'];
  const attributes = { maxHp: 'Vida', damage: 'Dano', luck: 'Sorte', armor: 'Armadura' };
  const names = { sword: 'Espada', shield: 'Escudo', amulet: 'Amuleto', heal: 'Poção de cura', damagePotion: 'Poção de dano', armorPotion: 'Poção de armadura' };
  const icons = { sword: '⚔', shield: '⛨', amulet: '◆', heal: '♥', damagePotion: '⚗', armorPotion: '▣' };
  const healing = [7, 10, 15, 20, 30];
  const ok = message => ({ ok: true, message });
  const fail = message => ({ ok: false, message });
  function createItem(state, type, rarity = 0, attribute = null) {
    if (!types.includes(type) || !Number.isInteger(rarity) || rarity < 0 || rarity > 4 || (type === 'amulet' && !Object.hasOwn(attributes, attribute))) throw new Error('Item inválido.');
    return { id: `item-${state.itemSequence++}`, type, rarity, attribute: type === 'amulet' ? attribute : null };
  }
  function initialize(state) {
    state.itemSequence = 1;
    state.inventory = Array(5).fill(null);
    state.equipment = { sword: createItem(state, 'sword'), shield: null, amulet: null };
    state.buffs = { damage: 0, armor: 0 };
    state.fusion = [null, null];
    state.rewards = { floor: null, pending: [] };
    state.droppedFloors = [];
    return state;
  }
  function describe(item) {
    const rank = item.rarity + 1;
    const bonus = { sword: `+${10 * rank} dano`, shield: `+${5 * rank} defesa`, amulet: `+${5 * rank}% ${attributes[item.attribute]}`,
      heal: `Restaura ${healing[item.rarity]} HP`, damagePotion: '+30% dano por 5 ações', armorPotion: '+30% armadura base por 5 ações' }[item.type];
    const extra = item.type === 'heal' ? 'Não ultrapassa a Vida máxima. Uso somente entre combates.'
      : item.type.endsWith('Potion') ? 'Uso somente entre combates. Reutilizar renova a duração, sem acumular bônus. A raridade não altera a potência.'
      : item.type === 'amulet' && item.attribute === 'maxHp' ? 'Aumenta a Vida máxima sem curar ao equipar. Retirar limita a Vida atual ao novo máximo.'
      : item.type === 'shield' ? 'Defender aumenta somente a defesa do escudo em 40% na resposta do inimigo.'
      : 'O bônus vale somente enquanto este item estiver equipado.';
    return { name: names[item.type] + (item.type === 'amulet' ? ` de ${attributes[item.attribute]}` : ''), rarity: rarities[item.rarity], icon: icons[item.type], bonus, description: extra };
  }
  function effective(state) {
    const amulet = state.equipment.amulet;
    const percent = attribute => amulet?.attribute === attribute ? (amulet.rarity + 1) * 0.05 : 0;
    const sword = state.equipment.sword ? (state.equipment.sword.rarity + 1) * 10 : 0;
    const shield = state.equipment.shield ? (state.equipment.shield.rarity + 1) * 5 : 0;
    const hpPercent = amulet?.attribute === 'maxHp' ? (amulet.rarity + 1) * 5 : 0;
    return { maxHp: Math.floor(state.maxHp * (100 + hpPercent) / 100),
      damage: (state.damage + sword) * (1 + percent('damage')) * (state.buffs.damage > 0 ? 1.3 : 1),
      luck: state.luck * (1 + percent('luck')),
      armor: state.armor * (1 + percent('armor') + (state.buffs.armor > 0 ? 0.3 : 0)) + shield,
      defendingArmor: state.armor * (1 + percent('armor') + (state.buffs.armor > 0 ? 0.3 : 0)) + shield * 1.4 };
  }
  function clampHp(state) { state.hp = Math.min(state.hp, effective(state).maxHp); }
  function editable(state) { return state.phase === 'intermission'; }
  function cleanFusion(state) {
    state.fusion = state.fusion.map(id => state.inventory.some(item => item?.id === id) ? id : null);
  }
  function equip(state, id) {
    if (!editable(state)) return fail('Equipe itens somente entre combates.');
    const index = state.inventory.findIndex(item => item?.id === id);
    const item = state.inventory[index];
    if (!item || !['sword', 'shield', 'amulet'].includes(item.type)) return fail('Selecione um equipamento no inventário.');
    // Troca atômica: o equipamento antigo ocupa o espaço liberado pelo novo.
    state.inventory[index] = state.equipment[item.type];
    state.equipment[item.type] = item;
    cleanFusion(state); clampHp(state);
    return ok(`${describe(item).name} equipado. O equipamento anterior voltou ao inventário, se havia um.`);
  }
  function unequip(state, slot) {
    if (!editable(state)) return fail('Desequipe itens somente entre combates.');
    if (!['sword', 'shield', 'amulet'].includes(slot) || !state.equipment[slot]) return fail('Este slot está vazio.');
    const index = state.inventory.indexOf(null);
    if (index < 0) return fail('Inventário cheio. Descarte, consuma ou funda itens antes de desequipar.');
    state.inventory[index] = state.equipment[slot];
    state.equipment[slot] = null;
    clampHp(state);
    return ok('Equipamento devolvido ao inventário.');
  }
  function discard(state, id) {
    if (!editable(state)) return fail('Descarte itens somente entre combates.');
    const index = state.inventory.findIndex(item => item?.id === id);
    if (index < 0) return fail('Selecione um item do inventário. Para descartar equipamento, desequipe primeiro.');
    state.inventory[index] = null;
    cleanFusion(state);
    return ok('Item descartado.');
  }
  function consume(state, id) {
    if (!editable(state)) return fail('Poções só podem ser usadas entre combates.');
    const index = state.inventory.findIndex(item => item?.id === id);
    const item = state.inventory[index];
    if (!item || !['heal', 'damagePotion', 'armorPotion'].includes(item.type)) return fail('Selecione uma poção do inventário.');
    let message;
    if (item.type === 'heal') {
      const restored = Math.min(healing[item.rarity], effective(state).maxHp - state.hp);
      if (restored <= 0) return fail('A Vida já está cheia. A poção não foi consumida.');
      state.hp += restored;
      message = `Poção consumida: +${restored} HP.`;
    } else {
      const attribute = item.type === 'damagePotion' ? 'damage' : 'armor';
      state.buffs[attribute] = 5;
      message = `Poção consumida: ${attributes[attribute]} +30% por 5 ações de Finn. O bônus não acumula.`;
    }
    state.inventory[index] = null;
    cleanFusion(state);
    return ok(message);
  }
  function tickBuffs(state) {
    state.buffs.damage = Math.max(0, state.buffs.damage - 1);
    state.buffs.armor = Math.max(0, state.buffs.armor - 1);
  }
  function fusionReason(a, b) {
    if (!a || !b) return 'Selecione dois itens nos slots de fusão.';
    if (a.id === b.id) return 'Use dois itens diferentes; não é possível fundir um item consigo mesmo.';
    if (a.type !== b.type) return 'Os itens precisam ser do mesmo tipo.';
    if (a.rarity !== b.rarity) return 'Os itens precisam ter a mesma raridade.';
    if (a.rarity === 4) return 'Itens lendários não podem ser fundidos.';
    if (a.type === 'amulet' && a.attribute !== b.attribute) return 'Amuletos precisam melhorar o mesmo atributo.';
    return '';
  }
  function setFusion(state, id, slot) {
    if (!editable(state)) return fail('Prepare a fusão somente entre combates.');
    if (![0, 1].includes(slot)) return fail('Slot de fusão inválido.');
    if (id !== null && !state.inventory.some(item => item?.id === id)) return fail('Use um item do inventário; desequipe antes de fundir.');
    if (id !== null && state.fusion[1 - slot] === id) return fail('Este item já ocupa o outro slot de fusão.');
    state.fusion[slot] = id;
    return ok(id === null ? 'Slot de fusão liberado.' : 'Item preparado para fusão. Ele continua no inventário até confirmar.');
  }
  function fuse(state) {
    if (!editable(state)) return fail('Fusões só podem ser feitas entre combates.');
    const indices = state.fusion.map(id => state.inventory.findIndex(item => item && item.id === id));
    const [a, b] = indices.map(index => state.inventory[index]);
    const reason = fusionReason(a, b);
    if (reason) return fail(reason);
    const result = createItem(state, a.type, a.rarity + 1, a.attribute);
    state.inventory[indices[0]] = result;
    state.inventory[indices[1]] = null;
    state.fusion = [null, null];
    return ok(`Fusão concluída: ${describe(result).name} · ${rarities[result.rarity]}.`);
  }
  function rarityWeights(level, luck) {
    const q = Math.min(79, Math.max(0, 3 * (level - 1) + Math.max(0, luck - 5)));
    const legendary = Math.min(5, 0.07 * q);
    return [79 - q, 15 + 0.25 * q, 5 + 0.40 * q + Math.max(0, 0.07 * q - 5), 1 + 0.28 * q, legendary];
  }
  function weightedIndex(weights, random) {
    const roll = random() * weights.reduce((a, b) => a + b, 0);
    let sum = 0;
    for (let i = 0; i < weights.length; i++) { sum += weights[i]; if (roll < sum) return i; }
    return weights.length - 1;
  }
  function rollCount(random = Math.random) { return weightedIndex([50, 35, 15], random) + 1; }
  function rollType(random = Math.random) { return types[weightedIndex([25, 20, 15, 30, 5, 5], random)]; }
  function rollRarity(level, luck, random = Math.random) { return weightedIndex(rarityWeights(level, luck), random); }
  function generateDrops(state, random = Math.random) {
    if (state.phase !== 'intermission' || state.battle !== 3 || state.enemy.boss || state.droppedFloors.includes(state.floor)) return [];
    const count = rollCount(random);
    const luck = effective(state).luck;
    const pending = [];
    for (let i = 0; i < count; i++) {
      const type = rollType(random);
      const rarity = rollRarity(state.level, luck, random);
      const attribute = type === 'amulet' ? Object.keys(attributes)[Math.floor(random() * 4)] : null;
      pending.push(createItem(state, type, rarity, attribute));
    }
    state.droppedFloors.push(state.floor);
    state.rewards = { floor: state.floor, pending };
    return pending.slice();
  }
  function receiveReward(state, id, replaceId = null) {
    if (!editable(state)) return fail('Receba recompensas somente entre combates.');
    const rewardIndex = state.rewards.pending.findIndex(item => item.id === id);
    if (rewardIndex < 0) return fail('Esta recompensa já foi resolvida.');
    let index = state.inventory.indexOf(null);
    if (index < 0) {
      index = state.inventory.findIndex(item => item.id === replaceId);
      if (index < 0) return fail('Inventário cheio. Escolha qual item descartar ou recuse a recompensa.');
    }
    const item = state.rewards.pending[rewardIndex];
    state.inventory[index] = item;
    state.rewards.pending.splice(rewardIndex, 1);
    cleanFusion(state);
    return ok(`${describe(item).name} recebido no inventário.`);
  }
  function refuseReward(state, id) {
    if (!editable(state)) return fail('Resolva recompensas somente entre combates.');
    const index = state.rewards.pending.findIndex(item => item.id === id);
    if (index < 0) return fail('Esta recompensa já foi resolvida.');
    state.rewards.pending.splice(index, 1);
    return ok('Recompensa descartada por sua escolha.');
  }
  return { rarities, types, attributes, initialize, createItem, describe, effective, equip, unequip, discard, consume,
    tickBuffs, setFusion, fusionReason, fuse, rarityWeights, rollCount, rollType, rollRarity, generateDrops, receiveReward, refuseReward };
})();
