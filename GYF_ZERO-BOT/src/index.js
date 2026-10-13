import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import pino from 'pino';
import qrcode from 'qrcode-terminal';
import { config } from './config.js';
import { commands } from './commands/index.js';
import { AntiSpam } from './core/anti-spam.js';
import { createMessageHandler } from './core/router.js';
import { createStore, loadStore } from './core/store.js';

const logger = pino({ level: config.logLevel });
const antiSpam = new AntiSpam({ limit: config.antiSpam.limit, windowMs: config.antiSpam.windowMs });
const persistedState = await loadStore(config.dataFile);
if (typeof persistedState.settings.antiSpamEnabled === 'boolean') {
  config.antiSpam.enabled = persistedState.settings.antiSpamEnabled;
}
const store = createStore(config.dataFile, persistedState);
let socket;
let reconnectTimer;
let reconnectAttempts = 0;
let stopping = false;

function scheduleReconnect() {
  if (stopping || reconnectTimer) return;
  reconnectAttempts += 1;
  const delay = Math.min(1_000 * (2 ** Math.min(reconnectAttempts - 1, 6)), 60_000);
  logger.info({ delay }, 'Reintentando conexión');
  reconnectTimer = setTimeout(() => {
    reconnectTimer = undefined;
    connect().catch((error) => {
      logger.error({ err: error }, 'No se pudo iniciar la conexión');
      scheduleReconnect();
    });
  }, delay);
  reconnectTimer.unref();
}

async function connect() {
  const { state, saveCreds } = await useMultiFileAuthState(config.authDir);
  socket = makeWASocket({
    auth: state,
    logger: logger.child({ component: 'baileys' }),
    markOnlineOnConnect: false,
    syncFullHistory: false,
    connectTimeoutMs: 30_000,
    keepAliveIntervalMs: 30_000,
  });

  socket.ev.on('creds.update', saveCreds);
  socket.ev.on('connection.update', ({ connection, lastDisconnect, qr }) => {
    if (qr) {
      logger.info('Escanea este QR desde WhatsApp > Dispositivos vinculados.');
      qrcode.generate(qr, { small: true });
    }
    if (connection === 'open') {
      reconnectAttempts = 0;
      logger.info({ user: socket.user?.id }, `${config.name} conectado`);
    }
    if (connection === 'close') {
      const statusCode = lastDisconnect?.error?.output?.statusCode;
      if (statusCode === DisconnectReason.loggedOut) {
        logger.error('Sesión cerrada desde WhatsApp. Borra AUTH_DIR y vuelve a vincular el dispositivo.');
        return;
      }
      scheduleReconnect();
    }
  });

  const handleMessages = createMessageHandler({ sock: socket, config, store, antiSpam, commands, logger });
  socket.ev.on('messages.upsert', (event) => {
    handleMessages(event).catch((error) => logger.error({ err: error }, 'Falló el procesamiento de mensajes'));
  });
  socket.ev.on('group-participants.update', async ({ id, participants, action }) => {
    if (action !== 'add' || !store.isWelcomeEnabled(id)) return;
    const mentions = participants.map((participant) => participant.id);
    if (!mentions.length) return;
    const text = mentions.map((jid) => `Bienvenido/a @${jid.split('@')[0]}`).join('\n');
    try {
      await socket.sendMessage(id, { text, mentions });
    } catch (error) {
      logger.warn({ err: error, group: id }, 'No se pudo enviar la bienvenida');
    }
  });
}

async function stop(signal) {
  if (stopping) return;
  stopping = true;
  clearTimeout(reconnectTimer);
  logger.info({ signal }, 'Guardando estado y cerrando');
  try {
    await store.save();
  } catch (error) {
    logger.error({ err: error }, 'No se pudo guardar el estado');
  }
  socket?.end(new Error(`Cierre por ${signal}`));
}

process.once('SIGINT', () => { void stop('SIGINT'); });
process.once('SIGTERM', () => { void stop('SIGTERM'); });

connect().catch((error) => {
  logger.error({ err: error }, 'No se pudo iniciar el bot');
  process.exitCode = 1;
});