const OWNER_ONLY = 'owner';

function formatBytes(bytes) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function formatUptime(seconds) {
  const days = Math.floor(seconds / 86_400);
  const hours = Math.floor((seconds % 86_400) / 3_600);
  const minutes = Math.floor((seconds % 3_600) / 60);
  return [days && `${days} d`, hours && `${hours} h`, `${minutes} min`].filter(Boolean).join(' ');
}

export const ownerCommands = [
  {
    name: 'premium',
    description: 'Abre el panel privado de herramientas del owner.',
    permission: OWNER_ONLY,
    async execute(ctx) {
      const entries = ctx.commandList
        .filter((command) => command.permission === OWNER_ONLY && command.name !== 'premium')
        .map((command) => `${ctx.prefix}${command.name}: ${command.description}`);
      await ctx.reply(`*Herramientas del owner*\n\n${entries.join('\n')}`);
    },
  },
  {
    name: 'estado',
    aliases: ['statusbot'],
    description: 'Muestra salud, memoria y funciones configuradas.',
    permission: OWNER_ONLY,
    async execute(ctx) {
      const memory = process.memoryUsage();
      const enabledGroups = Object.keys(ctx.store.state.groups).length;
      await ctx.reply([
        `*${ctx.config.name} | diagnóstico*`,
        `Node.js: ${process.version}`,
        `Plataforma: ${process.platform}/${process.arch}`,
        `Activo: ${formatUptime(process.uptime())}`,
        `RAM RSS: ${formatBytes(memory.rss)}`,
        `Heap: ${formatBytes(memory.heapUsed)} / ${formatBytes(memory.heapTotal)}`,
        `Externa: ${formatBytes(memory.external)}`,
        `Grupos con preferencias: ${enabledGroups}`,
        `Antispam: ${ctx.config.antiSpam.enabled ? 'activo' : 'pausado'}`,
        `IA: ${ctx.config.ai.endpoint && ctx.config.ai.token && ctx.config.ai.model ? 'configurada' : 'sin configurar'}`,
        `Descargas: ${ctx.config.downloads.endpoint && ctx.config.downloads.allowedHosts.length ? 'configuradas' : 'sin configurar'}`,
      ].join('\n'));
    },
  },
  {
    name: 'antispam',
    description: 'Activa o pausa el límite de mensajes y lo guarda.',
    permission: OWNER_ONLY,
    async execute(ctx) {
      const option = ctx.args[0]?.toLocaleLowerCase('es');
      if (!['on', 'off'].includes(option)) {
        await ctx.reply(`Estado actual: ${ctx.config.antiSpam.enabled ? 'activo' : 'pausado'}. Uso: ${ctx.prefix}antispam on|off`);
        return;
      }
      const enabled = option === 'on';
      await ctx.store.setSetting('antiSpamEnabled', enabled);
      ctx.config.antiSpam.enabled = enabled;
      await ctx.reply(`Antispam ${enabled ? 'activado' : 'pausado'}; preferencia guardada.`);
    },
  },
  {
    name: 'mantenimiento',
    description: 'Pausa comandos para usuarios y permite seguir operando al owner.',
    permission: OWNER_ONLY,
    async execute(ctx) {
      const option = ctx.args[0]?.toLocaleLowerCase('es');
      if (!['on', 'off'].includes(option)) {
        const enabled = ctx.store.getSetting('maintenanceEnabled', false);
        await ctx.reply(`Mantenimiento ${enabled ? 'activo' : 'inactivo'}. Uso: ${ctx.prefix}mantenimiento on|off`);
        return;
      }
      const enabled = option === 'on';
      await ctx.store.setSetting('maintenanceEnabled', enabled);
      await ctx.reply(`Mantenimiento ${enabled ? 'activado' : 'desactivado'}; ${enabled ? 'los usuarios no-owner no ejecutarán comandos' : 'los comandos vuelven a estar disponibles'}.`);
    },
  },
  {
    name: 'limpiarspam',
    description: 'Vacía los contadores antispam temporales en memoria.',
    permission: OWNER_ONLY,
    async execute(ctx) {
      ctx.antiSpam.clear();
      await ctx.reply('Contadores antispam en memoria limpiados.');
    },
  },
  {
    name: 'respaldo',
    description: 'Envía en privado una copia de preferencias, nunca de la sesión.',
    permission: OWNER_ONLY,
    async execute(ctx) {
      if (ctx.isGroup || ctx.chat !== ctx.sender) {
        await ctx.reply(`Por seguridad, ejecuta ${ctx.prefix}respaldo en un chat privado con el bot.`);
        return;
      }

      await ctx.store.save();
      const payload = JSON.stringify({
        version: 1,
        createdAt: new Date().toISOString(),
        state: ctx.store.state,
      }, null, 2);
      if (Buffer.byteLength(payload) > 256 * 1024) {
        await ctx.reply('El estado supera el límite de respaldo de 256 KiB.');
        return;
      }

      await ctx.sock.sendMessage(ctx.sender, {
        document: Buffer.from(payload),
        mimetype: 'application/json',
        fileName: `taurobero-respaldo-${new Date().toISOString().slice(0, 10)}.json`,
        caption: 'Respaldo de preferencias. No incluye credenciales ni claves de sesión.',
      }, { quoted: ctx.message });
    },
  },
];