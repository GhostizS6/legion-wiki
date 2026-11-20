'use strict';
// Вкладка «Вики» в шапке игры + панель в shadow DOM.
(function () {
  if (globalThis.__legionWikiBoot) return;
  globalThis.__legionWikiBoot = true;

  const platform = globalThis.LegionWikiPlatform;
  let ui = null, shadow = null, infoNode = null, loaded = false, loading = false, meta = null;

  const TEMPLATE = `
<header class="top">
  <div class="brand">
    <span class="brandmark" aria-hidden="true">◆</span>
    <div class="brand-copy">
      <h1>Вики <span>Легиона</span></h1>
      <p class="guild-signature">Каталог предметов и автосбор из игры</p>
    </div>
  </div>
  <div class="topinfo"><span id="totals">Энциклопедия предметов</span></div>
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
    <div class="compare-heading"><h2 id="dialogTitle">Сравнение предметов</h2></div>
    <button id="closeDialog" class="subtle" aria-label="Закрыть сравнение" autofocus><svg class="close-icon" aria-hidden="true" viewBox="0 0 24 24" width="16" height="16" fill="none"><path d="m6 6 12 12M18 6 6 18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg><span class="close-label">Закрыть</span></button>
  </header>
  <div id="dialogBody" class="compare-scroll" tabindex="0" aria-label="Характеристики сравниваемых предметов"></div>
  <footer class="compare-footer" aria-label="Информация о заточке"><p class="compare-footer-text">Заточка меняется отдельно для каждого предмета. Золотом отмечено наибольшее значение характеристики.</p></footer>
</dialog>`;

  function paint(style) {
    style.textContent = platform.styles();
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
    paint(style);
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
    const source = meta.source === 'remote' ? 'GitHub' : 'встроенный снепшот';
    const when = meta.fetchedAt ? new Date(meta.fetchedAt).toLocaleString('ru-RU') : '—';
    infoNode.textContent = `Предметов: ${meta.data.items.length} · источник: ${source} (${when}) · собрано в игре: ${meta.captured ?? '…'}`;
  }

  async function load(force) {
    if (loading) return;
    loading = true;
    if (infoNode) infoNode.textContent = force ? 'Обновляю данные с GitHub…' : 'Загрузка данных…';
    let result = null;
    try { result = await platform.catalog(!!force); } catch (error) { result = null; }
    loading = false;
    if (!result || !result.data) {
      if (infoNode) { infoNode.textContent = 'Не удалось загрузить данные. Проверь сеть или повтори позже.'; infoNode.classList.add('lgw-error'); }
      return;
    }
    if (infoNode) infoNode.classList.remove('lgw-error');
    loaded = true;
    ui.setData(result.data);
    const count = await platform.captureCount();
    showMeta({ ...result, captured: count ? count.count : result.captured });
  }

  async function exportCaptures() {
    const result = await platform.export();
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
    else if (meta && meta.data) platform.captureCount().then(count => showMeta({ ...meta, captured: count.count }));
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

  ensureButton();
})();
