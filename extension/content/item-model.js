(function (root) {
  'use strict';
  const ENCHANT_BONUS = [0, 4, 9, 15, 22, 31, 42, 56, 74, 97, 125, 160, 200, 250, 310, 400];
  const SECONDARY = new Set(['Сопротивление', 'Шанс крита', 'Сила крита', 'Удача', 'Уклонение', 'Пробивание', 'Сила лечения']);
  const num = value => Number(value?.value ?? value ?? 0);
  function enchantStats(stats, level) {
    const bonus = ENCHANT_BONUS[Math.max(0, Math.min(15, Math.trunc(Number(level) || 0)))];
    return Object.fromEntries(Object.entries(stats || {}).map(([name, stat]) => {
      const value = num(stat);
      // Match the archived game's enchStatsN: round positive enhanced stats
      // only. At +0, decimals and negative penalties must stay unchanged.
      return [name, {...stat, value: bonus && value > 0
        ? Math.round(value * (1 + bonus / (SECONDARY.has(name) ? 400 : 100)))
        : value}];
    }));
  }
  const formatStat = stat => (num(stat) > 0 ? '+' : '') + num(stat).toLocaleString('ru-RU') + (stat.percent ? '%' : '');
  const fitsClass = (item, name) => (item.classes || (item.cls ? [item.cls] : [])).includes(name);
  const classLabel = (item, classes) => item.classes?.length === classes.length ? 'Все классы' : (item.classes || (item.cls ? [item.cls] : [])).join(', ') || 'Класс уточняется';
  function missing(item) {
    const result = [];
    if (!item.rarity) result.push('качество');
    if (!item.type || item.type === 'Не определён') result.push('тип');
    if (!item.description) result.push('описание');
    if (!Object.keys(item.stats || {}).length && item.type !== 'Особая вещь') result.push('характеристики');
    if (Array.isArray(item.classes) ? !item.classes.length : !item.cls) result.push('класс');
    if (item.iconMissing) result.push('иконка');
    return result;
  }
  const api = { ENCHANT_BONUS, SECONDARY, num, enchantStats, formatStat, fitsClass, classLabel, missing };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.ItemModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
