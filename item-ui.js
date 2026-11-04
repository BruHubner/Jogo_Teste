'use strict';
window.DanMachiItemUI = (() => {
  function create(getState, changed) {
    const I = window.DanMachiItems;
    const $ = id => document.getElementById(id);
    let inspected = null;
    let confirmAction = null;
    let replacementId = null;
    function button(label, action, disabled = false) {
      const node = document.createElement('button');
      node.type = 'button'; node.textContent = label; node.disabled = disabled;
      node.addEventListener('click', action);
      return node;
    }
    function itemButton(item, action, emptyLabel = 'Vazio') {
      const node = button('', action);
      node.className = 'item-slot';
      if (!item) { node.textContent = emptyLabel; node.disabled = true; return node; }
      const info = I.describe(item);
      node.dataset.itemId = item.id;
      node.dataset.rarity = item.rarity;
      const icon = document.createElement('span'); icon.className = 'item-icon'; icon.setAttribute('aria-hidden', 'true'); icon.textContent = info.icon;
      const title = document.createElement('strong'); title.textContent = info.name;
      const rarity = document.createElement('small'); rarity.textContent = info.rarity;
      const bonus = document.createElement('small'); bonus.textContent = info.bonus;
      node.append(icon, title, rarity, bonus);
      return node;
    }
    function result(actionResult) {
      $('item-status').textContent = actionResult.message;
      if (actionResult.ok) changed();
    }
    function ask(message, action) {
      if ($('item-details').open) $('item-details').close();
      $('confirm-message').textContent = message;
      confirmAction = action;
      $('confirm-item').showModal();
    }
    function inspect(item, equippedSlot = null) {
      inspected = { id: item.id, equippedSlot };
      const state = getState();
      const info = I.describe(item);
      $('item-detail-title').textContent = `${info.icon} ${info.name}`;
      $('item-detail-rarity').textContent = info.rarity;
      $('item-detail-rarity').dataset.rarity = item.rarity;
      $('item-detail-description').textContent = `${info.bonus}. ${info.description}`;
      const editable = state.phase === 'intermission';
      $('equip-item').hidden = !!equippedSlot || !['sword', 'shield', 'amulet'].includes(item.type);
      $('unequip-item').hidden = !equippedSlot;
      $('use-item').hidden = !!equippedSlot || !['heal', 'damagePotion', 'armorPotion'].includes(item.type);
      $('discard-item').hidden = !!equippedSlot;
      $('fusion-first').hidden = $('fusion-second').hidden = !!equippedSlot;
      for (const node of $('item-detail-actions').querySelectorAll('button')) node.disabled = !editable;
      $('item-detail-hint').textContent = editable ? (equippedSlot ? 'Desequipe para descartar ou fundir. É necessário um espaço livre.' : 'Gerencie este item ou coloque-o em um dos slots de fusão.') : 'Você pode inspecionar agora. Gerencie itens e use poções entre combates.';
      $('item-details').showModal();
    }
    function selectedAction(action) {
      if (!inspected) return;
      const answer = action(getState(), inspected);
      if (answer.ok) $('item-details').close();
      result(answer);
      if (!answer.ok) $('item-detail-hint').textContent = answer.message;
    }
    $('close-item').addEventListener('click', () => $('item-details').close());
    $('equip-item').addEventListener('click', () => selectedAction((s, item) => I.equip(s, item.id)));
    $('unequip-item').addEventListener('click', () => selectedAction((s, item) => I.unequip(s, item.equippedSlot)));
    $('use-item').addEventListener('click', () => selectedAction((s, item) => I.consume(s, item.id)));
    $('discard-item').addEventListener('click', () => {
      const id = inspected?.id;
      const item = getState().inventory.find(item => item?.id === id);
      if (item) ask(`Descartar ${I.describe(item).name} · ${I.describe(item).rarity}? Esta ação remove o item do inventário.`, () => I.discard(getState(), id));
    });
    $('confirm-yes').addEventListener('click', () => {
      const action = confirmAction; confirmAction = null;
      $('confirm-item').close();
      if (action) result(action());
    });
    $('confirm-no').addEventListener('click', () => { confirmAction = null; $('confirm-item').close(); });
    $('confirm-item').addEventListener('cancel', () => { confirmAction = null; });
    for (const [id, slot] of [['fusion-first', 0], ['fusion-second', 1]]) $(id).addEventListener('click', () => selectedAction((s, item) => I.setFusion(s, item.id, slot)));
    $('fuse-items').addEventListener('click', () => result(I.fuse(getState())));
    $('replacement-slot').addEventListener('change', () => { $('replace-reward').disabled = !$('replacement-slot').value; });
    $('cancel-replacement').addEventListener('click', () => $('inventory-full').close());
    $('replace-reward').addEventListener('click', () => {
      const id = replacementId;
      const replaceId = $('replacement-slot').value;
      $('inventory-full').close();
      result(I.receiveReward(getState(), id, replaceId));
    });
    function receive(item) {
      const state = getState();
      if (state.inventory.includes(null)) { result(I.receiveReward(state, item.id)); return; }
      replacementId = item.id;
      $('replacement-description').textContent = `Para receber ${I.describe(item).name} · ${I.describe(item).rarity}, escolha um item guardado para descartar. Nada será perdido se você cancelar.`;
      const select = $('replacement-slot'); select.replaceChildren();
      const placeholder = document.createElement('option'); placeholder.value = ''; placeholder.textContent = 'Escolha o item a descartar'; select.append(placeholder);
      state.inventory.forEach((stored, index) => {
        const option = document.createElement('option'); option.value = stored.id;
        const info = I.describe(stored); option.textContent = `${index + 1}. ${info.name} · ${info.rarity} · ${info.bonus}`;
        select.append(option);
      });
      $('replace-reward').disabled = true;
      $('inventory-full').showModal();
    }
    function render() {
      const state = getState();
      if (!state) return;
      $('equipment-list').replaceChildren();
      for (const [slot, label] of [['sword', 'Espada'], ['shield', 'Escudo'], ['amulet', 'Amuleto']]) {
        const li = document.createElement('li');
        const item = state.equipment[slot];
        li.append(itemButton(item, () => inspect(item, slot), `${label} · Vazio`));
        $('equipment-list').append(li);
      }
      $('inventory-count').textContent = `${state.inventory.filter(Boolean).length} / 5`;
      $('inventory-slots').replaceChildren();
      state.inventory.forEach((item, index) => {
        const li = document.createElement('li');
        const node = itemButton(item, () => inspect(item), `${index + 1} · Vazio`);
        node.setAttribute('aria-label', item ? `Espaço ${index + 1}: ${I.describe(item).name}, ${I.describe(item).rarity}, ${I.describe(item).bonus}` : `Espaço ${index + 1} vazio`);
        li.append(node); $('inventory-slots').append(li);
      });
      const effects = [];
      if (state.buffs.damage) effects.push(`Dano +30%: ${state.buffs.damage} ações restantes`);
      if (state.buffs.armor) effects.push(`Armadura base +30%: ${state.buffs.armor} ações restantes`);
      $('active-effects').textContent = `Efeitos temporários: ${effects.length ? effects.join('; ') : 'nenhum'}.`;
      $('fusion-slots').replaceChildren();
      state.fusion.forEach((id, slot) => {
        const item = state.inventory.find(item => item?.id === id);
        const node = itemButton(item, () => result(I.setFusion(state, null, slot)), `Fusão ${slot + 1} · Vazio`);
        node.disabled = !item || state.phase !== 'intermission';
        if (item) node.setAttribute('aria-label', `Remover ${I.describe(item).name} do slot de fusão ${slot + 1}`);
        $('fusion-slots').append(node);
      });
      $('fuse-items').disabled = state.phase !== 'intermission';
      $('rewards').hidden = !(state.phase === 'intermission' && state.battle === 3 && state.rewards.floor === state.floor);
      $('reward-heading').textContent = `Recompensas do andar ${state.rewards.floor || state.floor}`;
      $('reward-summary').textContent = state.rewards.pending.length ? `${state.rewards.pending.length} item(ns) aguardando sua decisão. Receba ou descarte cada recompensa para avançar.` : 'Recompensas resolvidas. Você já pode continuar, após concluir eventuais escolhas de evolução.';
      $('reward-list').replaceChildren();
      for (const item of state.rewards.pending) {
        const card = document.createElement('article'); card.className = 'reward-card'; card.dataset.rarity = item.rarity;
        const info = I.describe(item);
        const title = document.createElement('h3'); title.textContent = `${info.icon} ${info.name} · ${info.rarity}`;
        const detail = document.createElement('p'); detail.textContent = `${info.bonus}. ${info.description}`;
        const actions = document.createElement('div'); actions.className = 'item-actions';
        const receiveButton = button('Receber', () => receive(item)); receiveButton.dataset.receiveId = item.id;
        const refuseButton = button('Descartar recompensa', () => ask(`Descartar a recompensa ${info.name} · ${info.rarity}?`, () => I.refuseReward(getState(), item.id)));
        refuseButton.dataset.refuseId = item.id;
        actions.append(receiveButton, refuseButton); card.append(title, detail, actions); $('reward-list').append(card);
      }
    }
    return { render };
  }
  return { create };
})();
