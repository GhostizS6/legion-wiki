// Маппинг предметов игры в формат вики (подписи на русском, как в игре).
(function (root) {
  'use strict';
  const STAT_BY_KEY = {
    atk: 'Царапки', mag: 'Мяу-магия', hp: 'Мур-ХП', def: 'Пушистость',
    resist: 'Сопротивление', crit: 'Шанс крита', critDmg: 'Сила крита',
    luck: 'Удача', dodge: 'Уклонение', pierce: 'Пробивание', healPow: 'Сила лечения',
  };
  // Процентные характеристики в вики; остальные показываются числом.
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

  const PLACEHOLDER = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 192">' +
    '<rect x="16" y="16" width="160" height="160" rx="22" fill="#2b1d33" stroke="#6b4a66" stroke-width="4"/>' +
    '<text x="96" y="122" text-anchor="middle" font-family="Georgia,serif" font-size="82" fill="#8d6f8b">?</text></svg>');

  const ALL_CLASSES = ['Котоармеец', 'Рогаточник', 'Кот-колдун', 'Мурлыка-жрец', 'Кот-форточник', 'Некромурр', 'Котопаладин'];

  function normalizeSvg(svg) {
    if (!svg || svg.slice(0, 4) !== '<svg' || svg.includes('xmlns=')) return svg;
    return svg.replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  }

  function iconSrc(icon) {
    if (!icon) return PLACEHOLDER;
    if (icon.slice(0, 4) === '<svg') return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(normalizeSvg(icon));
    return icon;
  }

  function statsOf(stats) {
    const result = {};
    for (const [key, value] of Object.entries(stats || {})) {
      const name = STAT_BY_KEY[key];
      if (!name || typeof value !== 'number') continue;
      result[name] = { value, percent: PERCENT.has(name) };
    }
    return result;
  }

  function toEntry(item, svg) {
    if (!item || !item.id || !item.name) return null;
    const role = item.role && CLASS_BY_ROLE[item.role];
    return {
      gameId: item.id,
      name: item.name,
      type: TYPE_BY_SLOT[item.slot] || '',
      rarity: RARITY_BY_ID[item.rarity] || '',
      classes: role ? [role] : ALL_CLASSES,
      stats: statsOf(item.stats),
      look: item.look || null,
      enchant: Number(item.en) || 0,
      baseName: item.baseName || '',
      icon: normalizeSvg(svg) || '',
      seen: 1,
      updatedAt: Date.now(),
    };
  }

  root.LegionWikiModel = { STAT_BY_KEY, PERCENT, TYPE_BY_SLOT, RARITY_BY_ID, CLASS_BY_ROLE, ALL_CLASSES, PLACEHOLDER, normalizeSvg, iconSrc, statsOf, toEntry };
})(globalThis);
