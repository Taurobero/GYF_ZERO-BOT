import { utilityCommands } from './utilities.js';
import { groupCommands } from './groups.js';
import { mediaCommands } from './media.js';
import { integrationCommands } from './integrations.js';
import { ownerCommands } from './owner.js';

export const commands = [
  ...utilityCommands,
  ...groupCommands,
  ...mediaCommands,
  ...integrationCommands,
  ...ownerCommands,
];