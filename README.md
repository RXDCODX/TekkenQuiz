# Tekken Move Quiz

Игра-тренажер по мувлистам Tekken 8 на базе данных с `okizeme.gg`.

Фронтенд собран на `Vite + React + TypeScript`.

Для деплоя как static-сайта настроен workflow GitHub Actions: `.github/workflows/deploy-pages.yml`.
Также добавлена публикация через пакет `gh-pages`.

UI разбит на React-компоненты в `src/components`.

## Что делает проект

- собирает базу ударов в `public/data/moves.json`;
- для каждого удара сохраняет:
  - персонажа;
  - инпут (`command`);
  - `onBlock` и другие поля фреймдаты;
  - ссылку на видео удара;
- запускает браузерную игру:
  - показывается видео удара;
  - игрок вводит либо `On Block` (1 балл), либо `Input` (0.2 балла);
  - при правильном ответе вспышка зеленым по краям и следующий раунд;
  - при ошибке конец игры и экран результата;
  - есть режим `Песочница`: выбирается один персонаж, отвечать можно только на фреймдату (`On Block`) и без подсчета очков;
  - можно указать ник и сделать скрин результата.

## Запуск

1. Установить зависимости:

```bash
npm install
```

1. Сгенерировать базу:

```bash
npm run build:db
```

1. Запустить Vite dev server:

```bash
npm run dev
```

1. Открыть в браузере `http://localhost:5173`.

1. Прод-сборка и предпросмотр:

```bash
npm run build
npm run preview
```

## GitHub Pages (через GitHub Actions)

Workflow уже готов и автоматически:

1. Устанавливает зависимости (`npm ci`)
1. Генерирует базу (`npm run build:db`)
1. Собирает сайт (`npm run build`)
1. Деплоит `dist/` в GitHub Pages

Файл workflow: `.github/workflows/deploy-pages.yml`

Что нужно включить в репозитории:

1. `Settings -> Pages`
1. `Build and deployment -> Source: GitHub Actions`

По умолчанию деплой запускается при push в ветку `main`.
Если у тебя другая ветка, поменяй `on.push.branches` в workflow.

## Публикация через gh-pages

Локальная публикация в ветку `gh-pages`:

```bash
npm run deploy
```

Что делает команда:

1. Генерирует базу (`npm run build:db`)
1. Собирает Vite с правильным `base` для репозитория
1. Публикует `dist/` в ветку `gh-pages`

Требования:

1. Должен быть настроен `remote origin`
1. В `Settings -> Pages` выбрать `Deploy from a branch`
1. В качестве ветки выбрать `gh-pages` и папку `/ (root)`

Если `origin` не настроен, можно явно передать имя репозитория:

```bash
GH_PAGES_REPO=<repo-name> npm run deploy
```

PowerShell вариант:

```powershell
$env:GH_PAGES_REPO="repo-name"
npm run deploy
```

Проверка без публикации:

```bash
node scripts/deploy-gh-pages.mjs --dry-run
```

## Полезные параметры скрейпера

Быстрый режим без отдельного запроса на каждое видео:

```bash
npm run build:db:pattern
```

Ограничить количество персонажей и ударов для теста:

```bash
node scripts/build-moves-db.mjs --limit-characters 3 --limit-moves 80
```

Принудительно собрать только выбранных персонажей:

```bash
node scripts/build-moves-db.mjs --characters kazuya,jin,reina
```
