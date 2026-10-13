import test from 'node:test';
import assert from 'node:assert/strict';
import { createCommandRegistry, createMessageHandler } from '../src/core/router.js';
import { ownerCommands } from '../src/commands/owner.js';

const logger = { error() {}, warn() {} };

function setup(overrides = {}) {
  const sent = [];
  let antiSpamChecks = 0;
  const antiSpam = {
    check() {
      antiSpamChecks += 1;
      return { allowed: true };
    },
    clear() {},
  };
  const sock = {
    user: { id: '999@s.whatsapp.net' },
    async sendMessage(...args) { sent.push(args); },
    async groupMetadata() {
      return { participants: [
        { id: '1@s.whatsapp.net', admin: 'admin' },
        { id: '999@s.whatsapp.net', admin: 'admin' },
      ] };
    },
    async groupParticipantsUpdate() {},
    ...overrides.sock,
  };
  const config = {
    name: 'TAUROBERO BOT', prefix: '!', owners: [],
    antiSpam: { enabled: false },
    ai: {}, downloads: {},
    ...overrides.config,
  };
  const commands = overrides.commands ?? [{ name: 'ping', aliases: ['p'], description: 'test', async execute(ctx) { await ctx.reply('pong'); } }];
  return {
    sent,
    sock,
    antiSpamChecks: () => antiSpamChecks,
    handler: createMessageHandler({ sock, config, store: overrides.store ?? {}, antiSpam, commands, logger }),
  };
}

test('registra comandos y aliases, rechaza nombres duplicados', () => {
  const registry = createCommandRegistry([{ name: 'ping', aliases: ['p'] }]);
  assert.equal(registry.get('p').name, 'ping');
  assert.throws(() => createCommandRegistry([{ name: 'x' }, { name: 'x' }]), /duplicado/u);
});

test('ignora historial, mensajes propios y texto que no es comando', async () => {
  const state = setup();
  await state.handler({ type: 'append', messages: [{ key: { remoteJid: '1@s.whatsapp.net' }, message: { conversation: '!ping' } }] });
  await state.handler({ type: 'notify', messages: [
    { key: { remoteJid: '1@s.whatsapp.net', fromMe: true }, message: { conversation: '!ping' } },
    { key: { remoteJid: '1@s.whatsapp.net' }, message: { conversation: 'hola' } },
  ] });
  assert.equal(state.sent.length, 0);
});

test('ejecuta un comando por alias y responde en el chat de origen', async () => {
  const state = setup();
  await state.handler({ type: 'notify', messages: [{
    key: { remoteJid: '1@s.whatsapp.net', id: 'abc' },
    message: { conversation: '!P' },
  }] });
  assert.equal(state.sent[0][0], '1@s.whatsapp.net');
  assert.equal(state.sent[0][1].text, 'pong');
});

test('no permite comandos administrativos a un miembro común', async () => {
  let executed = false;
  const state = setup({
    commands: [{ name: 'kick', permission: 'admin', async execute() { executed = true; } }],
    sock: { async groupMetadata() { return { participants: [{ id: '999@s.whatsapp.net', admin: 'admin' }] }; } },
  });
  await state.handler({ type: 'notify', messages: [{
    key: { remoteJid: 'grupo@g.us', participant: '1@s.whatsapp.net' },
    message: { conversation: '!kick' },
  }] });
  assert.equal(executed, false);
  assert.match(state.sent[0][1].text, /Solo un administrador/u);
});

test('bloquea premium a no-owner y no consume su contador antispam', async () => {
  let executed = false;
  const state = setup({
    config: { owners: ['9@s.whatsapp.net'], antiSpam: { enabled: true } },
    commands: [{ name: 'premium', permission: 'owner', async execute() { executed = true; } }],
  });
  await state.handler({ type: 'notify', messages: [{
    key: { remoteJid: '1@s.whatsapp.net', participant: undefined },
    message: { conversation: '!premium' },
  }] });
  assert.equal(executed, false);
  assert.equal(state.antiSpamChecks(), 1);
  assert.match(state.sent[0][1].text, /reservado al propietario/u);
});

test('autoriza premium al owner y permite sus comandos durante mantenimiento', async () => {
  let executed = false;
  const state = setup({
    config: { owners: ['9@s.whatsapp.net'], antiSpam: { enabled: true } },
    store: { getSetting: () => true },
    commands: [{ name: 'premium', permission: 'owner', async execute() { executed = true; } }],
  });
  await state.handler({ type: 'notify', messages: [{
    key: { remoteJid: '9@s.whatsapp.net' },
    message: { conversation: '!premium' },
  }] });
  assert.equal(executed, true);
  assert.equal(state.antiSpamChecks(), 0);
});

test('mantenimiento bloquea comandos normales, sin bloquear el comando de salida', async () => {
  const state = setup({
    store: { getSetting: () => true },
  });
  await state.handler({ type: 'notify', messages: [{
    key: { remoteJid: '1@s.whatsapp.net' },
    message: { conversation: '!ping' },
  }] });
  assert.match(state.sent[0][1].text, /mantenimiento temporal/u);
  assert.notEqual(state.sent[0][1].text, 'pong');
});

test('respaldo premium solo se entrega por privado y excluye credenciales', async () => {
  const owner = '9@s.whatsapp.net';
  const store = {
    state: { groups: { 'grupo@g.us': { welcome: true } }, settings: { maintenanceEnabled: true } },
    async save() {},
    getSetting: () => false,
  };
  const command = ownerCommands.find((entry) => entry.name === 'respaldo');
  const privateState = setup({
    config: { owners: [owner] },
    store,
    commands: [command],
  });
  await privateState.handler({ type: 'notify', messages: [{
    key: { remoteJid: owner },
    message: { conversation: '!respaldo' },
  }] });
  const backup = privateState.sent[0][1];
  assert.equal(backup.mimetype, 'application/json');
  assert.match(backup.document.toString(), /grupo@g\.us/u);
  assert.doesNotMatch(backup.document.toString(), /auth|creds|token|secret/iu);

  const groupState = setup({
    config: { owners: [owner] },
    store,
    commands: [command],
  });
  await groupState.handler({ type: 'notify', messages: [{
    key: { remoteJid: 'grupo@g.us', participant: owner },
    message: { conversation: '!respaldo' },
  }] });
  assert.equal(groupState.sent[0][1].document, undefined);
  assert.match(groupState.sent[0][1].text, /chat privado/u);
});