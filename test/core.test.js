import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { AntiSpam } from '../src/core/anti-spam.js';
import { calculate } from '../src/core/calculator.js';
import { getSenderJid, isGroupAdmin } from '../src/core/permissions.js';
import { createStore, loadStore } from '../src/core/store.js';

test('calcula operaciones con precedencia y sin ejecutar código', () => {
  assert.equal(calculate(' 1 + 2 * (3 - 1) '), 5);
  assert.equal(calculate('-3 / 2'), -1.5);
  assert.throws(() => calculate('1 / 0'), /cero/u);
  assert.throws(() => calculate('process.exit()'), /solo números/u);
  assert.throws(() => calculate('1'.repeat(201)), /demasiado larga/u);
});

test('limita mensajes por ventana móvil sin crecer más del máximo', () => {
  const limiter = new AntiSpam({ limit: 2, windowMs: 10, maxEntries: 2 });
  assert.equal(limiter.check('a', 100).allowed, true);
  assert.equal(limiter.check('a', 105).allowed, true);
  assert.equal(limiter.check('a', 108).allowed, false);
  assert.equal(limiter.check('a', 120).allowed, true);
  limiter.check('b', 120);
  limiter.check('c', 120);
  assert.equal(limiter.check('c', 121).allowed, true);
});

test('resuelve remitentes y roles con los JID del evento', () => {
  assert.equal(getSenderJid({ key: { remoteJid: 'grupo@g.us', participant: '42@s.whatsapp.net' } }), '42@s.whatsapp.net');
  assert.equal(isGroupAdmin({ participants: [{ id: '42@s.whatsapp.net', admin: 'superadmin' }] }, '42@s.whatsapp.net'), true);
  assert.equal(isGroupAdmin({ participants: [{ id: '7@s.whatsapp.net' }] }, '7@s.whatsapp.net'), false);
});

test('persiste bienvenida atómicamente y carga estado tras reinicio', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'taurobero-test-'));
  const filePath = join(directory, 'state.json');
  try {
    const store = createStore(filePath, await loadStore(filePath));
    await Promise.all([
      store.setWelcome('grupo@g.us', true),
      store.setWelcome('otro@g.us', false),
    ]);
    assert.equal(store.isWelcomeEnabled('grupo@g.us'), true);
    assert.deepEqual(JSON.parse(await readFile(filePath, 'utf8')).groups['grupo@g.us'], { welcome: true });
    const restored = await loadStore(filePath);
    assert.equal(restored.groups['grupo@g.us'].welcome, true);
    await store.setSetting('antiSpamEnabled', false);
    await store.setSetting('maintenanceEnabled', true);
    assert.equal((await loadStore(filePath)).settings.maintenanceEnabled, true);
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
});