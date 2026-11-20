# legion-wiki

Энциклопедия предметов игры «Легион» (`legiongame.gg/c/<channel>/`) в виде
**юзерскрипта для Tampermonkey**: добавляет вкладку **«Вики»** в шапку игры
и тихо собирает увиденные предметы.

## Установка (1 клик)

1. Установить [Tampermonkey](https://www.tampermonkey.net/) для Edge/Chrome.
2. Открыть юзерскрипт и нажать **«Установить»**:
   - https://cdn.jsdelivr.net/gh/GhostizS6/legion-wiki@main/legion-wiki.user.js
   - запасная ссылка: https://raw.githubusercontent.com/GhostizS6/legion-wiki/main/legion-wiki.user.js
3. Открыть игру — в шапке появится вкладка **Вики**.

**Автообновление:** Tampermonkey сам проверяет `@updateURL` (jsDelivr) и
обновляет скрипт, когда в репозитории меняется `@version`. Данные предметов
обновляются отдельно, без новой версии скрипта (кеш 6 часов + кнопка
«Обновить данные»).

## Данные

- Источник правды: `data/items.json` в репозитории.
- Скрипт тянет его через `GM_xmlhttpRequest` с jsDelivr (запасной источник —
  raw.githubusercontent.com), кеширует в `GM_setValue` на 6 часов.
- В собранный скрипт встроен снепшот на случай, если сеть/источники недоступны.

## Структура

| Путь | Что это |
|---|---|
| `legion-wiki.user.js` | собранный скрипт (единственный артефакт для пользователя) |
| `data/items.json` | каталог: 315 предметов, иконки — inline SVG |
| `src/platform.js` | хранилище GM, сеть, экспорт |
| `src/collector.js` | перехват `LGInventory.art` и `/api/me` |
| `src/boot.js` | вкладка «Вики», shadow DOM, панель |
| `src/app.js` | UI вики (поиск, фильтры, рейтинг, заточка, сравнение) |
| `src/merge.js` | слияние каталога с наблюдениями |
| `src/style.css`, `src/comparison.css` | стили панели (эмбедятся в скрипт) |
| `tools/build.js` | сборка `legion-wiki.user.js` |
| `tools/merge.js` | слить экспорт из игры в `data/items.json` + пересборка |
| `tools/validate.js` | проверка данных, версии и актуальности сборки |
| `tools/test-merge.js` | тест логики слияния |

## Сборка и проверки

```powershell
node tools/build.js        # собрать legion-wiki.user.js
node tools/validate.js     # данные + версия + актуальность сборки
node tools/test-merge.js   # тест слияния
```

## Обновление каталога

1. В игре открыть **Вики** → **Экспорт JSON** → сохраняется `legion-wiki-captures.json`.
2. Слить и пересобрать:

```powershell
node tools/merge.js legion-wiki-captures.json
node tools/validate.js
git add data legion-wiki.user.js && git commit -m "data: update items"
git push
```

3. Поднять `version` в `package.json` и пересобрать — только если менялся код
   (это триггер автообновления у пользователей). Новые предметы версию не требуют.

## Как собираются данные

1. `collector.js` оборачивает `LGInventory.art` — сайт сам вызывает его для
   каждого показанного предмета; оттуда приходят полный объект и SVG-иконка.
2. Раз в 2 минуты читается `/api/me` → `hero.items` (вся сумка).
3. Наблюдения лежат в `GM_setValue` (`captures`) и подмешиваются в каталог
   при открытии вкладки.

## Правила данных

- Ключ предмета — `gameId + '|' + name`. Одинаковые id и название → обновляется
  последнее наблюдение; другое название того же `gameId` — отдельная запись
  (наследует описание базового предмета).
- `stats` — `{ "Царапки": { "value": 12, "percent": false } }`.
- `icon` — строка `<svg …>` или `data:`-URI.

## Ограничения

- Собирается только то, что попало в игру: свой инвентарь, торговые окна, почта.
- `LGInventory.art` — внутренний API сайта; если его переименуют, сбор иконок
  остановится (данные из `/api/me` продолжат собираться).
- Tampermonkey проверяет обновления по расписанию (обычно раз в сутки).
