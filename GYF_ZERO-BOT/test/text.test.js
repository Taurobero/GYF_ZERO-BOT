import test from 'node:test';
import assert from 'node:assert/strict';
import { extractMessageText, parseCommand, unwrapMessage } from '../src/core/text.js';

test('extrae texto y captions habituales', () => {
  assert.equal(extractMessageText({ message: { conversation: 'hola' } }), 'hola');
  assert.equal(extractMessageText({ message: { extendedTextMessage: { text: '!ping' } } }), '!ping');
  assert.equal(extractMessageText({ message: { imageMessage: { caption: '!sticker' } } }), '!sticker');
  assert.equal(extractMessageText({}), '');
});

test('analiza prefijo configurable, nombre y argumentos', () => {
  assert.deepEqual(parseCommand('!PING hola mundo'), { name: 'ping', args: ['hola', 'mundo'] });
  assert.deepEqual(parseCommand('.ayuda', '.'), { name: 'ayuda', args: [] });
  assert.equal(parseCommand('texto normal'), null);
  assert.equal(parseCommand('!   '), null);
});

test('desenvuelve mensajes efímeros y de visualización única', () => {
  const message = {
    ephemeralMessage: {
      message: { viewOnceMessageV2: { message: { conversation: 'contenido' } } },
    },
  };
  assert.deepEqual(unwrapMessage({ message }), { conversation: 'contenido' });
});