// functions/sendButton.js
/**
 * Envia botões nativos do WhatsApp via Baileys
 * @param {import("@whiskeysockets/baileys").AnyWASocket} conn - Conexão do bot
 * @param {string} jid - ID do chat (ex: '5511999999999@s.whatsapp.net')
 * @param {string} text - Texto principal da mensagem
 * @param {Array} buttons - Array de botões [{ id: 'id', text: 'Texto do botão' }]
 * @param {Object} quoted - Mensagem citada (opcional)
 */
async function sendButton(conn, jid, text, buttons, quoted = null) {
  const formattedButtons = buttons.map(b => ({
    buttonId: b.id,
    buttonText: { displayText: b.text },
    type: 1
  }));

  await conn.sendMessage(jid, {
    text: text,
    buttons: formattedButtons,
    headerType: 1
  }, { quoted });
}

module.exports = { sendButton };