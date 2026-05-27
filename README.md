# Discord moderation + music bot

Бот умеет slash-команды для модерации и музыки:

- `/ban`, `/kick`, `/mute`, `/unmute`, `/clear`
- `/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/controls`
- `/ping`, `/help`

## 1. Что нужно установить

- Node.js `22.12.0` или новее
- Discord-аккаунт с правами администратора на сервере

`discord.js` сейчас требует Node.js `22.12.0+`, а для музыки `discord-player` использует FFmpeg. В проекте уже подключен `ffmpeg-static`, поэтому отдельный FFmpeg обычно ставить не надо. Если музыка запускается и сразу останавливается, поставь обычный FFmpeg с [ffmpeg.org](https://ffmpeg.org/download.html) и перезапусти бота.

## 2. Создай приложение Discord

1. Открой [Discord Developer Portal](https://discord.com/developers/applications).
2. Нажми **New Application**.
3. Открой вкладку **Bot** и создай бота.
4. Нажми **Reset Token** / **Copy Token** и сохрани токен только у себя.
5. На странице **General Information** скопируй **Application ID**. Это `DISCORD_CLIENT_ID`.
6. В Discord включи **Developer Mode**, кликни правой кнопкой по серверу и скопируй **Server ID**. Это `GUILD_ID`.

## 3. Настрой `.env`

Скопируй `.env.example` в `.env` и заполни:

```env
DISCORD_TOKEN=токен_бота
DISCORD_CLIENT_ID=id_приложения
GUILD_ID=id_сервера
YOUTUBE_COOKIE=
```

`YOUTUBE_COOKIE` можно оставить пустым. Он нужен только если YouTube начнет блокировать проигрывание без входа.

## 4. Установи и включи команды

```bash
npm install
npm run deploy
npm run invite
```

`npm run invite` напечатает ссылку. Открой ее, выбери свой сервер и добавь бота.

После приглашения запусти бота:

```bash
npm start
```

## 5. Права на сервере

Для модерации роль бота должна быть выше ролей пользователей, которых он банит, кикает или мутит.

Боту нужны права:

- View Channels
- Send Messages
- Kick Members
- Ban Members
- Moderate Members
- Manage Messages
- Connect
- Speak

## 6. Музыка

Зайди в голосовой канал и напиши:

```text
/play query: название песни или ссылка YouTube
```

Например:

```text
/play query: never gonna give you up
```

Важное замечание: проигрывание YouTube в Discord-ботах зависит от неофициальных extractors и может ломаться, когда YouTube меняет защиту потоков. Если `/play` перестанет работать, сначала обнови зависимости:

```bash
npm update
```

Если это не поможет, добавь `YOUTUBE_COOKIE` в `.env`.

## 7. Панель управления

Запуск локальной панели:

```bash
npm run panel
```

Открой в браузере:

```text
http://127.0.0.1:3030
```

На Windows можно дважды кликнуть `start-panel.bat`. В панели есть статус PM2, логи, старт, стоп, рестарт, deploy, install/update и удаление дублей процесса `hzx-bot`.

Чтобы держать панель в фоне через PM2:

```bash
npm run panel:pm2
```

Панель слушает только `127.0.0.1`, не открывай ее наружу в интернет.
