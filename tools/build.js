#!/usr/bin/env node
'use strict';
// Собирает единый legion-wiki.user.js из src/ + data/items.json.
// Использование: node tools/build.js
const fs = require('fs');
const path = require('path');

const root = path.resolve(__dirname, '..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const version = JSON.parse(read('package.json')).version;

const header = `// ==UserScript==
// @name         Legion Wiki
// @namespace    https://github.com/GhostizS6/legion-wiki
// @version      ${version}
// @description  Энциклопедия предметов Legion: вкладка «Вики» в игре и автосбор данных
// @author       Ghostiz_s6
// @match        https://legiongame.gg/c/*
// @run-at       document-idle
// @noframes
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM.xmlHttpRequest
// @grant        GM.download
// @grant        unsafeWindow
// @connect      cdn.jsdelivr.net
// @connect      raw.githubusercontent.com
// @updateURL    https://cdn.jsdelivr.net/gh/GhostizS6/legion-wiki@main/legion-wiki.user.js
// @downloadURL  https://cdn.jsdelivr.net/gh/GhostizS6/legion-wiki@main/legion-wiki.user.js
// @supportURL   https://github.com/GhostizS6/legion-wiki
// ==/UserScript==
`;

const css = read('src/style.css') + '\n' + read('src/comparison.css');
const data = read('data/items.json');

const emit = `
// Мост «сборщик → платформа»: превращает предметы игры в записи вики.
globalThis.LegionWikiEmit = function (packs) {
  const entries = packs.map(pack => LegionWikiModel.toEntry(pack.item, pack.svg)).filter(Boolean);
  if (entries.length) globalThis.LegionWikiPlatform.capture(entries);
};
`;

const collector = `
// Сборщик работает с настоящим окном игры (unsafeWindow), а не с песочницей менеджера.
(function (window) {
${read('src/collector.js')}
})(typeof unsafeWindow !== 'undefined' ? unsafeWindow : window);
`;

const parts = [
  header,
  '(function () {',
  `const WIKI_CSS = ${JSON.stringify(css)};`,
  `const BASE_DATA = ${data};`,
  read('src/platform.js'),
  read('src/merge.js'),
  read('src/item-model.js'),
  read('src/model.js'),
  read('src/rating.js'),
  emit,
  read('src/app.js'),
  collector,
  read('src/boot.js'),
  '})();',
];

const out = path.join(root, 'legion-wiki.user.js');
fs.writeFileSync(out, parts.join('\n'), 'utf8');
console.log(`legion-wiki.user.js · v${version} · ${(fs.statSync(out).size / 1024).toFixed(0)} КБ`);
