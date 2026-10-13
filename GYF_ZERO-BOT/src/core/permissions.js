export function getSenderJid(message) {
  if (message?.key?.participant) return message.key.participant;
  return message?.key?.remoteJid ?? '';
}

export function isGroupAdmin(metadata, jid) {
  const participant = metadata?.participants?.find((entry) => entry.id === jid);
  return participant?.admin === 'admin' || participant?.admin === 'superadmin';
}

export function isBotGroupAdmin(metadata, botJid) {
  return isGroupAdmin(metadata, botJid);
}