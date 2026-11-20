'use strict';
importScripts('shared/merge.js');

const REMOTE = 'https://raw.githubusercontent.com/GhostizS6/legion-wiki/main/data/items.json';
const CACHE_TTL = 6 * 60 * 60 * 1000;
const CAPTURES = 'captures';

const store = {
  get: keys => chrome.storage.local.get(keys),
  set: values => chrome.storage.local.set(values),
};

async function remote(force) {
  const { dataCache } = await store.get('dataCache');
  if (!force && dataCache && Date.now() - dataCache.at < CACHE_TTL) return dataCache;
  try {
    const response = await fetch(REMOTE + '?v=' + Math.floor(Date.now() / CACHE_TTL), { cache: 'no-store' });
    if (!response.ok) throw new Error('HTTP ' + response.status);
    const record = { at: Date.now(), data: await response.json() };
    await store.set({ dataCache: record });
    return record;
  } catch (error) {
    return dataCache || null;
  }
}

async function bundled() {
  const response = await fetch(chrome.runtime.getURL('data/items.json'));
  return response.json();
}

async function catalog(force) {
  const cached = await remote(force);
  const base = cached ? cached.data : await bundled();
  const { captures } = await store.get(CAPTURES);
  const data = LegionWikiMerge.mergeCatalog(base, Object.values(captures || {}));
  return { data, source: cached ? 'remote' : 'bundled', fetchedAt: cached ? cached.at : null, captured: Object.keys(captures || {}).length };
}

async function mergeCaptures(list) {
  const { captures } = await store.get(CAPTURES);
  const all = captures || {};
  const now = Date.now();
  for (const entry of list || []) {
    if (!entry || !entry.gameId || !entry.name) continue;
    const key = LegionWikiMerge.keyOf(entry);
    const previous = all[key];
    all[key] = { ...previous, ...entry, seen: (previous ? previous.seen || 0 : 0) + 1, updatedAt: now };
  }
  await store.set({ [CAPTURES]: all });
  return Object.keys(all).length;
}

async function exportCaptures() {
  const { captures } = await store.get(CAPTURES);
  const items = Object.values(captures || {});
  const payload = JSON.stringify({ exportedAt: new Date().toISOString(), items }, null, 1);
  await chrome.downloads.download({
    url: 'data:application/json;charset=utf-8,' + encodeURIComponent(payload),
    filename: 'legion-wiki-captures.json',
    saveAs: true,
  });
  return { ok: true, count: items.length };
}

chrome.runtime.onMessage.addListener((message, sender, respond) => {
  if (!message || !message.type) return false;
  if (message.type === 'catalog') {
    catalog(!!message.force).then(respond, error => respond({ error: String(error) }));
    return true;
  }
  if (message.type === 'capture') {
    mergeCaptures(message.items).then(count => respond({ ok: true, count }), error => respond({ error: String(error) }));
    return true;
  }
  if (message.type === 'export') {
    exportCaptures().then(respond, error => respond({ error: String(error) }));
    return true;
  }
  if (message.type === 'captureCount') {
    store.get(CAPTURES).then(({ captures }) => respond({ count: Object.keys(captures || {}).length }));
    return true;
  }
  return false;
});
