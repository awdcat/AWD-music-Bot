import express from 'express';

const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.send('Bot is alive!');
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
import "dotenv/config";
import ffmpegPath from "ffmpeg-static";
import {
  ActivityType,
  Client,
  Collection,
  Events,
  GatewayIntentBits,
  MessageFlags
} from "discord.js";
import { DefaultExtractors } from "@discord-player/extractor";
import { Player } from "discord-player";
import { YoutubeExtractor } from "discord-player-youtubei";
import { commands } from "./commands/index.js";
import { buildNowPlayingMessage, handleMusicButton } from "./commands/music.js";
import { readEnv } from "./env.js";

if (ffmpegPath) {
  process.env.FFMPEG_PATH = ffmpegPath;
}

const { token, youtubeCookie } = readEnv({ requireClientId: false });

const client = new Client({
  intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

client.commands = new Collection(
  commands.map((command) => [command.data.name, command])
);

const player = new Player(client, {
  ffmpegPath,
  connectionTimeout: 30_000,
  probeTimeout: 15_000
});

async function loadExtractors() {
  const youtubeOptions = {
    ignoreSignInErrors: true,
    streamOptions: {
      useClient: "WEB",
      highWaterMark: 1 << 25
    }
  };

  if (youtubeCookie) {
    youtubeOptions.cookie = youtubeCookie;
  }

  await player.extractors.register(YoutubeExtractor, youtubeOptions);

  await player.extractors.loadMulti(DefaultExtractors);
}

player.on("debug", (message) => {
  console.log(`[Player] ${message}`);
});

player.events.on("debug", (queue, message) => {
  console.log(`[Queue ${queue.guild.id}] ${message}`);
});

player.events.on("playerStart", (queue, track) => {
  queue.metadata?.send?.(buildNowPlayingMessage(track)).catch(console.error);
});

player.events.on("audioTrackAdd", (queue, track) => {
  queue.metadata?.send?.(`В очередь добавлен трек: **${track.title}**`).catch(console.error);
});

player.events.on("emptyQueue", (queue) => {
  queue.metadata?.send?.("Очередь закончилась.").catch(console.error);
});

player.events.on("playerError", (queue, error) => {
  console.error("Player error:", error);
  queue.metadata
    ?.send?.(`Не получилось проиграть трек: ${error.message}`)
    .catch(console.error);
});

player.events.on("error", (queue, error) => {
  console.error("Queue error:", error);
  queue.metadata
    ?.send?.(`Ошибка очереди: ${error.message}`)
    .catch(console.error);
});

player.events.on("playerSkip", (queue, track, reason, description) => {
  console.warn("Track skipped:", reason, description);
  queue.metadata
    ?.send?.(`Трек пропущен: **${track.title}**\n${description || reason}`)
    .catch(console.error);
});

client.once(Events.ClientReady, (readyClient) => {
  console.log(`Logged in as ${readyClient.user.tag}`);
  readyClient.user.setActivity("/play", { type: ActivityType.Listening });
});

client.on(Events.InteractionCreate, async (interaction) => {
  if (!interaction.inGuild()) return;

  if (interaction.isButton() && interaction.customId.startsWith("music:")) {
    try {
      await player.context.provide(
        { guild: interaction.guild },
        () => handleMusicButton(interaction)
      );
    } catch (error) {
      console.error(`Button ${interaction.customId} failed:`, error);

      const payload = {
        content: "Кнопка упала с ошибкой. Проверь консоль бота.",
        flags: MessageFlags.Ephemeral
      };

      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(console.error);
      } else {
        await interaction.reply(payload).catch(console.error);
      }
    }

    return;
  }

  if (!interaction.isChatInputCommand()) return;

  const command = client.commands.get(interaction.commandName);
  if (!command) return;

  try {
    await player.context.provide(
      { guild: interaction.guild },
      () => command.execute(interaction)
    );
  } catch (error) {
    console.error(`Command /${interaction.commandName} failed:`, error);

    const payload = {
      content: "Команда упала с ошибкой. Проверь консоль бота.",
      flags: MessageFlags.Ephemeral
    };

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp(payload).catch(console.error);
    } else {
      await interaction.reply(payload).catch(console.error);
    }
  }
});

await loadExtractors();
await client.login(token);
