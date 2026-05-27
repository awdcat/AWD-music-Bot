import "dotenv/config";
import { exec } from "node:child_process";
import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);
const HOST = "127.0.0.1";
const PORT = Number(process.env.PANEL_PORT || 3030);
const BOT_NAME = process.env.PM2_BOT_NAME || "hzx-bot";
const cwd = process.cwd();

const actionLabels = {
  start: "Запустить",
  restart: "Перезапустить",
  stop: "Остановить",
  save: "Сохранить PM2",
  deploy: "Обновить slash-команды",
  install: "Установить зависимости",
  update: "Обновить зависимости",
  flush: "Очистить логи",
  repair: "Исправить базовые ошибки",
  dedupe: "Убрать дубликаты"
};

function html() {
  return `<!doctype html>
<html lang="ru">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>HZX Bot Panel</title>
  <style>
    :root {
      color-scheme: dark;
      --bg: #121417;
      --panel: #1c2026;
      --line: #303742;
      --text: #f1f4f8;
      --muted: #9aa6b2;
      --green: #31c48d;
      --red: #f05252;
      --blue: #4f8cff;
      --yellow: #f6c85f;
    }

    * {
      box-sizing: border-box;
    }

    body {
      margin: 0;
      background: var(--bg);
      color: var(--text);
      font-family: Inter, "Segoe UI", Arial, sans-serif;
    }

    main {
      width: min(1180px, calc(100vw - 32px));
      margin: 24px auto;
      display: grid;
      gap: 16px;
    }

    header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
      padding-bottom: 4px;
    }

    h1, h2 {
      margin: 0;
      font-weight: 700;
      letter-spacing: 0;
    }

    h1 {
      font-size: 24px;
    }

    h2 {
      font-size: 16px;
    }

    .grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
    }

    section {
      background: var(--panel);
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 16px;
    }

    .status {
      display: grid;
      gap: 10px;
      margin-top: 14px;
    }

    .row {
      display: grid;
      grid-template-columns: 150px 1fr;
      gap: 12px;
      align-items: center;
      min-height: 26px;
      color: var(--muted);
    }

    .value {
      color: var(--text);
      overflow-wrap: anywhere;
    }

    .pill {
      display: inline-flex;
      align-items: center;
      min-height: 24px;
      padding: 2px 9px;
      border-radius: 999px;
      border: 1px solid var(--line);
      font-size: 13px;
      color: var(--text);
    }

    .online {
      border-color: rgba(49, 196, 141, .5);
      color: var(--green);
    }

    .offline {
      border-color: rgba(240, 82, 82, .55);
      color: var(--red);
    }

    .warn {
      border-color: rgba(246, 200, 95, .55);
      color: var(--yellow);
    }

    .actions {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 8px;
      margin-top: 14px;
    }

    button {
      min-height: 38px;
      border: 1px solid var(--line);
      border-radius: 8px;
      background: #242a32;
      color: var(--text);
      font: inherit;
      cursor: pointer;
    }

    button:hover {
      border-color: var(--blue);
    }

    button.primary {
      background: var(--blue);
      border-color: var(--blue);
      color: white;
    }

    button.danger {
      background: #3a2024;
      border-color: rgba(240, 82, 82, .45);
      color: #ffd7d7;
    }

    button:disabled {
      cursor: wait;
      opacity: .6;
    }

    pre {
      margin: 14px 0 0;
      min-height: 420px;
      max-height: 62vh;
      overflow: auto;
      white-space: pre-wrap;
      background: #080a0d;
      border: 1px solid var(--line);
      border-radius: 8px;
      padding: 12px;
      color: #d7e0ea;
      font: 13px/1.45 Consolas, "Cascadia Mono", monospace;
    }

    .toolbar {
      display: flex;
      gap: 8px;
      align-items: center;
      justify-content: space-between;
    }

    .muted {
      color: var(--muted);
      font-size: 13px;
    }

    .output {
      min-height: 150px;
      max-height: 260px;
    }

    @media (max-width: 860px) {
      main {
        width: min(100vw - 20px, 1180px);
        margin: 12px auto;
      }

      .grid {
        grid-template-columns: 1fr;
      }

      .actions {
        grid-template-columns: 1fr 1fr;
      }

      .row {
        grid-template-columns: 120px 1fr;
      }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <h1>HZX Bot Panel</h1>
      <span id="panelState" class="pill">Загрузка</span>
    </header>

    <div class="grid">
      <section>
        <div class="toolbar">
          <h2>Статус</h2>
          <button id="refreshButton">Обновить</button>
        </div>
        <div class="status">
          <div class="row"><span>PM2</span><span id="pm2Status" class="value">...</span></div>
          <div class="row"><span>Процессов</span><span id="processCount" class="value">...</span></div>
          <div class="row"><span>CPU</span><span id="cpu" class="value">...</span></div>
          <div class="row"><span>Память</span><span id="memory" class="value">...</span></div>
          <div class="row"><span>Uptime</span><span id="uptime" class="value">...</span></div>
          <div class="row"><span>.env</span><span id="envStatus" class="value">...</span></div>
          <div class="row"><span>Node</span><span id="nodeStatus" class="value">...</span></div>
        </div>
        <div class="actions">
          <button data-action="start" class="primary">Запустить</button>
          <button data-action="restart" class="primary">Рестарт</button>
          <button data-action="stop" class="danger">Стоп</button>
          <button data-action="deploy">Deploy</button>
          <button data-action="install">Install</button>
          <button data-action="update">Update</button>
          <button data-action="dedupe">Убрать дубли</button>
          <button data-action="flush">Очистить логи</button>
          <button data-action="repair">Repair</button>
          <button data-action="save">PM2 save</button>
        </div>
      </section>

      <section>
        <div class="toolbar">
          <h2>Результат команды</h2>
          <span id="lastAction" class="muted">Готово</span>
        </div>
        <pre id="commandOutput" class="output"></pre>
      </section>
    </div>

    <section>
      <div class="toolbar">
        <h2>Логи</h2>
        <span class="muted">Обновление каждые 3 секунды</span>
      </div>
      <pre id="logs"></pre>
    </section>
  </main>

  <script>
    const $ = (id) => document.getElementById(id);
    const output = $("commandOutput");
    const logs = $("logs");
    const buttons = [...document.querySelectorAll("button[data-action]")];

    function setBusy(state) {
      buttons.forEach((button) => button.disabled = state);
      $("refreshButton").disabled = state;
      $("panelState").textContent = state ? "Работает" : "Онлайн";
      $("panelState").className = state ? "pill warn" : "pill online";
    }

    function formatMs(ms) {
      if (!ms) return "нет данных";
      const total = Math.max(0, Math.floor((Date.now() - ms) / 1000));
      const hours = Math.floor(total / 3600);
      const minutes = Math.floor((total % 3600) / 60);
      const seconds = total % 60;
      return [hours && hours + "ч", minutes && minutes + "м", seconds + "с"].filter(Boolean).join(" ");
    }

    async function requestJson(url, options) {
      const res = await fetch(url, options);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Request failed");
      return data;
    }

    async function loadStatus() {
      try {
        const data = await requestJson("/api/status");
        const first = data.processes[0];
        const duplicate = data.processes.length > 1;
        $("pm2Status").innerHTML = first
          ? '<span class="pill ' + (first.status === "online" ? "online" : "offline") + '">' + first.status + '</span>'
          : '<span class="pill offline">not found</span>';
        $("processCount").innerHTML = duplicate
          ? '<span class="pill warn">' + data.processes.length + ' процесса</span>'
          : String(data.processes.length);
        $("cpu").textContent = first ? first.cpu + "%" : "нет данных";
        $("memory").textContent = first ? first.memoryMb + " MB" : "нет данных";
        $("uptime").textContent = first ? formatMs(first.pmUptime) : "нет данных";
        $("nodeStatus").textContent = data.node;
        $("envStatus").textContent = data.env.map((item) => item.name + ": " + (item.present ? "ok" : "нет")).join(", ");
      } catch (error) {
        $("pm2Status").innerHTML = '<span class="pill offline">ошибка</span>';
        output.textContent = error.message;
      }
    }

    async function loadLogs() {
      try {
        const data = await requestJson("/api/logs");
        logs.textContent = data.output || "Логов пока нет.";
      } catch (error) {
        logs.textContent = error.message;
      }
    }

    async function runAction(action) {
      setBusy(true);
      $("lastAction").textContent = action;
      output.textContent = "Выполняю...";

      try {
        const data = await requestJson("/api/action", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ action })
        });
        output.textContent = data.output || "Готово.";
      } catch (error) {
        output.textContent = error.message;
      } finally {
        setBusy(false);
        await loadStatus();
        await loadLogs();
      }
    }

    buttons.forEach((button) => {
      button.addEventListener("click", () => runAction(button.dataset.action));
    });

    $("refreshButton").addEventListener("click", async () => {
      await loadStatus();
      await loadLogs();
    });

    setBusy(false);
    loadStatus();
    loadLogs();
    setInterval(loadStatus, 5000);
    setInterval(loadLogs, 3000);
  </script>
</body>
</html>`;
}

function json(res, statusCode, data) {
  const body = JSON.stringify(data);
  res.writeHead(statusCode, {
    "content-type": "application/json; charset=utf-8",
    "cache-control": "no-store"
  });
  res.end(body);
}

function text(res, statusCode, body, contentType = "text/plain; charset=utf-8") {
  res.writeHead(statusCode, {
    "content-type": contentType,
    "cache-control": "no-store"
  });
  res.end(body);
}

async function run(command, timeout = 120_000) {
  const { stdout, stderr } = await execAsync(command, {
    cwd,
    timeout,
    windowsHide: true,
    maxBuffer: 1024 * 1024 * 8
  });

  return `${stdout || ""}${stderr || ""}`.trim();
}

async function getPm2List() {
  const output = await run("pm2 jlist");
  const list = JSON.parse(output || "[]");

  return list
    .filter((item) => item.name === BOT_NAME)
    .map((item) => ({
      id: item.pm_id,
      name: item.name,
      status: item.pm2_env?.status || "unknown",
      cpu: item.monit?.cpu ?? 0,
      memoryMb: Math.round((item.monit?.memory || 0) / 1024 / 1024),
      pmUptime: item.pm2_env?.pm_uptime || null,
      restarts: item.pm2_env?.restart_time || 0
    }));
}

async function readEnvStatus() {
  const envPath = resolve(cwd, ".env");
  const raw = await readFile(envPath, "utf8").catch(() => "");

  return ["DISCORD_TOKEN", "DISCORD_CLIENT_ID", "GUILD_ID", "YOUTUBE_COOKIE"].map((name) => ({
    name,
    present: new RegExp(`^${name}=.+`, "m").test(raw)
  }));
}

async function actionCommand(action) {
  switch (action) {
    case "start": {
      const processes = await getPm2List();
      return processes.length > 0
        ? run(`pm2 start ${BOT_NAME}`)
        : run(`pm2 start src/index.js --name ${BOT_NAME}`);
    }
    case "restart": {
      const processes = await getPm2List();
      return processes.length > 0
        ? run(`pm2 restart ${BOT_NAME}`)
        : run(`pm2 start src/index.js --name ${BOT_NAME}`);
    }
    case "stop": {
      const processes = await getPm2List();
      return processes.length > 0 ? run(`pm2 stop ${BOT_NAME}`) : "Бот не найден в PM2.";
    }
    case "save":
      return run("pm2 save");
    case "deploy":
      return run("npm run deploy", 180_000);
    case "install":
      return run("npm install", 600_000);
    case "update":
      return run("npm update", 600_000);
    case "flush":
      return run(`pm2 flush ${BOT_NAME}`);
    case "repair":
      return run(`npm install && pm2 restart ${BOT_NAME} && pm2 save`, 600_000);
    case "dedupe": {
      const processes = await getPm2List();
      if (processes.length <= 1) return "Дубликатов нет.";

      const [keep, ...duplicates] = processes.sort((a, b) => a.id - b.id);
      const deleted = [];

      for (const item of duplicates) {
        await run(`pm2 delete ${item.id}`);
        deleted.push(item.id);
      }

      return `Оставил ${BOT_NAME} id ${keep.id}. Удалил дубликаты: ${deleted.join(", ")}.`;
    }
    default:
      throw new Error("Unknown action");
  }
}

async function readBody(req) {
  const chunks = [];

  for await (const chunk of req) {
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

const server = createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${HOST}:${PORT}`);

    if (req.method === "GET" && url.pathname === "/") {
      text(res, 200, html(), "text/html; charset=utf-8");
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/status") {
      const [processes, env] = await Promise.all([getPm2List(), readEnvStatus()]);
      json(res, 200, {
        botName: BOT_NAME,
        node: process.version,
        processes,
        env
      });
      return;
    }

    if (req.method === "GET" && url.pathname === "/api/logs") {
      const output = await run(`pm2 logs ${BOT_NAME} --lines 250 --nostream --raw`).catch((error) => error.message);
      json(res, 200, { output });
      return;
    }

    if (req.method === "POST" && url.pathname === "/api/action") {
      const body = await readBody(req);
      const action = String(body.action || "");

      if (!actionLabels[action]) {
        json(res, 400, { error: "Unknown action" });
        return;
      }

      const output = await actionCommand(action);
      json(res, 200, { action, output });
      return;
    }

    json(res, 404, { error: "Not found" });
  } catch (error) {
    json(res, 500, { error: error.message });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Bot panel: http://${HOST}:${PORT}`);
});
