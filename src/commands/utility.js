import { EmbedBuilder, SlashCommandBuilder } from "discord.js";

export const pingCommand = {
  data: new SlashCommandBuilder()
    .setName("ping")
    .setDescription("Проверить, что бот онлайн."),
  async execute(interaction) {
    await interaction.reply(`Pong: ${interaction.client.ws.ping}ms`);
  }
};

export const helpCommand = {
  data: new SlashCommandBuilder()
    .setName("help")
    .setDescription("Показать список команд бота."),
  async execute(interaction) {
    const embed = new EmbedBuilder()
      .setColor(0x2f80ed)
      .setTitle("Команды бота")
      .addFields(
        {
          name: "Модерация",
          value:
            "`/ban`, `/kick`, `/mute`, `/unmute`, `/clear`\nНужны права модератора и роль бота выше цели."
        },
        {
          name: "Музыка",
          value:
            "`/play`, `/pause`, `/resume`, `/skip`, `/stop`, `/queue`, `/nowplaying`, `/controls`\nДля `/play` зайди в голосовой канал и укажи название или YouTube-ссылку."
        }
      );

    await interaction.reply({ embeds: [embed] });
  }
};
