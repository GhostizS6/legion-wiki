// Чиста логіка злиття каталогу з зібраними спостереженнями.
// Спільна для service worker (importScripts), content script і tools/merge.js.
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LegionWikiMerge = api;
})(typeof self !== 'undefined' ? self : globalThis, function () {
  'use strict';
  const keyOf = item => (item.gameId || '') + '|' + item.name;

  function clone(item) {
    return { ...item, stats: { ...(item.stats || {}) }, classes: [...(item.classes || [])], sources: [...(item.sources || [])] };
  }

  // Спільні для id+name поля: останнє спостереження перезаписує попереднє.
  const CAPTURE_FIELDS = ['type', 'rarity', 'classes', 'stats', 'look', 'enchant', 'baseName', 'approximate'];

  function mergeCatalog(base, captures) {
    const items = (base.items || []).map(clone);
    const index = new Map(items.map(item => [item.id, item]));
    const byGame = new Map();
    for (const item of items) if (item.gameId && !byGame.has(item.gameId)) byGame.set(item.gameId, item);

    for (const capture of captures || []) {
      const gameId = capture.gameId || capture.id;
      const name = capture.name || '';
      if (!gameId || !name) continue;
      const id = keyOf({ gameId, name });
      let item = index.get(id);
      if (!item) {
        const template = byGame.get(gameId) || {};
        item = {
          id, gameId, name,
          type: '', rarity: '', classes: [], stats: {}, description: template.description || '',
          lore: template.lore || '', icon: '', approximate: false, sources: [], seen: 0, updatedAt: null,
        };
        index.set(id, item);
        items.push(item);
      }
      for (const field of CAPTURE_FIELDS) {
        if (capture[field] !== undefined && capture[field] !== null) item[field] = capture[field];
      }
      // Загальна заглушка без look не має перетирати справжню іконку.
      if (capture.icon && (capture.look || !item.icon)) item.icon = capture.icon;
      item.seen = (item.seen || 0) + (capture.seen || 1);
      item.updatedAt = capture.updatedAt || Date.now();
      if (!item.sources.includes('capture')) item.sources.push('capture');
    }
    return { ...base, updatedAt: base.updatedAt || null, items };
  }

  return { keyOf, mergeCatalog };
});
