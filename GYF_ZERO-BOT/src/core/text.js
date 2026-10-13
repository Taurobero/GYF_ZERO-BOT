export function extractMessageText(message) {
  const content = message?.message;
  if (!content) return '';

  return content.conversation
    ?? content.extendedTextMessage?.text
    ?? content.imageMessage?.caption
    ?? content.videoMessage?.caption
    ?? content.documentMessage?.caption
    ?? content.buttonsResponseMessage?.selectedDisplayText
    ?? content.listResponseMessage?.title
    ?? content.templateButtonReplyMessage?.selectedDisplayText
    ?? '';
}

export function parseCommand(text, prefix = '!') {
  if (typeof text !== 'string' || !text.startsWith(prefix)) return null;

  const body = text.slice(prefix.length).trim();
  if (!body) return null;

  const [name, ...args] = body.split(/\s+/u);
  return { name: name.toLocaleLowerCase('es'), args };
}

export function unwrapMessage(message) {
  let content = message?.message;
  while (content) {
    if (content.ephemeralMessage?.message) content = content.ephemeralMessage.message;
    else if (content.viewOnceMessage?.message) content = content.viewOnceMessage.message;
    else if (content.viewOnceMessageV2?.message) content = content.viewOnceMessageV2.message;
    else break;
  }
  return content;
}