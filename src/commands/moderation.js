import {
  EmbedBuilder,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder
} from "discord.js";

function moderationEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(0x27ae60)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function deny(content) {
  return { content, flags: MessageFlags.Ephemeral };
}

async function canModerateMember(interaction, targetMember) {
  if (!targetMember) {
    return "Пользователь не найден на этом сервере.";
  }

  if (targetMember.id === interaction.user.id) {
    return "Нельзя применить эту команду к самому себе.";
  }

  if (targetMember.id === interaction.client.user.id) {
    return "Нельзя применить эту команду к боту.";
  }

  const moderatorMember = await interaction.guild.members.fetch(interaction.user.id);

  if (
    interaction.guild.ownerId !== interaction.user.id &&
    moderatorMember.roles.highest.comparePositionTo(targetMember.roles.highest) <= 0
  ) {
    return "Твоя роль должна быть выше роли пользователя.";
  }

  return null;
}

function withModerator(reason, interaction) {
  const cleanReason = reason?.trim() || "Причина не указана";
  return `${cleanReason} | Moderator: ${interaction.user.tag}`;
}

export const banCommand = {
  data: new SlashCommandBuilder()
    .setName("ban")
    .setDescription("Забанить пользователя.")
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Кого забанить.").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Причина бана.").setMaxLength(512)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const reason = interaction.options.getString("reason");
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);

    if (member) {
      const problem = await canModerateMember(interaction, member);
      if (problem) return interaction.reply(deny(problem));

      if (!member.bannable) {
        return interaction.reply(deny("У бота нет прав забанить этого пользователя."));
      }
    }

    await interaction.guild.members.ban(user.id, {
      reason: withModerator(reason, interaction)
    });

    await interaction.reply({
      embeds: [
        moderationEmbed("Пользователь забанен", `${user} забанен.\nПричина: ${reason || "не указана"}`)
      ]
    });
  }
};

export const kickCommand = {
  data: new SlashCommandBuilder()
    .setName("kick")
    .setDescription("Кикнуть пользователя с сервера.")
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Кого кикнуть.").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Причина кика.").setMaxLength(512)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const reason = interaction.options.getString("reason");
    const problem = await canModerateMember(interaction, member);

    if (problem) return interaction.reply(deny(problem));

    if (!member.kickable) {
      return interaction.reply(deny("У бота нет прав кикнуть этого пользователя."));
    }

    await member.kick(withModerator(reason, interaction));

    await interaction.reply({
      embeds: [
        moderationEmbed(
          "Пользователь кикнут",
          `${member.user} кикнут.\nПричина: ${reason || "не указана"}`
        )
      ]
    });
  }
};

export const muteCommand = {
  data: new SlashCommandBuilder()
    .setName("mute")
    .setDescription("Выдать таймаут пользователю.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("Кого замутить.").setRequired(true)
    )
    .addIntegerOption((option) =>
      option
        .setName("minutes")
        .setDescription("Длительность мута в минутах.")
        .setMinValue(1)
        .setMaxValue(40320)
        .setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Причина мута.").setMaxLength(512)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const minutes = interaction.options.getInteger("minutes", true);
    const reason = interaction.options.getString("reason");
    const problem = await canModerateMember(interaction, member);

    if (problem) return interaction.reply(deny(problem));

    if (!member.moderatable) {
      return interaction.reply(deny("У бота нет прав замутить этого пользователя."));
    }

    await member.timeout(minutes * 60_000, withModerator(reason, interaction));

    await interaction.reply({
      embeds: [
        moderationEmbed(
          "Пользователь замучен",
          `${member.user} получил таймаут на ${minutes} мин.\nПричина: ${reason || "не указана"}`
        )
      ]
    });
  }
};

export const unmuteCommand = {
  data: new SlashCommandBuilder()
    .setName("unmute")
    .setDescription("Снять таймаут с пользователя.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((option) =>
      option.setName("user").setDescription("С кого снять мут.").setRequired(true)
    )
    .addStringOption((option) =>
      option.setName("reason").setDescription("Причина размута.").setMaxLength(512)
    ),
  async execute(interaction) {
    const user = interaction.options.getUser("user", true);
    const member = await interaction.guild.members.fetch(user.id).catch(() => null);
    const reason = interaction.options.getString("reason");
    const problem = await canModerateMember(interaction, member);

    if (problem) return interaction.reply(deny(problem));

    if (!member.moderatable) {
      return interaction.reply(deny("У бота нет прав размутить этого пользователя."));
    }

    await member.timeout(null, withModerator(reason, interaction));

    await interaction.reply({
      embeds: [
        moderationEmbed(
          "Пользователь размучен",
          `${member.user} снова может писать и говорить.\nПричина: ${reason || "не указана"}`
        )
      ]
    });
  }
};

export const clearCommand = {
  data: new SlashCommandBuilder()
    .setName("clear")
    .setDescription("Удалить последние сообщения в канале.")
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((option) =>
      option
        .setName("amount")
        .setDescription("Сколько сообщений удалить, от 1 до 100.")
        .setMinValue(1)
        .setMaxValue(100)
        .setRequired(true)
    ),
  async execute(interaction) {
    const amount = interaction.options.getInteger("amount", true);

    if (!interaction.channel?.bulkDelete) {
      return interaction.reply(deny("В этом канале нельзя массово удалять сообщения."));
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });
    const deleted = await interaction.channel.bulkDelete(amount, true);

    await interaction.editReply(`Удалено сообщений: ${deleted.size}. Старые сообщения старше 14 дней Discord не удаляет массово.`);
  }
};
