function targetJids(ctx) {
  const mentioned = ctx.message.message?.extendedTextMessage?.contextInfo?.mentionedJid ?? [];
  if (mentioned.length) return [...new Set(mentioned)];
  const number = ctx.args[0]?.replace(/\D/gu, '');
  return number ? [`${number}@s.whatsapp.net`] : [];
}

export const groupCommands = [
  {
    name: 'bienvenida',
    aliases: ['welcome'],
    description: 'Activa o desactiva el saludo de nuevos miembros.',
    permission: 'admin',
    async execute(ctx) {
      const option = ctx.args[0]?.toLocaleLowerCase('es');
      if (!['on', 'off'].includes(option)) {
        await ctx.reply(`Uso: ${ctx.prefix}bienvenida on|off`);
        return;
      }
      await ctx.store.setWelcome(ctx.chat, option === 'on');
      await ctx.reply(`Bienvenida ${option === 'on' ? 'activada' : 'desactivada'}.`);
    },
  },
  ...[
    ['expulsar', 'remove', 'Elimina a miembros mencionados del grupo.'],
    ['promover', 'promote', 'Promueve a miembros mencionados a administradores.'],
    ['degradar', 'demote', 'Retira la administración a miembros mencionados.'],
  ].map(([name, action, description]) => ({
    name,
    description,
    permission: 'admin',
    async execute(ctx) {
      if (!ctx.isGroup) {
        await ctx.reply('Este comando solo funciona en grupos.');
        return;
      }
      const participants = targetJids(ctx);
      if (!participants.length) {
        await ctx.reply(`Menciona a alguien o indica su número. Uso: ${ctx.prefix}${name} @persona`);
        return;
      }
      await ctx.sock.groupParticipantsUpdate(ctx.chat, participants, action);
      await ctx.reply('Acción completada.');
    },
  })),
];