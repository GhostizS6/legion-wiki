# legion-wiki — юзерскрипт для Tampermonkey

Энциклопедия предметов игры «Легион» с вкладкой «Вики» в шапке игры и автосбором данных.

## Язык проекта

- Комментарии, README, документация и сообщения скриптов — **на русском**.
- Имена файлов, функций, переменных, ключей данных, команд и коммитов — **на английском**.
- Тексты интерфейса — на русском (как в игре).

## Структура

| Папка | Что там |
|---|---|
| `data/` | `items.json` — единственный источник правды |
| `src/` | исходники юзерскрипта: `platform.js`, `collector.js`, `boot.js`, `app.js`, `model.js`, `rating.js`, `item-model.js`, `merge.js`, `style.css`, `comparison.css` |
| `tools/` | `build.js`, `merge.js`, `validate.js`, `test-merge.js`, `seed.js` |
| `legion-wiki.user.js` | собранный артефакт, править руками нельзя |

## Команды

```powershell
node tools/build.js        # пересобрать legion-wiki.user.js
node tools/merge.js file.json
node tools/validate.js
node tools/test-merge.js
node --check legion-wiki.user.js
```

## Правила изменений

- Правки только в `src/`, `data/` и `tools/`; `legion-wiki.user.js` пересобирается.
- Версия для автообновления — только `package.json` → `version` (попадает в `@version`).
- Источник данных: `https://cdn.jsdelivr.net/gh/GhostizS6/legion-wiki@main/data/items.json`
  (запасной — raw.githubusercontent.com).
- Схема данных: `schemaVersion: 2`, ключ `gameId + '|' + name`,
  статы `{ "Царапки": { "value": 12, "percent": false } }`.
- После любой правки данных — `node tools/merge.js` или `node tools/build.js`,
  затем `node tools/validate.js`.
- Сбор данных — только чтение того, что игрок видит в игре; авторизацию,
  лимиты и антибот не обходим.

## Ограничения

- `LGInventory.art` — внутренний API сайта, может измениться без предупреждения.
- Собираются только увиденные предметы; остальные остаются без статов.
