#!/usr/bin/env node
'use strict';
// Одноразовый импорт старого снепшота вики 3.13.0 в формат data/items.json.
// Использование: node tools/seed.js --wiki "C:\...\legion-wiki-edge-3.13.0\wiki-data.json"
const fs = require('fs');
const path = require('path');

const CHANNEL = 'zakvielchannel';
const ORIGIN = 'https://legiongame.gg';

const STAT_BY_KEY = {
  atk: 'Царапки', mag: 'Мяу-магия', hp: 'Мур-ХП', def: 'Пушистость',
  resist: 'Сопротивление', crit: 'Шанс крита', critDmg: 'Сила крита',
  luck: 'Удача', dodge: 'Уклонение', pierce: 'Пробивание', healPow: 'Сила лечения',
};
const PERCENT = new Set(['Уклонение', 'Шанс крита', 'Сила крита', 'Сила лечения', 'Пробивание']);
const TYPE_BY_SLOT = {
  weapon: 'Оружие', helmet: 'Шлем', armor: 'Доспех', shield: 'Щит',
  trinket: 'Амулет', food: 'Еда', material: 'Материал', special: 'Особая вещь',
};
const RARITY_BY_ID = {
  common: 'Обычное', uncommon: 'Необычное', rare: 'Редкое',
  epic: 'Эпическое', legendary: 'Легендарное', mythic: 'Мифическое',
};
const CLASS_BY_ROLE = {
  legionary: 'Котоармеец', archer: 'Рогаточник', mage: 'Кот-колдун',
  priest: 'Мурлыка-жрец', rogue: 'Кот-форточник', necromancer: 'Некромурр',
  paladin: 'Котопаладин',
};

const norm = value => String(value || '').toLowerCase().replace(/ё/g, 'е').replace(/[^а-яa-z0-9+]+/gi, ' ').trim();
const humanize = id => {
  const text = id.replace(/^(ore|hw|q)_/, '').replace(/_/g, ' ').trim();
  return text ? text[0].toUpperCase() + text.slice(1) : id;
};

function loreName(id, desc, ores) {
  if (id.startsWith('ore_') && ores[id.slice(4)]) return ores[id.slice(4)];
  const dash = desc.split(' — ');
  if (dash.length > 1 && dash[0].length <= 60) return dash[0].trim();
  const colon = desc.split(': ');
  if (colon.length > 1 && colon[0].length <= 60) return colon[0].trim();
  return humanize(id);
}

function typeOf(desc, name = '') {
  const text = (desc + ' ' + name).toLowerCase();
  if (/материал для заточки|добыто в шахте|самоцвет/.test(text)) return 'Материал';
  if (/оружие|вторая рука/.test(text)) return 'Оружие';
  if (/шлем|капюшон|маска|корона|венец/.test(text)) return 'Шлем';
  if (/щит/.test(text)) return 'Щит';
  if (/амулет|нимб|медалька|ладонка|бубенчик/.test(text)) return 'Амулет';
  if (/броня|доспех|латы|кираса|мантия|плащ|куртка|жилет|саван|лорика|ряса|плед|свитер|одежда/.test(text)) return 'Доспех';
  if (/съешь|выпей|еда/.test(text)) return 'Еда';
  return '';
}

function rarityOf(desc) {
  if (/легендарн/i.test(desc)) return 'Легендарное';
  return '';
}

async function main() {
  const args = process.argv.slice(2);
  const arg = name => {
    const index = args.indexOf(name);
    return index >= 0 ? args[index + 1] : '';
  };
  const wikiPath = arg('--wiki');
  const outPath = path.resolve(arg('--out') || 'data/items.json');
  if (!wikiPath) throw new Error('Укажи --wiki <путь к wiki-data.json>');

  const wiki = JSON.parse(fs.readFileSync(wikiPath, 'utf8'));
  const wikiDir = path.dirname(wikiPath);
  const lore = (await (await fetch(`${ORIGIN}/c/${CHANNEL}/api/lore`)).json()).items;
  const game = await (await fetch(`${ORIGIN}/lib/game-data.js`)).text();
  const rawRes = game.slice(game.indexOf('"res":{'), game.indexOf('}', game.indexOf('"res":{')) + 1);
  const ores = JSON.parse(rawRes.slice(6));

  const loreEntries = Object.entries(lore).map(([id, value]) => ({
    id, desc: String(value[0] || ''), lore: String(value[1] || ''), n: norm(value[0]),
  }));

  const items = [];
  const usedLore = new Set();
  for (const item of wiki.items) {
    const nd = norm(item.description);
    let match = nd ? loreEntries.find(entry => entry.n === nd) : null;
    if (!match) {
      const nn = norm(item.name);
      match = loreEntries.find(entry => entry.id !== '' && (entry.n.startsWith(nn) || nn.startsWith(norm(entry.desc.split(' ').slice(0, 2).join(' ')))));
    }
    if (match) usedLore.add(match.id);
    const iconPath = path.join(wikiDir, item.icon || '');
    const icon = item.icon && fs.existsSync(iconPath) ? fs.readFileSync(iconPath, 'utf8') : '';
    items.push({
      id: (match ? match.id + '|' : 'legacy|') + item.name,
      gameId: match ? match.id : null,
      name: item.name,
      type: item.type || '',
      rarity: item.rarity || '',
      classes: item.classes || [],
      stats: item.stats || {},
      description: item.description || '',
      lore: item.lore || '',
      icon,
      approximate: !!item.approximate,
      sources: ['seed'],
      updatedAt: null,
      seen: 0,
    });
  }

  for (const entry of loreEntries) {
    if (usedLore.has(entry.id)) continue;
    const name = loreName(entry.id, entry.desc, ores);
    items.push({
      id: entry.id + '|' + name,
      gameId: entry.id,
      name,
      type: typeOf(entry.desc, name),
      rarity: rarityOf(entry.desc),
      classes: [],
      stats: {},
      description: entry.desc,
      lore: entry.lore,
      icon: '',
      approximate: false,
      sources: ['lore'],
      updatedAt: null,
      seen: 0,
    });
  }

  const seen = new Set();
  const unique = items.filter(item => (seen.has(item.id) ? false : (seen.add(item.id), true)));
  const data = {
    schemaVersion: 2,
    updatedAt: new Date().toISOString(),
    source: `${ORIGIN}/c/${CHANNEL}/api/lore`,
    classes: wiki.classes,
    rarities: wiki.rarities,
    items: unique,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(data), 'utf8');
  const counts = unique.reduce((acc, item) => (acc[item.sources.join('+')] = (acc[item.sources.join('+')] || 0) + 1, acc), {});
  console.log('items', unique.length, JSON.stringify(counts));
}

main().catch(error => { console.error(error); process.exit(1); });
