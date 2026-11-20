#!/usr/bin/env node
'use strict';
// Сливает экспорт из игры в data/items.json и обновляет встроенный снепшот.
// Использование: node tools/merge.js captures.json [ещё-файл.json]
const fs = require('fs');
const path = require('path');
const merge = require('../extension/shared/merge.js');

const root = path.resolve(__dirname, '..');
const dataPath = path.join(root, 'data', 'items.json');
const bundlePath = path.join(root, 'extension', 'data', 'items.json');
const files = process.argv.slice(2).filter(file => !file.startsWith('--'));

if (!files.length) {
  console.error('Укажи файл экспорта: node tools/merge.js legion-wiki-captures.json');
  process.exit(1);
}

const base = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
const observations = [];
for (const file of files) {
  const payload = JSON.parse(fs.readFileSync(file, 'utf8'));
  observations.push(...(Array.isArray(payload) ? payload : payload.items || []));
}

const merged = merge.mergeCatalog(base, observations);
merged.updatedAt = new Date().toISOString();
fs.mkdirSync(path.dirname(bundlePath), { recursive: true });
fs.writeFileSync(dataPath, JSON.stringify(merged), 'utf8');
fs.copyFileSync(dataPath, bundlePath);

const fresh = merged.items.filter(item => item.sources.includes('capture')).length;
console.log(`наблюдений: ${observations.length} · предметов в каталоге: ${merged.items.length} · из игры: ${fresh}`);
