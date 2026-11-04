'use strict';
(() => {
  const rules = window.DanMachi;
  const items = window.DanMachiItems;
  const storage = window.DanMachiStorage;
  const $ = id => document.getElementById(id);
  const routes = ['menu', 'princesses', 'combat', 'ranking', 'help'];
  const catalog = [
    { id: 'lumpy', title: 'Lumpy Space Princess', name: 'Princesa Caroço', summary: 'Independente e dramática, vem da Dimensão Caroço.' },
    { id: 'flame', title: 'Flame Princess', name: 'Princesa de Fogo', summary: 'Corajosa e intensa, carrega o poder do Reino de Fogo.' },
    { id: 'bubblegum', title: 'Princess Bubblegum', name: 'Princesa Jujuba', summary: 'Cientista e governante, protege o Reino Doce com suas invenções.' },
    { id: 'slime', title: 'Slime Princess', name: 'Princesa Gosma', summary: 'Uma princesa de corpo gelatinoso ligada ao Reino Gosma.' },
    { id: 'hotdog', title: 'Hot Dog Princess', name: 'Princesa Cachorro-Quente', summary: 'Uma pequena governante acompanhada por seus leais cavaleiros.' },
    { id: 'breakfast', title: 'Breakfast Princess', name: 'Princesa Café da Manhã', summary: 'Uma princesa de aparência inspirada em alimentos do café da manhã.' }
  ];
  const selected = new Set(catalog.slice(0, 3).map(p => p.id));
  const metadata = new Map();
  let state = null;
  let apiLoading = false;
  let apiAttempted = false;
  function updateSelection() {
    $('selection-count').textContent = `${selected.size} / 3 princesas selecionadas`;
    $('start-adventure').disabled = selected.size !== 3;
    for (const input of $('princess-list').querySelectorAll('input')) input.disabled = selected.size === 3 && !input.checked;
  }
  function renderCatalog() {
    $('princess-list').replaceChildren();
    for (const princess of catalog) {
      const card = document.createElement('article');
      card.className = 'panel princess-card';
      const label = document.createElement('label');
      const input = document.createElement('input');
      input.type = 'checkbox';
      input.value = princess.id;
      input.checked = selected.has(princess.id);
      input.addEventListener('change', () => {
        if (input.checked && selected.size < 3) selected.add(princess.id);
        else { selected.delete(princess.id); input.checked = false; }
        updateSelection();
      });
      const name = document.createElement('strong');
      name.textContent = princess.name;
      label.append(input, name);
      const placeholder = document.createElement('div');
      placeholder.className = 'princess-placeholder';
      placeholder.setAttribute('aria-hidden', 'true');
      placeholder.textContent = '♛';
      const summary = document.createElement('p');
      summary.textContent = princess.summary;
      const source = document.createElement('p');
      source.className = 'muted';
      const info = metadata.get(princess.id);
      if (info) {
        source.textContent = `API Fandom · ${info.title} · ID ${info.pageid} · `;
        const link = document.createElement('a');
        link.href = info.url;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        link.textContent = 'Ver fonte';
        source.append(link);
      } else source.textContent = 'Catálogo local · resumo em português de autoria do projeto';
      card.append(label, placeholder, summary, source);
      $('princess-list').append(card);
    }
    updateSelection();
  }
  async function loadPrincesses() {
    if (apiLoading) return;
    apiLoading = true;
    apiAttempted = true;
    $('retry-api').disabled = true;
    $('api-status').textContent = 'Consultando a API da Adventure Time Wiki… Você já pode escolher pelo catálogo local.';
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const params = new URLSearchParams({ action: 'query', prop: 'info', inprop: 'url', redirects: '1',
        titles: catalog.map(p => p.title).join('|'), format: 'json', origin: '*' });
      const response = await fetch(`https://adventuretime.fandom.com/api.php?${params}`, { signal: controller.signal, credentials: 'omit' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const data = await response.json();
      if (data.error || !data.query || !data.query.pages) throw new Error('Resposta da API inválida');
      const pages = Object.values(data.query.pages);
      const aliases = [...(data.query.normalized || []), ...(data.query.redirects || [])];
      metadata.clear();
      for (const princess of catalog) {
        let title = princess.title;
        for (let i = 0; i < aliases.length; i++) {
          const alias = aliases.find(a => a.from === title);
          if (!alias) break;
          title = alias.to;
        }
        const page = pages.find(p => p.title === title && !Object.hasOwn(p, 'missing') && Number.isInteger(p.pageid) && p.pageid > 0);
        if (!page || typeof page.fullurl !== 'string') continue;
        const url = new URL(page.fullurl);
        if (url.protocol !== 'https:' || url.hostname !== 'adventuretime.fandom.com') continue;
        metadata.set(princess.id, { title: page.title, pageid: page.pageid, url: url.href });
      }
      if (!metadata.size) throw new Error('Nenhuma princesa reconhecida na resposta');
      $('api-status').textContent = `API Fandom consultada: ${metadata.size} de ${catalog.length} cartões com título, ID e fonte reais. Resumos em português são locais; os demais cartões usam o catálogo offline.`;
    } catch (error) {
      metadata.clear();
      const reason = error.name === 'AbortError' ? 'tempo de consulta excedido' : error.message;
      $('api-status').textContent = `Catálogo offline: não foi possível consultar a Fandom (${reason}). Você pode escolher e jogar normalmente ou tentar novamente.`;
    } finally {
      clearTimeout(timeout);
      apiLoading = false;
      $('retry-api').disabled = false;
      renderCatalog();
    }
  }
  function navigate() {
    const requested = window.location.hash.slice(1) || 'menu';
    let route = routes.includes(requested) ? requested : 'menu';
    if (route === 'combat' && !state) route = 'princesses';
    if (window.location.hash !== `#${route}`) { window.location.replace(`#${route}`); return; }
    for (const id of routes) $(id).hidden = id !== route;
    const title = document.querySelector(`#${route} h1`);
    title.focus();
    document.title = `DanMachi — ${title.textContent}`;
    if (route === 'princesses' && !apiAttempted) void loadPrincesses();
  }
  function render() {
    if (!state) return;
    const stats = items.effective(state);
    for (const [id, hp, max] of [['finn-hp', state.hp, stats.maxHp], ['enemy-hp', state.enemy.hp, state.enemy.maxHp]]) {
      $(id).max = max;
      $(id).value = hp;
      $(id).textContent = `${hp} de ${max}`;
      document.querySelector(`label[for="${id}"]`).textContent = `Vida · ${hp} / ${max}`;
    }
    $('combat-progress').textContent = `Andar ${state.floor} / 10 · ${state.enemy.boss ? 'Chefe final' : `Combate ${state.battle} / 3`}`;
    $('combat-title').textContent = state.enemy.boss ? 'O confronto com o Rei Gelado' : `Masmorra · andar ${state.floor}`;
    $('finn-level').textContent = `Nível ${state.level}`;
    $('enemy-name').textContent = state.enemy.name;
    $('enemy-level').textContent = `Nível ${state.enemy.level}`;
    $('stat-damage').textContent = state.damage;
    $('stat-luck').textContent = state.luck;
    $('stat-armor').textContent = state.armor;
    $('stat-stars').textContent = `${state.rescued.length} / 3`;
    const number = value => Number(value.toFixed(2)).toLocaleString('pt-BR');
    $('effective-stats').textContent = `Com equipamentos e efeitos: ${number(stats.damage)} dano ofensivo · ${number(stats.armor)} defesa · ${number(stats.luck)} sorte.`;
    $('xp').max = rules.xpNeeded(state.level);
    $('xp').value = state.xp;
    $('xp').textContent = `${state.xp} de ${rules.xpNeeded(state.level)}`;
    document.querySelector('label[for="xp"]').textContent = state.level === 10 ? 'Experiência · nível máximo' : `Experiência · ${state.xp} / ${rules.xpNeeded(state.level)}`;
    $('attack').disabled = $('defend').disabled = state.phase !== 'combat';
    $('next-battle').hidden = state.phase !== 'intermission';
    $('next-battle').disabled = state.upgrades.length > 0 || state.rewards.pending.length > 0;
    $('next-battle').textContent = state.battle < 3 ? 'Próxima batalha' : state.floor < 10 ? 'Avançar de andar' : 'Enfrentar o Rei Gelado';
    $('restart').hidden = !['gameover', 'victory'].includes(state.phase);
    $('continue-adventure').disabled = false;
    $('level-up').hidden = !state.upgrades.length;
    $('upgrade-count').textContent = `${state.upgrades.length} escolhas restantes. Você pode repetir o atributo.`;
    const multiplier = state.upgrades[0] || 1;
    for (const button of $('level-up').querySelectorAll('button')) {
      const [label, base] = { maxHp: ['Vida', 5], damage: ['Dano', 5], luck: ['Sorte', 2], armor: ['Armadura', 3] }[button.dataset.attribute];
      button.textContent = `${label} +${base * multiplier}`;
    }
    $('rescue-status').textContent = state.rescued.length ? `Resgatadas: ${state.rescued.map(p => p.name).join(', ')}.` : 'Nenhuma princesa resgatada ainda.';
    itemUI.render();
    persist();
  }
  function persist() {
    if (state) {
      state.story = $('story').textContent;
      state.feedback = $('feedback').textContent;
    }
    $('save-status').textContent = storage.save(state).message;
  }
  function startAdventure(event) {
    event.preventDefault();
    if (selected.size !== 3) return;
    state = rules.createCampaign(catalog.filter(p => selected.has(p.id)));
    $('item-status').textContent = '';
    $('story').textContent = `O Rei Gelado aprisionou ${state.princesses.map(p => p.name).join(', ')}. Finn entra na masmorra para resgatá-las. ${state.princesses.map(p => `${p.name}: ${p.summary}`).join(' ')}`;
    $('feedback').textContent = 'A aventura começou. Turno 1: escolha Atacar ou Defender.';
    render();
    window.location.hash = 'combat';
  }
  function playTurn(action) {
    if (!state || $('combat').hidden) return;
    const messages = rules.playTurn(state, action);
    if (!messages.length) return;
    $('feedback').textContent = messages.join(' ');
    render();
    if (state.phase === 'intermission') (state.rewards.pending.length ? $('rewards') : state.upgrades.length ? $('level-up').querySelector('button') : $('next-battle')).focus();
    else if (['gameover', 'victory'].includes(state.phase)) $('restart').focus();
  }
  $('princess-form').addEventListener('submit', startAdventure);
  $('retry-api').addEventListener('click', () => void loadPrincesses());
  $('continue-adventure').addEventListener('click', () => { if (state) window.location.hash = 'combat'; });
  $('attack').addEventListener('click', () => playTurn('attack'));
  $('defend').addEventListener('click', () => playTurn('defend'));
  $('next-battle').addEventListener('click', () => {
    if (!state || !rules.nextBattle(state)) return;
    $('feedback').textContent = `${state.enemy.name} de nível ${state.enemy.level} à frente. Turno 1: sua vez. A vida de Finn foi mantida.`;
    render();
    $('attack').focus();
  });
  for (const button of $('level-up').querySelectorAll('button')) button.addEventListener('click', () => {
    if (!state || !rules.chooseUpgrade(state, button.dataset.attribute)) return;
    render();
    if (!state.upgrades.length) (state.rewards.pending.length ? $('rewards') : $('next-battle')).focus();
  });
  $('restart').addEventListener('click', () => {
    state = null;
    persist();
    $('continue-adventure').disabled = true;
    window.location.hash = 'princesses';
  });
  window.addEventListener('hashchange', navigate);
  document.addEventListener('keydown', event => {
    if (document.querySelector('dialog[open]')) return;
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (/^(INPUT|TEXTAREA|SELECT)$/.test(event.target.tagName) || event.target.isContentEditable) return;
    if (event.key === 'Escape') window.location.hash = 'menu';
    if (!$('combat').hidden && ['a', 'd'].includes(event.key.toLowerCase())) {
      event.preventDefault();
      playTurn(event.key.toLowerCase() === 'a' ? 'attack' : 'defend');
    }
  });
  window.addEventListener('pagehide', () => { if (state) persist(); });
  const itemUI = window.DanMachiItemUI.create(() => state, render);
  renderCatalog();
  const restored = storage.load();
  state = restored.state;
  $('save-status').textContent = restored.message;
  if (state) {
    $('story').textContent = state.story;
    $('feedback').textContent = state.feedback;
    render();
  }
  navigate();
})();
