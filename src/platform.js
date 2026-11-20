'use strict';
// Платформа юзерскрипта: хранилище Tampermonkey, сеть и экспорт наблюдений.
(function (root) {
  const REMOTE = [
    'https://cdn.jsdelivr.net/gh/GhostizS6/legion-wiki@main/data/items.json',
    'https://raw.githubusercontent.com/GhostizS6/legion-wiki/main/data/items.json',
  ];
  const CACHE_TTL = 6 * 60 * 60 * 1000;
  const CACHE = 'dataCache';
  const CAPTURES = 'captures';
  const hasGM = typeof GM !== 'undefined' && GM && typeof GM.getValue === 'function';

  async function get(key, fallback) {
    try {
      if (hasGM) {
        const value = await GM.getValue(key, null);
        return value == null ? fallback : (typeof value === 'string' ? JSON.parse(value) : value);
      }
      const raw = localStorage.getItem('legionWiki.' + key);
      return raw ? JSON.parse(raw) : fallback;
    } catch (error) { return fallback; }
  }

  async function set(key, value) {
    try {
      const text = JSON.stringify(value);
      if (hasGM) await GM.setValue(key, text);
      else localStorage.setItem('legionWiki.' + key, text);
    } catch (error) { /* квота или запрет записи */ }
  }

  function request(url) {
    return new Promise((resolve, reject) => {
      if (hasGM && GM.xmlHttpRequest) {
        GM.xmlHttpRequest({
          method: 'GET', url, timeout: 20000,
          headers: { 'Cache-Control': 'no-cache' },
          onload: response => (response.status >= 200 && response.status < 300
            ? resolve(response.responseText)
            : reject(new Error('HTTP ' + response.status))),
          onerror: () => reject(new Error('network')),
          ontimeout: () => reject(new Error('timeout')),
        });
        return;
      }
      fetch(url, { cache: 'no-store' })
        .then(response => (response.ok ? response.text() : Promise.reject(new Error('HTTP ' + response.status))))
        .then(resolve, reject);
    });
  }

  async function catalog(force) {
    let record = await get(CACHE, null);
    if (force || !record || Date.now() - record.at > CACHE_TTL) {
      for (const url of REMOTE) {
        try {
          const data = JSON.parse(await request(url));
          record = { at: Date.now(), data };
          await set(CACHE, record);
          break;
        } catch (error) { /* пробуем следующий источник */ }
      }
    }
    const base = (record && record.data) || BASE_DATA;
    const captures = await get(CAPTURES, {});
    const data = LegionWikiMerge.mergeCatalog(base, Object.values(captures));
    return {
      data,
      source: record ? 'remote' : 'bundled',
      fetchedAt: record ? record.at : null,
      captured: Object.keys(captures).length,
    };
  }

  async function capture(items) {
    const all = await get(CAPTURES, {});
    for (const entry of items || []) {
      if (!entry || !entry.gameId || !entry.name) continue;
      const key = LegionWikiMerge.keyOf(entry);
      const previous = all[key];
      all[key] = { ...previous, ...entry, seen: (previous ? previous.seen || 0 : 0) + 1, updatedAt: Date.now() };
    }
    await set(CAPTURES, all);
    return { ok: true, count: Object.keys(all).length };
  }

  async function captureCount() {
    return { count: Object.keys(await get(CAPTURES, {})).length };
  }

  async function download(text, name) {
    if (hasGM && GM.download) {
      const url = 'data:application/json;charset=utf-8,' + encodeURIComponent(text);
      await new Promise((resolve, reject) => GM.download({
        url, name, saveAs: true,
        onload: resolve, onerror: reject, ontimeout: reject,
      }));
      return;
    }
    const url = URL.createObjectURL(new Blob([text], { type: 'application/json' }));
    const link = document.createElement('a');
    link.href = url; link.download = name; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function exportCaptures() {
    const all = await get(CAPTURES, {});
    const items = Object.values(all);
    if (!items.length) return { ok: false, count: 0 };
    await download(JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 1), 'legion-wiki-captures.json');
    return { ok: true, count: items.length };
  }

  root.LegionWikiPlatform = {
    styles: () => WIKI_CSS,
    catalog,
    capture,
    captureCount,
    export: exportCaptures,
  };
})(globalThis);
