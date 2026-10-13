import { createWriteStream } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Readable, Transform } from 'node:stream';
import { pipeline } from 'node:stream/promises';

function requireHttpsEndpoint(value, label) {
  let endpoint;
  try {
    endpoint = new URL(value);
  } catch {
    throw new Error(`${label} no está configurado con una URL válida.`);
  }
  if (endpoint.protocol !== 'https:') throw new Error(`${label} debe usar HTTPS.`);
  return endpoint;
}

async function readJsonLimited(response, maxBytes) {
  const reader = response.body.getReader();
  const chunks = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel();
      throw new Error('La respuesta del proveedor es demasiado grande.');
    }
    chunks.push(Buffer.from(value));
  }
  return JSON.parse(Buffer.concat(chunks, size).toString('utf8'));
}

async function saveLimitedResponse(response, destination, maxBytes) {
  let size = 0;
  const limiter = new Transform({
    transform(chunk, encoding, callback) {
      size += chunk.length;
      callback(size > maxBytes ? new Error('El archivo supera el límite de 20 MiB.') : null, chunk);
    },
  });
  await pipeline(Readable.fromWeb(response.body), limiter, createWriteStream(destination, { flags: 'wx', mode: 0o600 }));
}

export const integrationCommands = [
  {
    name: 'ia',
    description: 'Consulta el modelo de IA configurado.',
    async execute(ctx) {
      const { endpoint, token, model } = ctx.config.ai;
      if (!endpoint || !token || !model) {
        await ctx.reply('La IA no está configurada. Revisa AI_API_URL, AI_API_KEY y AI_MODEL.');
        return;
      }
      const url = requireHttpsEndpoint(endpoint, 'AI_API_URL');
      const prompt = ctx.args.join(' ').trim().slice(0, 2_000);
      if (!prompt) {
        await ctx.reply(`Uso: ${ctx.prefix}ia pregunta`);
        return;
      }

      const response = await fetch(url, {
        method: 'POST',
        headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
        body: JSON.stringify({ model, messages: [{ role: 'user', content: prompt }] }),
        signal: AbortSignal.timeout(20_000),
      });
      if (!response.ok) throw new Error(`El proveedor de IA respondió HTTP ${response.status}.`);
      const data = await readJsonLimited(response, 512 * 1024);
      const answer = data.choices?.[0]?.message?.content;
      if (typeof answer !== 'string' || !answer.trim()) throw new Error('El proveedor devolvió una respuesta vacía.');
      await ctx.reply(answer.slice(0, 4_000));
    },
  },
  {
    name: 'descargar',
    aliases: ['buscar'],
    description: 'Busca contenido en el proveedor de descargas configurado.',
    async execute(ctx) {
      const { endpoint, token, allowedHosts } = ctx.config.downloads;
      if (!endpoint || allowedHosts.length === 0) {
        await ctx.reply('Descargas sin configurar. Define DOWNLOAD_API_URL y DOWNLOAD_ALLOWED_HOSTS.');
        return;
      }
      const query = ctx.args.join(' ').trim();
      if (!query) {
        await ctx.reply(`Uso: ${ctx.prefix}descargar términos de búsqueda`);
        return;
      }

      const providerUrl = requireHttpsEndpoint(endpoint, 'DOWNLOAD_API_URL');
      providerUrl.searchParams.set('q', query.slice(0, 200));
      const headers = token ? { authorization: `Bearer ${token}` } : {};
      const providerResponse = await fetch(providerUrl, {
        headers,
        redirect: 'error',
        signal: AbortSignal.timeout(15_000),
      });
      if (!providerResponse.ok) throw new Error(`El proveedor respondió HTTP ${providerResponse.status}.`);
      const result = await readJsonLimited(providerResponse, 64 * 1024);
      if (typeof result.url !== 'string') throw new Error('El proveedor no devolvió un enlace de descarga.');
      const mediaUrl = new URL(result.url);
      const allowed = allowedHosts.some((host) => mediaUrl.hostname.toLowerCase() === host
        || mediaUrl.hostname.toLowerCase().endsWith(`.${host}`));
      if (mediaUrl.protocol !== 'https:' || !allowed || mediaUrl.username || mediaUrl.password) {
        throw new Error('El proveedor devolvió un enlace fuera de los dominios permitidos.');
      }

      const mediaResponse = await fetch(mediaUrl, {
        redirect: 'error',
        signal: AbortSignal.timeout(30_000),
      });
      if (!mediaResponse.ok) throw new Error(`No se pudo descargar el archivo (HTTP ${mediaResponse.status}).`);
      const contentLength = Number(mediaResponse.headers.get('content-length') || 0);
      if (contentLength > 20 * 1024 * 1024) throw new Error('El archivo supera el límite de 20 MiB.');
      const mimetype = mediaResponse.headers.get('content-type')?.split(';')[0] || 'application/octet-stream';
      const extension = mimetype.split('/')[1]?.replace(/[^a-z0-9.+-]/giu, '').slice(0, 10) || 'bin';
      const directory = await mkdtemp(join(tmpdir(), 'taurobero-download-'));
      const path = join(directory, `descarga.${extension}`);
      try {
        await saveLimitedResponse(mediaResponse, path, 20 * 1024 * 1024);
        await ctx.sock.sendMessage(ctx.chat, {
          document: { url: path },
          mimetype,
          fileName: `descarga.${extension}`,
          caption: String(result.title || 'Archivo solicitado').slice(0, 100),
        }, { quoted: ctx.message });
      } finally {
        await rm(directory, { recursive: true, force: true });
      }
    },
  },
];