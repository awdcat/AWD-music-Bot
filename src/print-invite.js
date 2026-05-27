import "dotenv/config";
import { PermissionFlagsBits } from "discord.js";
import { readEnv } from "./env.js";

const { clientId } = readEnv({ requireToken: false });

const permissions =
  PermissionFlagsBits.ViewChannel |
  PermissionFlagsBits.SendMessages |
  PermissionFlagsBits.KickMembers |
  PermissionFlagsBits.BanMembers |
  PermissionFlagsBits.ModerateMembers |
  PermissionFlagsBits.ManageMessages |
  PermissionFlagsBits.Connect |
  PermissionFlagsBits.Speak;

const params = new URLSearchParams({
  client_id: clientId,
  permissions: permissions.toString(),
  scope: "bot applications.commands"
});

console.log(`https://discord.com/oauth2/authorize?${params.toString()}`);
