#!/usr/bin/env node
'use strict';
// Проверяет data/items.json и синхронность встроенного снепшота.
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'data', 'items.json');
const bundlePath = path.join(root, 'extension', 'data', 'items.json');
const errors = [];
const data = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

if (data.schemaVersion !== 2) errors.push('schemaVersion должен быть 2');
if (!Array.isArray(data.items) || !data.items.length) errors.push('items пустой');
if (!Array.isArray(data.classes) || !data.classes.length) errors.push('classes пустой');
if (!Array.isArray(data.rarities) || !data.rarities.length) errors.push('rarities пустой');

const ids = new Set();
for (const item of data.items) {
  if (!item.id || !item.name) errors.push('предмет без id/name: ' + JSON.stringify(item).slice(0, 80));
  if (ids.has(item.id)) errors.push('дубликат id: ' + item.id);
  ids.add(item.id);
  if (item.rarity && !data.rarities.includes(item.rarity)) errors.push(`неизвестное качество «${item.rarity}» у ${item.name}`);
  for (const name of item.classes || []) if (!data.classes.includes(name)) errors.push(`неизвестный класс «${name}» у ${item.name}`);
  if (item.icon && !item.icon.startsWith('<svg') && !item.icon.startsWith('data:')) errors.push('иконка не SVG у ' + item.name);
  for (const [stat, value] of Object.entries(item.stats || {})) {
    if (typeof value.value !== 'number' || typeof value.percent !== 'boolean') errors.push(`характеристика «${stat}» у ${item.name} должна быть {value, percent}`);
  }
}

if (fs.existsSync(bundlePath) && fs.readFileSync(bundlePath, 'utf8') !== fs.readFileSync(dataPath, 'utf8')) {
  errors.push('extension/data/items.json отличается от data/items.json — запусти tools/merge.js или скопируй файл');
}

if (errors.length) {
  console.error('Ошибки (' + errors.length + '):');
  for (const error of errors.slice(0, 40)) console.error(' - ' + error);
  process.exit(1);
}
console.log(`OK: ${data.items.length} предметов, ${data.items.filter(item => item.gameId).length} с привязкой к игре`);
