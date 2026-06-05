# Heated Rivalry Alias

Мини-эпп в стиле Alias для деплоя на Vercel.

## Как запустить локально

```bash
npm install
npm run dev
```

## Как задеплоить на Vercel

1. Загрузите все файлы в GitHub-репозиторий.
2. В Vercel нажмите Add New Project.
3. Выберите репозиторий.
4. Framework Preset: Vite.
5. Build Command: `npm run build`.
6. Output Directory: `dist`.
7. Deploy.

## Где поменять webhook

Файл: `src/config.js`

```js
export const WORDS_WEBHOOK_URL = "...";
```

## Где менять обои

Положите изображения в папку `public/backgrounds/` и укажите имена файлов в `src/config.js`:

```js
export const BACKGROUNDS = {
  home: "/backgrounds/home.jpg",
  teams: "/backgrounds/teams.jpg",
  round: "/backgrounds/round.jpg",
  play: "/backgrounds/play.jpg",
};
```

Если файлов нет, приложение использует спокойные бежево-болотные градиенты.
