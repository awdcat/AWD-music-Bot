import "dotenv/config";
import { REST, Routes } from "discord.js";
import { commandPayload } from "./commands/index.js";
import { readEnv } from "./env.js";

const { token, clientId, guildId } = readEnv();
const rest = new REST({ version: "10" }).setToken(token);

const route = guildId
  ? Routes.applicationGuildCommands(clientId, guildId)
  : Routes.applicationCommands(clientId);

console.log(`Registering ${commandPayload.length} slash commands...`);

await rest.put(route, { body: commandPayload });

console.log(
  guildId
    ? "Commands registered for your server. They should appear almost immediately."
    : "Global commands registered. Discord can take up to 1 hour to show them everywhere."
);
