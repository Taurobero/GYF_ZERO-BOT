import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

const initialState = () => ({ groups: {}, settings: {} });

export async function loadStore(filePath) {
  try {
    const parsed = JSON.parse(await readFile(filePath, 'utf8'));
    return {
      groups: parsed && typeof parsed.groups === 'object' && parsed.groups !== null
        ? parsed.groups
        : {},
      settings: parsed && typeof parsed.settings === 'object' && parsed.settings !== null
        ? parsed.settings
        : {},
    };
  } catch (error) {
    if (error.code !== 'ENOENT') throw new Error(`No se pudo leer el estado: ${error.message}`);
    return initialState();
  }
}

export function createStore(filePath, state = initialState()) {
  let pendingWrite = Promise.resolve();

  return {
    state,
    async save() {
      pendingWrite = pendingWrite.then(async () => {
        await mkdir(dirname(filePath), { recursive: true });
        const temporaryPath = `${filePath}.tmp`;
        await writeFile(temporaryPath, JSON.stringify(state), { mode: 0o600 });
        await rename(temporaryPath, filePath);
      });
      return pendingWrite;
    },
    async setWelcome(groupJid, enabled) {
      state.groups[groupJid] ??= {};
      state.groups[groupJid].welcome = enabled;
      await this.save();
    },
    async setSetting(name, value) {
      state.settings[name] = value;
      await this.save();
    },
    getSetting(name, fallback = undefined) {
      return state.settings[name] ?? fallback;
    },
    isWelcomeEnabled(groupJid) {
      return state.groups[groupJid]?.welcome === true;
    },
  };
}