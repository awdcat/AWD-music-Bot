import { helpCommand, pingCommand } from "./utility.js";
import {
  banCommand,
  clearCommand,
  kickCommand,
  muteCommand,
  unmuteCommand
} from "./moderation.js";
import {
  controlsCommand,
  nowPlayingCommand,
  pauseCommand,
  playCommand,
  queueCommand,
  resumeCommand,
  skipCommand,
  stopCommand
} from "./music.js";

export const commands = [
  pingCommand,
  helpCommand,
  banCommand,
  kickCommand,
  muteCommand,
  unmuteCommand,
  clearCommand,
  playCommand,
  pauseCommand,
  resumeCommand,
  skipCommand,
  stopCommand,
  queueCommand,
  nowPlayingCommand,
  controlsCommand
];

export const commandPayload = commands.map((command) => command.data.toJSON());
