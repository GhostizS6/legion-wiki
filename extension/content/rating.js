(function(root) {
  'use strict';
  // An openly defined wiki index, not a combat simulation or a server rating.
  const WEIGHTS = Object.freeze({'Царапки':1.2,'Мяу-магия':1.2,'Мур-ХП':.8,'Пушистость':1,
    'Сопротивление':1,'Шанс крита':1.2,'Сила крита':.65,'Удача':1,'Уклонение':.8,
    'Сила лечения':1,'Пробивание':1.1});
  const rounded = value => Math.round(value * 1e9) / 1e9;
  // One scale per equipment type. Splitting by exact class lists gave a
  // universal helmet a private cohort and 100 despite stronger usable helmets.
  const groupOf = item => item.type || '';
  function breakdown(item) {
    const parts = Object.entries(item.stats || {}).map(([name, stat]) => {
      const value = Number(stat?.value ?? stat), weight = WEIGHTS[name] ?? 1;
      return {name, value:Number.isFinite(value) ? value : 0, weight,
        points:rounded((Number.isFinite(value) ? value : 0) * weight)};
    });
    return {parts, raw:Math.max(0, rounded(parts.reduce((sum, part) => sum + part.points, 0)))};
  }
  function rate(items) {
    const groups = new Map(), bases = new Map();
    for (const item of items) {
      const basis = breakdown(item), group = groupOf(item);
      bases.set(item, basis); groups.set(group, Math.max(groups.get(group) || 0, basis.raw));
    }
    for (const item of items) {
      const basis = bases.get(item), max = groups.get(groupOf(item));
      item.rating = basis.parts.length ? (max > 0 ? Math.round(100 * basis.raw / max) : 0) : null;
      item.ratingBasis = {...basis, max};
    }
    return items;
  }
  function compare(a, b) {
    const difference = (b.rating ?? -1) - (a.rating ?? -1);
    return difference || (groupOf(a) === groupOf(b)
      ? (b.ratingBasis?.raw || 0) - (a.ratingBasis?.raw || 0) : 0);
  }
  const api = {WEIGHTS, groupOf, breakdown, rate, compare};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.RatingModel = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
