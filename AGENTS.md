# legion-wiki — расширение и данные

Энциклопедия предметов игры «Легион»: вкладка «Вики» в шапке игры плюс каталог данных
в этом репозитории.

## Язык проекта

- Комментарии, README, документация и сообщения скриптов — **на русском**.
- Имена файлов, функций, переменных, ключей данных, команд и коммитов — **на английском**.
- Тексты интерфейса — на русском (как в игре).

## Структура

| Папка | Что там |
|---|---|
| `data/` | `items.json` — единственный источник правды |
| `extension/` | MV3-расширение: `manifest.json`, `background.js`, `content/`, `shared/`, `data/items.json` |
| `tools/` | `seed.js`, `merge.js`, `validate.js`, `test-merge.js` |

## Команды

```powershell
node tools/merge.js legion-wiki-captures.json   # слить экспорт из игры
node tools/validate.js                          # проверить данные
node tools/test-merge.js                        # тест слияния
node --check extension/background.js
node --check extension/content/*.js
```

## Правила изменений

- Каталог правится только через `tools/merge.js` или вручную в `data/items.json`;
  `extension/data/items.json` — копия, её обновляет `tools/merge.js`.
- Схема данных: `schemaVersion: 2`, ключ предмета `gameId + '|' + name`,
  статы вида `{ "Царапки": { "value": 12, "percent": false } }`.
- После правки данных — обязательно `node tools/validate.js`.
- Источник данных в расширении:
  `https://raw.githubusercontent.com/GhostizS6/legion-wiki/main/data/items.json`.
- Сбор данных — только чтение того, что игрок видит в игре; авторизацию,
  лимиты и антибот не обходим.

## Ограничения

- `LGInventory.art` — внутренний API сайта, может измениться без предупреждения.
- Собираются только увиденные предметы; остальные остаются без статов.
