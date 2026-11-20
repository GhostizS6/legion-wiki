#!/usr/bin/env node
'use strict';
// Перевіряє data/items.json і синхронність вбудованого снепшоту.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'data', 'items.json');
const bundlePath = path.join(root, 'extension', 'data', 'items.json');
const errors = [];
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

if (data.schemaVersion !== 2) errors.push('schemaVersion має бути 2');
if (!Array.isArray(data.items) || !data.items.length) errors.push('items порожній');
if (!Array.isArray(data.classes) || !data.classes.length) errors.push('classes порожній');
if (!Array.isArray(data.rarities) || !data.rarities.length) errors.push('rarities порожній');

const ids = new Set();
for (const item of data.items) {
  if (!item.id || !item.name) errors.push('предмет без id/name: ' + JSON.stringify(item).slice(0, 80));
  if (ids.has(item.id)) errors.push('дублікат id: ' + item.id);
  ids.add(item.id);
  if (item.rarity && !data.rarities.includes(item.rarity)) errors.push(`невідоме качество «${item.rarity}» у ${item.name}`);
  for (const name of item.classes || []) if (!data.classes.includes(name)) errors.push(`невідомий клас «${name}» у ${item.name}`);
  if (item.icon && !item.icon.startsWith('<svg') && !item.icon.startsWith('data:')) errors.push('іконка не SVG у ' + item.name);
  for (const [stat, value] of Object.entries(item.stats || {})) {
    if (typeof value.value !== 'number' || typeof value.percent !== 'boolean') errors.push(`характеристика «${stat}» у ${item.name} має формат {value, percent}`);
  }
}

const bundleFile = bundlePath;
if (fs.existsSync(bundleFile) && fs.readFileSync(bundleFile, 'utf8') !== fs.readFileSync(dataPath, 'utf8')) {
  errors.push('extension/data/items.json відрізняється від data/items.json — запусти tools/merge.js або скопіюй файл');
}

if (errors.length) {
  console.error('Помилки (' + errors.length + '):');
  for (const error of errors.slice(0, 40)) console.error(' - ' + error);
  process.exit(1);
}
console.log(`OK: ${data.items.length} предметів, ${data.items.filter(item => item.gameId).length} з прив'язкою до гри`);
