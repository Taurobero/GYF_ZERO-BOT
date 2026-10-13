import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { downloadMediaMessage } from '@whiskeysockets/baileys';
import { unwrapMessage } from '../core/text.js';

const execFileAsync = promisify(execFile);
const MAX_INPUT_BYTES = 16 * 1024 * 1024;

function quotedMedia(message) {
  const content = unwrapMessage(message);
  const context = content?.extendedTextMessage?.contextInfo
    ?? content?.imageMessage?.contextInfo
    ?? content?.videoMessage?.contextInfo;
  if (!context?.quotedMessage) return null;

  return {
    key: {
      remoteJid: message.key.remoteJid,
      id: context.stanzaId,
      participant: context.participant,
      fromMe: false,
    },
    message: context.quotedMessage,
  };
}

async function makeSticker(ctx, animated) {
  const reply = quotedMedia(ctx.message);
  const source = reply ?? ctx.message;
  const sourceContent = unwrapMessage(source);
  const media = sourceContent?.imageMessage ?? sourceContent?.videoMessage ?? sourceContent?.documentMessage;
  if (!media) {
    await ctx.reply(`Responde a una imagen${animated ? ' o video/GIF' : ''} con ${ctx.prefix}${animated ? 'stickeranim' : 'sticker'}.`);
    return;
  }
  const supportedImage = Boolean(sourceContent.imageMessage) || media.mimetype === 'image/gif';
  const supportedVideo = Boolean(sourceContent.videoMessage);
  if ((animated && !supportedVideo && !supportedImage) || (!animated && !supportedImage)) {
    await ctx.reply('El tipo de archivo no es compatible con esta conversión.');
    return;
  }
  if (Number(media.fileLength) > MAX_INPUT_BYTES) {
    await ctx.reply('El archivo de origen supera 16 MiB.');
    return;
  }
  if (animated && !supportedVideo && media.mimetype !== 'image/gif') {
    await ctx.reply('Para un sticker animado responde a un video o GIF.');
    return;
  }

  const buffer = await downloadMediaMessage(source, 'buffer', {}, {
    logger: ctx.logger,
    reuploadRequest: ctx.sock.updateMediaMessage,
  });
  if (buffer.length > MAX_INPUT_BYTES) throw new Error('El archivo de origen supera 16 MiB.');

  const directory = await mkdtemp(join(tmpdir(), 'taurobero-'));
  const input = join(directory, 'entrada');
  const output = join(directory, 'sticker.webp');
  try {
    await writeFile(input, buffer);
    const filters = animated
      ? 'fps=15,scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000'
      : 'scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=0x00000000';
    const args = ['-hide_banner', '-loglevel', 'error', '-y', '-i', input, '-t', '10', '-vf', filters,
      '-an', '-c:v', 'libwebp', '-q:v', '65', '-compression_level', '4'];
    if (!animated) args.push('-frames:v', '1');
    args.push(output);
    await execFileAsync(process.env.FFMPEG_PATH || 'ffmpeg', args, { timeout: 45_000, maxBuffer: 1024 * 1024 });
    const sticker = await readFile(output);
    if (sticker.length > 1_000_000) throw new Error('El WebP supera 1 MiB; prueba con un archivo más pequeño.');
    await ctx.sock.sendMessage(ctx.chat, { sticker }, { quoted: ctx.message });
  } catch (error) {
    if (error.code === 'ENOENT') throw new Error('No encuentro FFmpeg. Instálalo con: pkg install ffmpeg');
    throw error;
  } finally {
    await rm(directory, { recursive: true, force: true });
  }
}

export const mediaCommands = [
  {
    name: 'sticker',
    aliases: ['s'],
    description: 'Convierte una imagen respondida a sticker WebP.',
    async execute(ctx) {
      await makeSticker(ctx, false);
    },
  },
  {
    name: 'stickeranim',
    description: 'Convierte un video/GIF respondido a sticker WebP animado.',
    async execute(ctx) {
      await makeSticker(ctx, true);
    },
  },
];