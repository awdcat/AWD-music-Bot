import {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  MessageFlags,
  PermissionsBitField,
  SlashCommandBuilder
} from "discord.js";
import { QueryType, useMainPlayer, useQueue } from "discord-player";

function privateReply(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

const MUSIC_ACTIONS = {
  pause: "music:pause",
  resume: "music:resume",
  skip: "music:skip",
  stop: "music:stop",
  queue: "music:queue"
};

function isUrl(value) {
  return /^https?:\/\//i.test(value);
}

function withTimeout(promise, ms, message) {
  let timeout;

  const timeoutPromise = new Promise((_, reject) => {
    timeout = setTimeout(() => reject(new Error(message)), ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timeout));
}

async function getVoiceChannel(interaction) {
  const voiceChannel = interaction.member?.voice?.channel;

  if (!voiceChannel) {
    return {
      error: "Сначала зайди в голосовой канал, потом используй музыкальную команду."
    };
  }

  const me = interaction.guild.members.me ?? (await interaction.guild.members.fetchMe());
  const permissions = voiceChannel.permissionsFor(me);

  if (!permissions?.has(PermissionsBitField.Flags.Connect)) {
    return { error: "У бота нет права Connect в твоем голосовом канале." };
  }

  if (!permissions?.has(PermissionsBitField.Flags.Speak)) {
    return { error: "У бота нет права Speak в твоем голосовом канале." };
  }

  if (me.voice.channelId && me.voice.channelId !== voiceChannel.id) {
    return { error: "Бот уже играет в другом голосовом канале." };
  }

  return { voiceChannel };
}

function currentTrack(queue) {
  return queue?.currentTrack ?? queue?.current ?? null;
}

function tracksArray(queue) {
  if (!queue?.tracks) return [];
  if (Array.isArray(queue.tracks)) return queue.tracks;
  if (typeof queue.tracks.toArray === "function") return queue.tracks.toArray();
  if (Array.isArray(queue.tracks.data)) return queue.tracks.data;
  if (typeof queue.tracks.slice === "function") return queue.tracks.slice(0);
  return [];
}

function trackLabel(track) {
  const title = track?.title ?? track?.name ?? "Без названия";
  const author = track?.author ? ` - ${track.author}` : "";
  return `${title}${author}`;
}

function hasCurrentTrack(queue) {
  return Boolean(currentTrack(queue));
}

function queueLines(queue) {
  const current = currentTrack(queue);
  const upcoming = tracksArray(queue).slice(0, 10);
  const lines = [];

  if (current) lines.push(`Сейчас играет: **${trackLabel(current)}**`);
  if (upcoming.length > 0) {
    lines.push("");
    lines.push(
      ...upcoming.map((track, index) => `${index + 1}. ${trackLabel(track)}`)
    );
  }

  return lines;
}

export function musicControlsRow() {
  return new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(MUSIC_ACTIONS.pause)
      .setLabel("Пауза")
      .setStyle(ButtonStyle.Secondary),
    new ButtonBuilder()
      .setCustomId(MUSIC_ACTIONS.resume)
      .setLabel("Играть")
      .setStyle(ButtonStyle.Success),
    new ButtonBuilder()
      .setCustomId(MUSIC_ACTIONS.skip)
      .setLabel("Скип")
      .setStyle(ButtonStyle.Primary),
    new ButtonBuilder()
      .setCustomId(MUSIC_ACTIONS.stop)
      .setLabel("Стоп")
      .setStyle(ButtonStyle.Danger),
    new ButtonBuilder()
      .setCustomId(MUSIC_ACTIONS.queue)
      .setLabel("Очередь")
      .setStyle(ButtonStyle.Secondary)
  );
}

export function buildNowPlayingMessage(track) {
  const embed = new EmbedBuilder()
    .setColor(0x9b51e0)
    .setTitle("Сейчас играет")
    .setDescription(track.url ? `[${trackLabel(track)}](${track.url})` : trackLabel(track))
    .addFields(
      { name: "Длительность", value: track.duration || "неизвестно", inline: true },
      { name: "Автор", value: track.author || "неизвестно", inline: true }
    );

  return { embeds: [embed], components: [musicControlsRow()] };
}

export const playCommand = {
  data: new SlashCommandBuilder()
    .setName("play")
    .setDescription("Включить музыку из YouTube или YouTube Music.")
    .addStringOption((option) =>
      option
        .setName("query")
        .setDescription("Название трека или ссылка YouTube.")
        .setRequired(true)
    ),
  async execute(interaction) {
    const { voiceChannel, error } = await getVoiceChannel(interaction);
    if (error) return interaction.reply(privateReply(error));

    const query = interaction.options.getString("query", true);
    const player = useMainPlayer();

    await interaction.deferReply();

    let result;

    try {
      result = await withTimeout(
        player.play(voiceChannel, query, {
          requestedBy: interaction.user,
          searchEngine: isUrl(query) ? QueryType.AUTO : QueryType.YOUTUBE_SEARCH,
          nodeOptions: {
            metadata: interaction.channel,
            leaveOnEmpty: true,
            leaveOnEmptyCooldown: 60_000,
            leaveOnEnd: true,
            leaveOnEndCooldown: 60_000,
            leaveOnStop: true,
            selfDeaf: true,
            bufferingTimeout: 15_000
          }
        }),
        45_000,
        "YouTube долго не отдает аудио-поток. Попробуй ссылку на другой трек или добавь YOUTUBE_COOKIE."
      );
    } catch (error) {
      if (!player.nodes.get(interaction.guild)?.isPlaying()) {
        player.nodes.delete(interaction.guild);
      }

      await interaction.editReply(
        `Не получилось включить музыку: ${error.message}\nПроверь PowerShell, там теперь будут подробные логи.`
      );
      return;
    }

    const track = result.track;
    const embed = new EmbedBuilder()
      .setColor(0x9b51e0)
      .setTitle("Добавлено в очередь")
      .setDescription(`[${track.title}](${track.url})`)
      .addFields(
        { name: "Длительность", value: track.duration || "неизвестно", inline: true },
        { name: "Канал", value: voiceChannel.toString(), inline: true }
      );

    await interaction.editReply({ embeds: [embed], components: [musicControlsRow()] });
  }
};

export const pauseCommand = {
  data: new SlashCommandBuilder()
    .setName("pause")
    .setDescription("Поставить музыку на паузу."),
  async execute(interaction) {
    const { error } = await getVoiceChannel(interaction);
    if (error) return interaction.reply(privateReply(error));

    const queue = useQueue();

    if (!queue || !hasCurrentTrack(queue)) {
      return interaction.reply(privateReply("Сейчас ничего не играет."));
    }

    if (queue.node.isPaused()) {
      return interaction.reply(privateReply("Музыка уже на паузе."));
    }

    queue.node.pause();
    await interaction.reply("Пауза включена.");
  }
};

export const resumeCommand = {
  data: new SlashCommandBuilder()
    .setName("resume")
    .setDescription("Продолжить музыку после паузы."),
  async execute(interaction) {
    const { error } = await getVoiceChannel(interaction);
    if (error) return interaction.reply(privateReply(error));

    const queue = useQueue();

    if (!queue || !hasCurrentTrack(queue)) {
      return interaction.reply(privateReply("Сейчас ничего не играет."));
    }

    if (!queue.node.isPaused()) {
      return interaction.reply(privateReply("Музыка уже играет."));
    }

    queue.node.resume();
    await interaction.reply("Музыка продолжена.");
  }
};

export const skipCommand = {
  data: new SlashCommandBuilder()
    .setName("skip")
    .setDescription("Пропустить текущий трек."),
  async execute(interaction) {
    const { error } = await getVoiceChannel(interaction);
    if (error) return interaction.reply(privateReply(error));

    const queue = useQueue();

    if (!queue || !hasCurrentTrack(queue)) {
      return interaction.reply(privateReply("Сейчас ничего не играет."));
    }

    queue.node.skip();
    await interaction.reply("Трек пропущен.");
  }
};

export const stopCommand = {
  data: new SlashCommandBuilder()
    .setName("stop")
    .setDescription("Остановить музыку и очистить очередь."),
  async execute(interaction) {
    const { error } = await getVoiceChannel(interaction);
    if (error) return interaction.reply(privateReply(error));

    const queue = useQueue();

    if (!queue) {
      return interaction.reply(privateReply("Очередь уже пустая."));
    }

    queue.delete();
    await interaction.reply("Музыка остановлена, очередь очищена.");
  }
};

export const controlsCommand = {
  data: new SlashCommandBuilder()
    .setName("controls")
    .setDescription("Показать кнопки управления музыкой."),
  async execute(interaction) {
    const queue = useQueue();
    const current = currentTrack(queue);

    if (!current) {
      return interaction.reply(privateReply("Сейчас ничего не играет."));
    }

    await interaction.reply(buildNowPlayingMessage(current));
  }
};

export const queueCommand = {
  data: new SlashCommandBuilder()
    .setName("queue")
    .setDescription("Показать текущую очередь."),
  async execute(interaction) {
    const queue = useQueue();

    if (!queue) {
      return interaction.reply(privateReply("Очередь пустая."));
    }

    const lines = queueLines(queue);

    await interaction.reply(lines.join("\n") || "Очередь пустая.");
  }
};

export const nowPlayingCommand = {
  data: new SlashCommandBuilder()
    .setName("nowplaying")
    .setDescription("Показать текущий трек."),
  async execute(interaction) {
    const queue = useQueue();
    const current = currentTrack(queue);

    if (!current) {
      return interaction.reply(privateReply("Сейчас ничего не играет."));
    }

    await interaction.reply(buildNowPlayingMessage(current));
  }
};

export async function handleMusicButton(interaction) {
  if (!Object.values(MUSIC_ACTIONS).includes(interaction.customId)) {
    return false;
  }

  const { error } = await getVoiceChannel(interaction);
  if (error) {
    await interaction.reply(privateReply(error));
    return true;
  }

  const queue = useQueue();

  if (!queue || !hasCurrentTrack(queue)) {
    await interaction.reply(privateReply("Сейчас ничего не играет."));
    return true;
  }

  switch (interaction.customId) {
    case MUSIC_ACTIONS.pause: {
      if (queue.node.isPaused()) {
        await interaction.reply(privateReply("Музыка уже на паузе."));
        return true;
      }

      queue.node.pause();
      await interaction.reply(privateReply("Пауза включена."));
      return true;
    }

    case MUSIC_ACTIONS.resume: {
      if (!queue.node.isPaused()) {
        await interaction.reply(privateReply("Музыка уже играет."));
        return true;
      }

      queue.node.resume();
      await interaction.reply(privateReply("Музыка продолжена."));
      return true;
    }

    case MUSIC_ACTIONS.skip: {
      queue.node.skip();
      await interaction.reply(privateReply("Трек пропущен."));
      return true;
    }

    case MUSIC_ACTIONS.stop: {
      queue.delete();
      await interaction.reply(privateReply("Музыка остановлена, очередь очищена."));
      return true;
    }

    case MUSIC_ACTIONS.queue: {
      const lines = queueLines(queue);
      await interaction.reply(privateReply(lines.join("\n") || "Очередь пустая."));
      return true;
    }

    default:
      return false;
  }
}
