'use strict';
// UI вики: та же логика, что в 3.13.0, но смонтирована в произвольный root (shadow DOM в игре).
window.LegionWikiUI = (function () {
  const { ENCHANT_BONUS, num, enchantStats, formatStat, fitsClass, classLabel, missing } = ItemModel;

  function mount(root, options) {
    const doc = root.ownerDocument || document;
    const mk = (tag, className, text) => {
      const node = doc.createElement(tag);
      if (className) node.className = className;
      if (text !== undefined) node.textContent = text;
      return node;
    };
    const $ = selector => root.querySelector(selector);
    const $details = $('#details');
    let catalog = [], classes = [], rarities = [], current = 'all', selected = '', compare = [];
    const levels = new Map();

    const getData = () => catalog.map(item => ({ ...item }));
    const levelOf = item => levels.get(item.id) || 0;
    const statsOf = item => enchantStats(item.stats || {}, levelOf(item));
    const rankR = rarity => rarities.indexOf(rarity);
    const scores = items => {
      RatingModel.rate(items);
      for (const item of items) item.ratingBasis.level = 0;
      return items;
    };

    function currentList(items) {
      const query = $('#query').value.trim().toLowerCase().replace(/ё/g, 'е');
      const quality = $('#quality').value, type = $('#category').value, order = $('#order').value;
      const result = items.filter(item =>
        (current === 'all' || current === 'missing' || fitsClass(item, current)) &&
        (current !== 'missing' || missing(item).length) &&
        (!quality || item.rarity === quality) && (!type || item.type === type) &&
        (!query || [item.name, ...(item.aliases || []), item.description, item.lore,
          ...(item.classes || []), ...Object.keys(item.stats || {})].join(' ').toLowerCase().replace(/ё/g, 'е').includes(query)));
      result.sort((a, b) => (
        order === 'rating' ? RatingModel.compare(a, b) :
        order === 'quality' ? rankR(b.rarity) - rankR(a.rarity) :
        order === 'type' ? a.type.localeCompare(b.type, 'ru') :
        order === 'stats' ? Object.keys(b.stats || {}).length - Object.keys(a.stats || {}).length : 0
      ) || a.name.localeCompare(b.name, 'ru'));
      return result;
    }

    function options() {
      for (const rarity of rarities) $('#quality').append(new Option(rarity, rarity));
      for (const type of [...new Set(catalog.map(item => item.type))].sort()) $('#category').append(new Option(type, type));
    }

    function tabs(items) {
      $('#tabs').replaceChildren();
      const list = [['all', 'Все предметы', items.length],
        ...classes.map(name => [name, name, items.filter(item => fitsClass(item, name)).length]),
        ['missing', 'Неполная информация', items.filter(item => missing(item).length).length]];
      for (const [id, label, count] of list) {
        const button = mk('button', 'tab' + (current === id ? ' active' : ''));
        button.setAttribute('aria-pressed', String(current === id));
        button.setAttribute('aria-label', label + ': ' + count);
        const content = mk('span', 'tab-content');
        content.append(mk('span', 'tab-label', label), mk('small', 'tab-count', String(count)));
        button.append(content);
        button.onclick = () => { current = id; render(); };
        $('#tabs').append(button);
      }
    }

    function toggleCompare(id) {
      if (compare.includes(id)) compare = compare.filter(value => value !== id);
      else { if (compare.length === 3) compare.shift(); compare.push(id); }
      render();
    }

    function itemImage(item) {
      const image = mk('img');
      image.src = LegionWikiModel.iconSrc(item.icon);
      image.alt = item.name; image.loading = 'lazy';
      image.width = image.height = 192;
      return image;
    }

    function field(key, value) {
      const row = mk('div', 'stat');
      row.append(mk('span', '', key), mk('strong', '', value));
      return row;
    }

    function itemFacts(item, context) {
      const facts = mk('dl', 'item-facts ' + context);
      for (const [label, key, value] of [
        ['Тип', 'type', item.type && item.type !== 'Не определён' ? item.type : 'Уточняется'],
        ['Качество', 'quality', item.rarity || 'Уточняется'],
        ['Классы', 'classes', classLabel(item, classes)]
      ]) {
        const box = mk('div', 'item-fact item-fact-' + key), term = mk('dt', '', label);
        const valueNode = mk('dd', key === 'quality' ? 'rarity ' + (item.rarity || '') : '', value);
        valueNode.dataset.field = key;
        box.append(term, valueNode); facts.append(box);
      }
      return facts;
    }

    const ratingTooltip = mk('div', 'rating-tooltip');
    ratingTooltip.id = 'rating-tooltip'; ratingTooltip.hidden = true;
    ratingTooltip.setAttribute('role', 'tooltip');
    root.append(ratingTooltip);
    let ratingAnchor = null, ratingHideTimer, ratingPinned = false;

    function hideRatingTooltip() {
      clearTimeout(ratingHideTimer);
      if (ratingAnchor) ratingAnchor.removeAttribute('aria-describedby');
      ratingAnchor = null; ratingTooltip.hidden = true; ratingPinned = false;
    }
    function delayRatingTooltip() {
      clearTimeout(ratingHideTimer);
      ratingHideTimer = setTimeout(() => {
        if (!ratingPinned && root.activeElement !== ratingAnchor && !ratingTooltip.matches(':hover')) hideRatingTooltip();
      }, 140);
    }
    function showRatingTooltip(button, item) {
      clearTimeout(ratingHideTimer);
      if (ratingAnchor) ratingAnchor.removeAttribute('aria-describedby');
      ratingAnchor = button;
      const number = value => value.toLocaleString('ru-RU', { maximumFractionDigits: 2 });
      ratingTooltip.replaceChildren(mk('strong', 'rating-tooltip-title', 'Как считается рейтинг'));
      ratingTooltip.append(mk('p', '', 'Сумма характеристик с весами сравнивается с максимальной суммой среди известных предметов того же типа. Качество и класс не дают дополнительных баллов.'));
      ratingTooltip.append(field('Расчёт', 'Базовые характеристики'));
      for (const part of item.ratingBasis.parts) ratingTooltip.append(field(part.name, number(part.value) + ' × ' + number(part.weight) + ' = ' + number(part.points)));
      ratingTooltip.append(field('Сумма', number(item.ratingBasis.raw)), field('Максимум для типа', number(item.ratingBasis.max)),
        field('Рейтинг', item.ratingBasis.max > 0 ? number(item.ratingBasis.raw) + ' / ' + number(item.ratingBasis.max) + ' × 100 ≈ ' + item.rating : '0'),
        mk('p', 'fine', 'Учитываются базовые характеристики и штрафы. Заточка не меняет рейтинг. Веса условные; классовые эффекты, ауры и особенности боя в индекс не входят.'));
      const dialog = button.closest('dialog');
      (dialog || root).append(ratingTooltip);
      ratingTooltip.hidden = false; button.setAttribute('aria-describedby', ratingTooltip.id);
      const anchor = button.getBoundingClientRect(), tip = ratingTooltip.getBoundingClientRect();
      const bounds = dialog ? dialog.getBoundingClientRect() : { left: 0, right: window.innerWidth, top: 0, bottom: window.innerHeight };
      let left = anchor.right + 12;
      if (left + tip.width > bounds.right - 12) left = anchor.left - tip.width - 12;
      left = Math.max(bounds.left + 12, Math.min(left, bounds.right - tip.width - 12));
      const top = Math.max(bounds.top + 12, Math.min(anchor.top, bounds.bottom - tip.height - 12));
      ratingTooltip.style.left = left + 'px'; ratingTooltip.style.top = top + 'px';
    }
    function ratingInfo(item) {
      const button = mk('button', 'rating-info', 'i'); button.type = 'button';
      button.setAttribute('aria-label', 'Как считается рейтинг: ' + item.name);
      button.onpointerenter = () => showRatingTooltip(button, item);
      button.onpointerleave = delayRatingTooltip;
      button.onfocus = () => showRatingTooltip(button, item);
      button.onblur = () => { ratingPinned = false; delayRatingTooltip(); };
      button.onclick = event => { event.stopPropagation(); showRatingTooltip(button, item); ratingPinned = true; };
      return button;
    }
    function ratingBadge(item, withTrack) {
      const badge = mk('div', 'rating');
      badge.append(mk('span', 'rating-value', item.rating === null ? 'Рейтинг —' : '★ ' + item.rating + '/100'));
      if (item.rating !== null) {
        if (withTrack) {
          const track = mk('span', 'track'), fill = mk('i');
          fill.style.width = item.rating + '%'; track.append(fill); badge.append(track);
        }
        badge.append(ratingInfo(item));
      }
      return badge;
    }

    ratingTooltip.onpointerenter = () => clearTimeout(ratingHideTimer);
    ratingTooltip.onpointerleave = delayRatingTooltip;
    root.addEventListener('pointerdown', event => {
      if (ratingAnchor && !ratingAnchor.contains(event.target) && !ratingTooltip.contains(event.target)) hideRatingTooltip();
    });
    root.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !ratingTooltip.hidden) {
        event.preventDefault(); event.stopPropagation(); hideRatingTooltip();
      }
    });
    window.addEventListener('resize', hideRatingTooltip);
    window.addEventListener('scroll', hideRatingTooltip, { passive: true });
    $details.addEventListener('scroll', hideRatingTooltip, { passive: true });
    $('#dialogBody').addEventListener('scroll', hideRatingTooltip, { passive: true });

    function tile(item) {
      const card = mk('article', 'item' + (selected === item.id ? ' selected' : ''));
      card.tabIndex = 0; card.setAttribute('aria-label', item.name);
      card.onclick = () => {
        selected = item.id;
        const mobile = window.matchMedia?.('(max-width: 780px)').matches;
        if (mobile) $details.classList.add('expanded');
        $details.scrollTop = 0;
        render();
        if (mobile) $details.scrollIntoView({ behavior: 'smooth', block: 'start' });
      };
      card.onkeydown = event => {
        if (event.target === card && (event.key === 'Enter' || event.key === ' ')) {
          event.preventDefault(); card.click();
        }
      };
      const art = mk('div', 'art'), body = mk('div', 'cardbody'), meta = itemFacts(item, 'cardmeta');
      art.classList.add('item-art'); art.dataset.rarity = item.rarity || '';
      art.append(itemImage(item));
      body.append(mk('div', 'cardtitle', item.name));
      body.append(meta);
      const stats = mk('div', 'cardstats');
      for (const [name, stat] of Object.entries(statsOf(item))) stats.append(field(name, formatStat(stat)));
      if (!stats.childElementCount) stats.append(mk('span', 'fine', item.type === 'Особая вещь' ? 'Особый эффект' : 'Характеристики уточняются'));
      body.append(stats, mk('div', 'cardlevel', 'Заточка +' + levelOf(item)));
      body.append(ratingBadge(item, true));
      const choose = mk('button', 'chooseCompare' + (compare.includes(item.id) ? ' on' : ''), compare.includes(item.id) ? '✓' : '⇄');
      choose.setAttribute('aria-label', (compare.includes(item.id) ? 'Убрать из сравнения: ' : 'Сравнить: ') + item.name);
      choose.setAttribute('aria-pressed', String(compare.includes(item.id)));
      choose.onclick = event => { event.stopPropagation(); toggleCompare(item.id); };
      card.append(art, body, choose);
      if (missing(item).length) {
        const mark = mk('span', 'missingDot', '!');
        mark.title = 'Данные уточняются: ' + missing(item).join(', ');
        card.append(mark);
      }
      return card;
    }

    function render() {
      hideRatingTooltip();
      const items = getData(); scores(items); tabs(items);
      const found = currentList(items);
      if (!found.some(item => item.id === selected)) selected = found[0]?.id || '';
      $('#catalog').replaceChildren(...found.map(tile));
      if (!found.length) $('#catalog').append(mk('p', 'muted', 'Предметы с такими условиями не найдены.'));
      $('#metaCount').textContent = 'Найдено: ' + found.length + ' из ' + items.length;
      $('#totals').textContent = items.length + ' предмета';
      detail(items.find(item => item.id === selected)); compareUi(items); updateDetailHeight();
    }

    function enchantControl(item, onChange, compact = false) {
      const wrap = mk('div', compact ? 'enchant compare-enchant' : 'enchant'), controls = mk('div', 'enchantControls');
      const slider = mk('input'), select = mk('select'), label = mk('div', 'fine');
      slider.type = 'range'; slider.min = '0'; slider.max = '15'; slider.step = '1';
      slider.setAttribute('aria-label', compact ? 'Заточка: ' + item.name : 'Уровень заточки');
      select.setAttribute('aria-label', compact ? 'Заточка предмета: ' + item.name : 'Заточка предмета');
      for (let level = 0; level <= 15; level++) select.append(new Option('+' + level, String(level)));
      function update(value, notify) {
        const level = Number(value);
        levels.set(item.id, level); slider.value = select.value = String(level);
        label.textContent = level === 0 ? 'Базовые характеристики без заточки'
          : 'Основные характеристики +' + ENCHANT_BONUS[level] + '% · дополнительные +' + (Math.round(ENCHANT_BONUS[level] / 4 * 10) / 10).toLocaleString('ru-RU') + '%';
        if (notify) onChange();
      }
      slider.oninput = () => update(slider.value, true);
      select.onchange = () => update(select.value, true);
      update(levelOf(item), false); controls.append(slider, select); wrap.append(controls); if (!compact) wrap.append(label);
      return wrap;
    }

    function detail(item) {
      hideRatingTooltip();
      $details.replaceChildren();
      if (!item) {
        $details.append(mk('p', 'muted', 'Выберите предмет, чтобы увидеть описание и характеристики.'));
        return;
      }
      const toggle = mk('button', 'detailToggle', item.name);
      toggle.append(mk('span', '', $details.classList.contains('expanded') ? 'Свернуть ↑' : 'Подробнее ↓'));
      toggle.setAttribute('aria-expanded', String($details.classList.contains('expanded')));
      toggle.onclick = () => { $details.classList.toggle('expanded'); detail(item); };
      $details.append(toggle);
      const hero = mk('div', 'detail-hero'), title = mk('div', 'detail-heading');
      hero.dataset.section = 'identity';
      title.append(mk('h2', '', item.name), ratingBadge(item, false));
      const art = mk('div', 'detail-art item-art'); art.dataset.rarity = item.rarity || ''; art.append(itemImage(item));
      hero.append(art, title); $details.append(hero);
      const facts = itemFacts(item, 'detail-facts'); facts.dataset.section = 'facts';
      $details.append(facts, mk('h3', 'stats-heading', 'ХАРАКТЕРИСТИКИ'));
      if (Object.keys(item.stats || {}).length) {
        const title = mk('div', 'statsTitle'), rows = mk('div', 'statRows');
        rows.dataset.section = 'stats';
        function updateStats() {
          hideRatingTooltip();
          title.textContent = levelOf(item) === 0 ? 'Без заточки' : 'Заточка +' + levelOf(item);
          rows.replaceChildren(...Object.entries(statsOf(item)).map(([name, stat]) => field(name, formatStat(stat))));
          const fresh = getData(); scores(fresh);
          const updated = fresh.find(value => value.id === item.id);
          item.rating = updated.rating; item.ratingBasis = updated.ratingBasis;
          $details.querySelector('.detail-hero .rating-value').textContent = item.rating === null ? 'Рейтинг —' : '★ ' + item.rating + '/100';
          $('#catalog').replaceChildren(...currentList(fresh).map(tile));
        }
        $details.append(title, rows);
        updateStats();
        if (item.approximate) $details.append(mk('p', 'warn', 'Базовые значения приблизительные; возможна погрешность округления.'));
        const control = enchantControl(item, updateStats);
        control.dataset.section = 'enchant'; $details.append(control);
      } else {
        const unknown = mk('p', 'fine', item.type === 'Особая вещь' ? 'Особый эффект указан в описании.' : 'Характеристики предмета пока уточняются.');
        unknown.dataset.section = 'stats'; $details.append(unknown);
      }
      const description = mk('section', 'item-description');
      description.dataset.section = 'description';
      description.append(mk('h3', 'description-heading', 'ОПИСАНИЕ'), mk('p', 'desc', item.description || 'Описание предмета пока уточняется.'));
      if (item.bonusClass) description.append(mk('p', 'fine', 'Классовый бонус: ' + item.bonusClass));
      if (item.recommendedClasses?.length) description.append(mk('p', 'fine', 'Рекомендуется: ' + item.recommendedClasses.join(', ')));
      $details.append(description);
      if (item.lore) {
        const story = mk('details', 'story'); story.dataset.section = 'history';
        story.append(mk('summary', '', 'История предмета'), mk('p', '', item.lore)); $details.append(story);
      }
      const add = mk('button', 'primary detailCompare', compare.includes(item.id) ? '✓ Убрать из сравнения' : '⇄ Добавить к сравнению');
      add.dataset.section = 'compare'; add.onclick = () => toggleCompare(item.id); $details.append(add);
    }

    function compareUi(items) {
      $('#compareBar').classList.toggle('hidden', !compare.length);
      $('#compareNames').textContent = 'Сравнение (' + compare.length + '/3): ' +
        compare.map(id => items.find(item => item.id === id)?.name).filter(Boolean).join(' · ');
      $('#compareOpen').disabled = compare.length < 2;
    }

    function compareOpen() {
      const items = getData(); scores(items);
      const chosen = compare.map(id => items.find(item => item.id === id)).filter(Boolean);
      if (chosen.length < 2) return;
      const table = mk('table', 'compareTable'), head = mk('thead'), heading = mk('tr'), body = mk('tbody');
      table.dataset.count = String(chosen.length);
      table.append(mk('caption', 'sr-only', 'Сравнение выбранных предметов и их характеристик'));
      const parameter = mk('th', 'parameter-heading'); parameter.scope = 'col'; parameter.append(mk('span', 'parameter-label', 'Параметр')); heading.append(parameter);
      for (const item of chosen) {
        const cell = mk('th', 'compare-item-heading'), art = mk('div', 'compare-art');
        cell.scope = 'col'; art.classList.add('item-art'); art.dataset.rarity = item.rarity || ''; art.append(itemImage(item));
        cell.append(art, mk('div', 'compare-item-name', item.name)); heading.append(cell);
      }
      head.append(heading); table.append(head, body);
      const symbols = { 'Классы': '♜', 'Тип': '⚔', 'Качество': '◇', 'Заточка': '⚒', 'Рейтинг': '▥',
        'Царапки': '╱', 'Мяу-магия': '✦', 'Мур-ХП': '♡', 'Пушистость': '▱', 'Сопротивление': '◈',
        'Шанс крита': '◎', 'Сила крита': '✷', 'Удача': '✤', 'Уклонение': '➶', 'Пробивание': '➹', 'Сила лечения': '✚' };
      function row(label, key) {
        const result = mk('tr'), cell = mk('th');
        cell.scope = 'row'; result.dataset.row = key || label;
        const content = mk('span', 'compare-label'), icon = mk('span', 'compare-label-icon', symbols[label] || '◇');
        icon.setAttribute('aria-hidden', 'true');
        content.append(icon, mk('span', '', label)); cell.append(content); result.append(cell); body.append(result);
        return result;
      }
      for (const [label, value] of [
        ['Классы', item => classLabel(item, classes)], ['Тип', item => item.type],
        ['Качество', item => item.rarity || 'Уточняется']
      ]) {
        const tr = row(label);
        for (const item of chosen) {
          const cell = mk('td', label === 'Качество' ? 'rarity ' + (item.rarity || '') : '', value(item));
          cell.dataset.item = item.id; tr.append(cell);
        }
      }
      const enchantRow = row('Заточка', 'enchant');
      const statCells = [], ratingCells = [];
      function updateValues() {
        const fresh = getData(); scores(fresh);
        for (const item of chosen) {
          const updated = fresh.find(value => value.id === item.id);
          item.rating = updated.rating; item.ratingBasis = updated.ratingBasis;
        }
        for (const record of ratingCells) record.node.textContent = record.item.rating === null ? '—' : record.item.rating + '/100';
        const sets = chosen.map(statsOf);
        for (const record of statCells) {
          const highest = Math.max(...sets.map(stats => num(stats[record.name])));
          record.cells.forEach((cell, index) => {
            const stat = sets[index][record.name];
            cell.querySelector('.compare-value').textContent = stat ? formatStat(stat) : '—';
            cell.classList.toggle('best', !!stat && highest > 0 && num(stat) === highest);
          });
        }
      }
      for (const item of chosen) {
        const cell = mk('td'); cell.dataset.item = item.id;
        if (Object.keys(item.stats || {}).length) {
          cell.append(enchantControl(item, () => { updateValues(); render(); }, true));
        } else cell.append(mk('span', 'fine', 'Характеристики уточняются'));
        enchantRow.append(cell);
      }
      const ratingRow = row('Рейтинг');
      for (const item of chosen) {
        const cell = mk('td'), wrap = mk('span', 'rating-inline');
        cell.dataset.item = item.id;
        const value = mk('span', 'compare-rating-value', item.rating === null ? '—' : item.rating + '/100');
        wrap.append(value); ratingCells.push({ item, node: value });
        if (item.rating !== null) wrap.append(ratingInfo(item));
        cell.append(wrap); ratingRow.append(cell);
      }
      const names = [...new Set(chosen.flatMap(item => Object.keys(item.stats || {})))];
      for (const name of names) {
        const tr = row(name), cells = [];
        tr.dataset.stat = name;
        for (const item of chosen) {
          const cell = mk('td', 'compare-stat');
          cell.dataset.item = item.id; cell.append(mk('span', 'compare-value')); tr.append(cell); cells.push(cell);
        }
        statCells.push({ name, cells });
      }
      updateValues();
      $('#dialogTitle').textContent = 'Сравнение предметов';
      $('#dialogBody').replaceChildren(table);
      $('#dialogBody').scrollTop = 0;
      $('#dialogBody').classList.remove('is-scrolled');
      $('#dialog').showModal();
    }

    function updateDetailHeight() {
      if (window.matchMedia?.('(max-width: 780px)').matches) {
        $details.style.removeProperty('--panel-height');
        return;
      }
      const top = Math.max(18, $details.getBoundingClientRect().top);
      $details.style.setProperty('--panel-height', Math.max(180, window.innerHeight - top - 72) + 'px');
    }
    let detailFramePending = false;
    function scheduleDetailHeight() {
      if (detailFramePending) return;
      detailFramePending = true;
      (window.requestAnimationFrame || (callback => setTimeout(callback, 0)))(() => {
        detailFramePending = false; updateDetailHeight();
      });
    }
    window.addEventListener('resize', scheduleDetailHeight);
    window.addEventListener('scroll', scheduleDetailHeight, { passive: true });
    $('#dialog').addEventListener('close', () => { hideRatingTooltip(); scheduleDetailHeight(); });
    $('#dialogBody').addEventListener('scroll', () => {
      $('#dialogBody').classList.toggle('is-scrolled', $('#dialogBody').scrollTop > 2);
    }, { passive: true });
    $('#query').oninput = render;
    $('#quality').onchange = render;
    $('#category').onchange = render;
    $('#order').onchange = render;
    $('#reset').onclick = () => {
      $('#query').value = ''; $('#quality').value = ''; $('#category').value = '';
      $('#order').value = 'rating'; current = 'all'; render();
    };
    $('#compareOpen').onclick = compareOpen;
    $('#compareClear').onclick = () => { compare = []; render(); };
    $('#closeDialog').onclick = () => $('#dialog').close();

    function setData(data) {
      catalog = data.items || [];
      classes = data.classes || [];
      rarities = data.rarities || [];
      for (const item of catalog) item.iconMissing = !item.icon;
      $('#quality').replaceChildren(new Option('Любое качество', ''));
      $('#category').replaceChildren(new Option('Все типы', ''));
      options(); render();
    }
    if (options.data) setData(options.data);
    return { setData, render, get selected() { return selected; } };
  }

  return { mount };
})();
