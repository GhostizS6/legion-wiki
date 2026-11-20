'use strict';
// Вкладка «Вики» у шапці гри + панель у shadow DOM.
(function () {
  if (window.__legionWikiBoot) return;
  window.__legionWikiBoot = true;

  let ui = null, shadow = null, infoNode = null, loaded = false, loading = false, meta = null;

  const send = (type, extra) => chrome.runtime.sendMessage({ type, ...extra }).catch(() => null);

  const TEMPLATE = `
<header class="top">
  <div class="brand">
    <span class="brandmark" aria-hidden="true">✦</span>
    <div class="brand-copy"><div class="eyebrow">НЕЗАВИСИМАЯ ЭНЦИКЛОПЕДИЯ</div><h1>LEGION <span>WIKI</span></h1>
    <p class="guild-signature">Данные собираются из игры автоматически</p></div>
  </div>
  <div class="topinfo"><span class="tiny-paw" aria-hidden="true"></span><span id="totals">Энциклопедия предметов</span></div>
</header>
<div class="frame">
  <div class="lgw-admin">
    <div id="lgw-info">Загрузка данных…</div>
    <div class="lgw-actions">
      <button type="button" id="lgw-refresh">Обновить данные</button>
      <button type="button" id="lgw-export">Экспорт JSON</button>
    </div>
  </div>
  <nav class="tabs" id="tabs" aria-label="Классы предметов"></nav>
  <div class="ornament" aria-hidden="true"><span class="tiny-paw"></span></div>
  <section class="toolbar" aria-label="Поиск и фильтры">
    <label class="search"><span aria-hidden="true">⌕</span><input id="query" type="search" aria-label="Поиск предметов" placeholder="Поиск предметов по названию, описанию, эффектам…"></label>
    <select id="quality" aria-label="Качество"><option value="">Любое качество</option></select>
    <select id="category" aria-label="Тип предмета"><option value="">Все типы</option></select>
    <select id="order" aria-label="Сортировка"><option value="rating">Рейтинг: сначала лучшие</option><option value="quality">Качество: сначала редкие</option><option value="type">Тип предмета</option><option value="name">По названию</option><option value="stats">Количество характеристик</option></select>
    <button class="subtle" id="reset"><span aria-hidden="true">⟲</span> Сбросить</button>
  </section>
  <div class="catalogHead"><div id="metaCount" role="status"></div></div>
  <div class="columns"><main class="catalog" id="catalog" aria-label="Каталог предметов"></main><aside id="details" class="details" aria-label="Описание и характеристики"></aside></div>
</div>
<div class="compare-bar hidden" id="compareBar"><div id="compareNames"></div><div><button id="compareOpen" class="primary">Сравнить</button><button id="compareClear" class="subtle">Очистить</button></div></div>
<dialog id="dialog" class="compare-dialog" aria-labelledby="dialogTitle">
  <header class="compare-header">
    <div class="compare-brand" aria-hidden="true"><span class="compare-brand-text">✦ LEGION <b>WIKI</b></span></div>
    <div class="compare-heading"><h2 id="dialogTitle">Сравнение предметов</h2><div class="ornament" aria-hidden="true"><span class="tiny-paw"></span></div></div>
    <button id="closeDialog" class="subtle" aria-label="Закрыть сравнение" autofocus><svg class="close-icon" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="close-label">Закрыть</span></button>
  </header>
  <div id="dialogBody" class="compare-scroll" tabindex="0" aria-label="Характеристики сравниваемых предметов"></div>
  <footer class="compare-footer" aria-label="Информация о заточке"><p class="compare-footer-text">Заточка меняется отдельно для каждого предмета. Золотом отмечено наибольшее значение характеристики.</p></footer>
</dialog>`;

  async function paint(style) {
    const [main, comparison] = await Promise.all([
      fetch(chrome.runtime.getURL('content/style.css')).then(response => response.text()),
      fetch(chrome.runtime.getURL('content/comparison.css')).then(response => response.text()),
    ]);
    style.textContent = main + '\n' + comparison;
  }

  function build() {
    let host = document.getElementById('tab-wiki');
    if (host) return host;
    const main = document.getElementById('main');
    if (!main) return null;
    host = document.createElement('section');
    host.id = 'tab-wiki';
    host.className = 'tab';
    host.setAttribute('aria-label', 'Legion Wiki');
    main.append(host);
    shadow = host.attachShadow({ mode: 'open' });
    const style = document.createElement('style');
    const wrap = document.createElement('div');
    wrap.className = 'lgw';
    wrap.innerHTML = TEMPLATE;
    shadow.append(style, wrap);
    paint(style).catch(() => { style.textContent = ':host{display:block;color:#eee;font:14px sans-serif}'; });
    ui = LegionWikiUI.mount(shadow, {});
    infoNode = shadow.querySelector('#lgw-info');
    shadow.querySelector('#lgw-refresh').addEventListener('click', () => load(true));
    shadow.querySelector('#lgw-export').addEventListener('click', exportCaptures);
    return host;
  }

  function showMeta(extra) {
    if (!infoNode) return;
    if (extra) meta = extra;
    if (!meta || !meta.data) { infoNode.textContent = 'Загрузка данных…'; return; }
    const source = meta.source === 'remote' ? 'GitHub' : 'локальный снепшот';
    const when = meta.fetchedAt ? new Date(meta.fetchedAt).toLocaleString('ru-RU') : '—';
    infoNode.textContent = `Предметов: ${meta.data.items.length} · источник: ${source} (${when}) · собрано в игре: ${meta.captured ?? '…'}`;
  }

  async function load(force) {
    if (loading) return;
    loading = true;
    if (infoNode) infoNode.textContent = force ? 'Обновляю данные с GitHub…' : 'Загрузка данных…';
    const result = await send('catalog', { force: !!force });
    loading = false;
    if (!result || !result.data) {
      if (infoNode) { infoNode.textContent = 'Не удалось загрузить данные. Проверь сеть или повтори позже.'; infoNode.classList.add('lgw-error'); }
      return;
    }
    if (infoNode) infoNode.classList.remove('lgw-error');
    loaded = true;
    ui.setData(result.data);
    const count = await send('captureCount');
    showMeta({ ...result, captured: count ? count.count : result.captured });
  }

  async function exportCaptures() {
    const result = await send('export');
    if (!infoNode) return;
    infoNode.textContent = result && result.ok
      ? `Экспортировано ${result.count} наблюдений. Файл сохранён в загрузки.`
      : 'Экспорт не удался: нет наблюдений или браузер заблокировал скачивание.';
    setTimeout(() => showMeta(), 6000);
  }

  function activate() {
    const host = build();
    if (!host) return;
    document.querySelectorAll('.tab').forEach(section => section.classList.toggle('on', section.id === 'tab-wiki'));
    document.querySelectorAll('.tabs button').forEach(button => {
      if (button.dataset.tab === 'wiki') button.setAttribute('aria-current', 'page');
      else button.removeAttribute('aria-current');
    });
    if (!loaded && !loading) load(false);
  }

  function ensureButton() {
    const nav = document.querySelector('.top nav.tabs') || document.querySelector('nav.tabs');
    if (!nav) return null;
    let button = nav.querySelector('button[data-tab="wiki"]');
    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.dataset.tab = 'wiki';
      button.textContent = 'Вики';
      button.addEventListener('click', event => { event.preventDefault(); activate(); });
      nav.append(button);
    }
    return button;
  }

  // Спостереження з MAIN world → фон.
  window.addEventListener('message', event => {
    if (event.source !== window) return;
    const data = event.data;
    if (!data || data.source !== 'legion-wiki' || data.type !== 'capture') return;
    const items = (data.items || [])
      .map(pack => LegionWikiModel.toEntry(pack.item, pack.svg))
      .filter(Boolean);
    if (!items.length) return;
    send('capture', { items }).then(result => {
      if (result && result.ok && meta && meta.data) showMeta({ ...meta, captured: result.count });
    });
  });

  ensureButton();
  try {
    if (localStorage.getItem('lgTab') === 'wiki') activate();
  } catch (error) { /* приватний режим */ }
})();
