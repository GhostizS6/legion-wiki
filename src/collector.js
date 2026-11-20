// Страница игры: тихо собирает увиденные предметы и их SVG-иконки.
// Работает в MAIN world, потому что нужен window.LGInventory. Связь — window.postMessage.
(function () {
  'use strict';
  if (window.__legionWikiCollector) return;
  window.__legionWikiCollector = true;

  const SEND_GAP = 1200, POLL_GAP = 120000;
  let queue = new Map(), timer = 0;

  const slim = item => ({
    id: item.id, name: item.name, slot: item.slot, rarity: item.rarity, role: item.role,
    gear: item.gear, stats: item.stats || {}, look: item.look || null,
    en: item.en || 0, baseName: item.baseName || '',
  });

  function flush() {
    timer = 0;
    if (!queue.size) return;
    const items = [...queue.values()];
    queue = new Map();
    // В юзерскрипте emit задан напрямую, в расширении — через postMessage.
    if (typeof globalThis.LegionWikiEmit === 'function') { globalThis.LegionWikiEmit(items); return; }
    window.postMessage({ source: 'legion-wiki', type: 'capture', items }, '*');
  }

  function push(item, svg) {
    const clean = slim(item);
    if (!clean.id || !clean.name) return;
    queue.set(clean.id + '|' + clean.name, { item: clean, svg: String(svg || '') });
    if (!timer) timer = setTimeout(flush, SEND_GAP);
  }

  function hookArt() {
    const api = window.LGInventory;
    if (!api || typeof api.art !== 'function') return false;
    if (api.art.__legionWiki) return true;
    const original = api.art;
    const wrapped = function (item) {
      const svg = original.apply(this, arguments);
      try { push(item, svg); } catch (error) { /* чужой предмет без полей — пропускаем */ }
      return svg;
    };
    wrapped.__legionWiki = true;
    api.art = wrapped;
    return true;
  }

  async function poll() {
    if (document.hidden) return;
    try {
      const request = window.LG_FETCH && window.LG_FETCH.w ? window.LG_FETCH.w : window.fetch;
      const response = await request('/api/me');
      const json = await response.json();
      const items = json && json.hero && json.hero.items;
      if (!Array.isArray(items)) return;
      for (const item of items) {
        if (!item || !item.id || !item.name || item.slot === 'material') continue;
        let svg = '';
        try { svg = window.LGInventory && window.LGInventory.art ? window.LGInventory.art(item) : ''; } catch (error) { svg = ''; }
        push(item, svg);
      }
    } catch (error) { /* сеть/сессия — следующий цикл */ }
  }

  hookArt();
  setInterval(hookArt, 3000);
  setTimeout(poll, 4000);
  setInterval(poll, POLL_GAP);
})();
