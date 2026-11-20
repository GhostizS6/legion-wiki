#!/usr/bin/env node
'use strict';
// Минимальный тест слияния каталога с наблюдениями.
const assert = require('assert');
const { keyOf, mergeCatalog } = require('../extension/shared/merge.js');

const base = {
  schemaVersion: 2,
  classes: ['Котоармеец'],
  rarities: ['Обычное', 'Редкое'],
  items: [{
    id: 'dagger|Накладной коготок', gameId: 'dagger', name: 'Накладной коготок',
    type: 'Оружие', rarity: 'Обычное', classes: [], stats: { Царапки: { value: 8, percent: false } },
    description: 'Описание из лора', lore: 'История', icon: '', sources: ['lore'], seen: 0, updatedAt: null,
  }],
};

const stats = { Царапки: { value: 12, percent: false } };
const merged = mergeCatalog(base, [
  { gameId: 'dagger', name: 'Накладной коготок', type: 'Оружие', rarity: 'Обычное', classes: ['Котоармеец'], stats, icon: '<svg></svg>' },
  { gameId: 'dagger', name: 'Коготок героя', type: 'Оружие', rarity: 'Редкое', classes: [], stats, icon: '<svg></svg>' },
]);

assert.strictEqual(keyOf({ gameId: 'dagger', name: 'Коготок героя' }), 'dagger|Коготок героя');
assert.strictEqual(merged.items.length, 2, 'разные названия одного gameId — отдельные записи');
const updated = merged.items.find(item => item.id === 'dagger|Накладной коготок');
assert.deepStrictEqual(updated.stats, stats, 'статы перезаписываются последним наблюдением');
assert.ok(updated.sources.includes('capture'));
assert.strictEqual(updated.seen, 1);
const created = merged.items.find(item => item.name === 'Коготок героя');
assert.strictEqual(created.description, 'Описание из лора', 'новый вариант наследует описание базового предмета');
assert.deepStrictEqual(base.items[0].stats, { Царапки: { value: 8, percent: false } }, 'входные данные не мутируются');
assert.strictEqual(mergeCatalog(base, []).items.length, 1);
console.log('merge: OK');
