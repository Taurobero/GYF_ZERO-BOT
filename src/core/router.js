import { getSenderJid, isBotGroupAdmin, isGroupAdmin } from './permissions.js';
import { extractMessageText, parseCommand, unwrapMessage } from './text.js';

export function createCommandRegistry(commands) {
  const registry = new Map();
  for (const command of commands) {
    for (const name of [command.name, ...(command.aliases ?? [])]) {
      if (registry.has(name)) throw new Error(`Comando duplicado: ${name}`);
      registry.set(name, command);
    }
  }
  return registry;
}

export function createMessageHandler({ sock, config, store, antiSpam, commands, logger }) {
  const registry = createCommandRegistry(commands);
  const warnings = new Map();

  return async function handleMessages(event) {
    if (event.type !== 'notify') return;
    for (const rawMessage of event.messages) {
      if (rawMessage.key.fromMe || !rawMessage.key.remoteJid) continue;
      const chat = rawMessage.key.remoteJid;
      if (chat === 'status@broadcast' || chat.endsWith('@broadcast') || chat.endsWith('@newsletter')) continue;

      const message = { ...rawMessage, message: unwrapMessage(rawMessage) };
      const sender = getSenderJid(message);
      if (!sender) continue;
      const isOwner = config.owners.includes(sender);
      if (!isOwner && config.antiSpam.enabled) {
        const result = antiSpam.check(`${chat}:${sender}`);
        if (!result.allowed) {
          const lastWarning = warnings.get(`${chat}:${sender}`) ?? 0;
          if (Date.now() - lastWarning > 60_000) {
            if (warnings.size >= 1_000) warnings.delete(warnings.keys().next().value);
            warnings.set(`${chat}:${sender}`, Date.now());
            await sock.sendMessage(chat, { text: 'Límite temporal de mensajes alcanzado.' });
          }
          continue;
        }
      }

      const parsed = parseCommand(extractMessageText(message), config.prefix);
      if (!parsed) continue;
      const command = registry.get(parsed.name);
      if (!command) continue;

      const isGroup = chat.endsWith('@g.us');
      const context = {
        sock,
        config,
        store,
        antiSpam,
        logger,
        message,
        chat,
        sender,
        args: parsed.args,
        prefix: config.prefix,
        isGroup,
        isOwner,
        commandList: [...new Set(registry.values())],
        reply: (text) => sock.sendMessage(chat, { text: String(text) }, { quoted: message }),
      };

      if (command.permission === 'owner' && !isOwner) {
        await context.reply('Este comando está reservado al propietario.');
        continue;
      }
      if (store.getSetting?.('maintenanceEnabled', false) && !isOwner) {
        await context.reply('El bot está en mantenimiento temporal.');
        continue;
      }
      if (command.permission === 'admin') {
        if (!isGroup) {
          await context.reply('Este comando solo funciona en grupos.');
          continue;
        }
        try {
          const metadata = await sock.groupMetadata(chat);
          const botJid = sock.user?.id?.replace(/:\d+(?=@)/u, '') ?? '';
          context.isAdmin = isOwner || isGroupAdmin(metadata, sender);
          context.isBotAdmin = isBotGroupAdmin(metadata, botJid);
          if (!context.isAdmin) {
            await context.reply('Solo un administrador del grupo puede usar este comando.');
            continue;
          }
          if (!context.isBotAdmin) {
            await context.reply('Necesito ser administrador del grupo para hacerlo.');
            continue;
          }
        } catch (error) {
          logger.warn({ err: error, chat }, 'No se pudo comprobar el rol de grupo');
          await context.reply('No pude verificar los permisos del grupo.');
          continue;
        }
      }

      try {
        await command.execute(context);
      } catch (error) {
        logger.error({ err: error, command: command.name, chat }, 'Falló un comando');
        await context.reply(error.message || 'No se pudo completar el comando.');
      }
    }
  };
}