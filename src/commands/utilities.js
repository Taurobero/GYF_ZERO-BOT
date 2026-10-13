import { randomInt } from 'node:crypto';
import { calculate } from '../core/calculator.js';

export const utilityCommands = [
  {
    name: 'ayuda',
    aliases: ['help', 'menu'],
    description: 'Muestra los comandos disponibles.',
    async execute(ctx) {
      const visible = ctx.commandList
        .filter((command) => command.permission !== 'owner' || ctx.isOwner)
        .map((command) => `${ctx.prefix}${command.name}: ${command.description}`);
      await ctx.reply(`*${ctx.config.name}*\n\n${visible.join('\n')}`);
    },
  },
  {
    name: 'ping',
    description: 'Comprueba que el bot responde.',
    async execute(ctx) {
      await ctx.reply('Pong.');
    },
  },
  {
    name: 'hora',
    description: 'Muestra la fecha y hora local del dispositivo.',
    async execute(ctx) {
      await ctx.reply(new Intl.DateTimeFormat('es', {
        dateStyle: 'full',
        timeStyle: 'short',
      }).format(new Date()));
    },
  },
  {
    name: 'calc',
    aliases: ['calcular'],
    description: 'Calcula operaciones aritméticas básicas.',
    async execute(ctx) {
      try {
        await ctx.reply(String(calculate(ctx.args.join(' '))));
      } catch (error) {
        await ctx.reply(error.message);
      }
    },
  },
  {
    name: 'rps',
    description: 'Juega piedra, papel o tijera.',
    async execute(ctx) {
      const choices = ['piedra', 'papel', 'tijera'];
      const choice = ctx.args[0]?.toLocaleLowerCase('es');
      if (!choices.includes(choice)) {
        await ctx.reply(`Uso: ${ctx.prefix}rps piedra|papel|tijera`);
        return;
      }
      const botChoice = choices[randomInt(choices.length)];
      const outcome = choice === botChoice
        ? 'Empate.'
        : (choices.indexOf(choice) - choices.indexOf(botChoice) + 3) % 3 === 1
          ? 'Ganaste.'
          : 'Gané esta vez.';
      await ctx.reply(`Tú: ${choice}. Yo: ${botChoice}. ${outcome}`);
    },
  },
];