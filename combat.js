'use strict';
// Regras independentes do DOM; aleatoriedade injetável para testes.
window.DanMachi = (() => {
  function enemyFor(floor, battle, boss = false, random = Math.random) {
    if (boss) return { name: 'Rei Gelado', level: 10, hp: 190, maxHp: 190, damage: 46, armor: 10, boss: true };
    const upgraded = battle > 1 && random() < (battle === 2 ? 0.30 : 0.75);
    const level = Math.min(10, floor + (upgraded ? 1 : 0));
    return { name: 'Monstro', level, hp: 15 + 10 * level, maxHp: 15 + 10 * level, damage: 3 + 3 * level, armor: 2 * Math.floor((level - 1) / 3), boss: false };
  }
  function createCampaign(princesses, random = Math.random) {
    if (princesses.length !== 3 || new Set(princesses.map(p => p.id)).size !== 3) throw new Error('Escolha três princesas diferentes.');
    const order = princesses.map(p => ({ ...p }));
    for (let i = order.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [order[i], order[j]] = [order[j], order[i]];
    }
    return window.DanMachiItems.initialize({ floor: 1, battle: 1, turn: 0, phase: 'combat', hp: 20, maxHp: 20,
      damage: 15, luck: 5, armor: 0, level: 1, xp: 0, upgrades: [],
      princesses: order, rescued: [], firstRescueFloor: null, enemy: enemyFor(1, 1) });
  }
  function xpNeeded(level) { return 20 + 5 * (level - 1); }
  function awardXp(state) {
    if (state.level === 10) return 0;
    const fraction = state.enemy.level < state.level ? 0.20 : state.enemy.level === state.level ? 0.30 : 0.50;
    const earned = Math.floor(xpNeeded(state.level) * fraction);
    state.xp += earned;
    while (state.level < 10 && state.xp >= xpNeeded(state.level)) {
      state.xp -= xpNeeded(state.level);
      state.level++;
      const doubled = state.level >= 6 ? 2 : 1;
      state.upgrades.push(doubled, doubled);
    }
    return earned;
  }
  function rescue(state, random, messages) {
    let chance = 0;
    if (state.rescued.length === 0) chance = Math.min(1, 0.10 + (state.floor - 1) * 0.90 / 7);
    else if (state.rescued.length === 1 && state.floor > state.firstRescueFloor) {
      const firstEligible = state.firstRescueFloor + 1;
      chance = firstEligible >= 9 ? 1 : Math.min(1, 0.10 + (state.floor - firstEligible) * 0.90 / (9 - firstEligible));
    }
    if (chance > 0 && random() < chance) {
      const princess = state.princesses[state.rescued.length];
      state.rescued.push(princess);
      if (state.rescued.length === 1) state.firstRescueFloor = state.floor;
      messages.push(`${princess.name} foi resgatada! ${princess.summary} Você conquistou uma estrela.`);
    }
  }
  function playTurn(state, action, random = Math.random) {
    if (state.phase !== 'combat' || !['attack', 'defend'].includes(action)) return [];
    state.turn++;
    const defending = action === 'defend';
    const stats = window.DanMachiItems.effective(state);
    const critical = !defending && random() < Math.min(100, Math.max(0, stats.luck)) / 100;
    const damage = Math.floor(Math.max(0, stats.damage * (defending ? 0.5 : 1) * (critical ? 2 : 1) - state.enemy.armor));
    state.enemy.hp = Math.max(0, state.enemy.hp - damage);
    const messages = [`Turno ${state.turn}: Finn ${defending ? 'defendeu e atacou' : 'atacou'} causando ${damage} de dano${critical ? ' (crítico)' : ''}.`];
    if (state.enemy.hp === 0) {
      if (state.enemy.boss) {
        state.rescued = state.princesses.slice();
        state.phase = 'victory';
        messages.push(`Vitória! O Rei Gelado foi derrotado. ${state.princesses[2].name} está livre: as três princesas foram resgatadas!`);
      } else {
        state.phase = 'intermission';
        messages.push(`Monstro derrotado, sem contra-ataque! +${awardXp(state)} XP.`);
        if (state.battle === 3) rescue(state, random, messages);
        const drops = window.DanMachiItems.generateDrops(state, random);
        if (drops.length) messages.push(`Andar concluído! ${drops.length} recompensa(s) disponível(is). Receba ou descarte cada item antes de avançar.`);
        if (state.upgrades.length) messages.push('Escolha seus bônus de evolução antes de continuar.');
      }
    } else {
      const received = Math.floor(Math.max(0, state.enemy.damage - (defending ? stats.defendingArmor : stats.armor)));
      state.hp = Math.max(0, state.hp - received);
      messages.push(`${state.enemy.name} contra-atacou: ${received} de dano.`);
      if (defending) messages.push(state.equipment.shield ? 'A defesa do escudo aumentou 40% nesta resposta.' : 'Sem escudo equipado, não há bônus de defesa do escudo.');
      if (state.hp === 0) { state.phase = 'gameover'; messages.push('Game Over. Inicie uma nova aventura para tentar novamente.'); }
      else messages.push('Sua vez de escolher.');
    }
    window.DanMachiItems.tickBuffs(state);
    return messages;
  }
  function chooseUpgrade(state, attribute) {
    if (state.phase !== 'intermission' || !state.upgrades.length) return false;
    const base = { maxHp: 5, damage: 5, luck: 2, armor: 3 }[attribute];
    if (!base) return false;
    const gain = base * state.upgrades.shift();
    state[attribute] += gain;
    if (attribute === 'maxHp') state.hp = Math.min(window.DanMachiItems.effective(state).maxHp, state.hp + gain);
    return true;
  }
  function nextBattle(state, random = Math.random) {
    if (state.phase !== 'intermission' || state.upgrades.length || state.rewards.pending.length) return false;
    let boss = false;
    if (state.battle < 3) state.battle++;
    else if (state.floor < 10) { state.floor++; state.battle = 1; }
    else boss = true;
    state.enemy = enemyFor(state.floor, state.battle, boss, random);
    state.turn = 0;
    state.phase = 'combat';
    return true;
  }
  return { createCampaign, enemyFor, playTurn, nextBattle, chooseUpgrade, xpNeeded };
})();
