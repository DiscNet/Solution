// functions/autoresponse.js
module.exports = async (conn, msg) => {
  // Não responde às próprias mensagens
  if (msg.key.fromMe) return;

  const from = msg.key.remoteJid;
  const config = require("../config/config");
  const text =
    msg.message?.conversation ||
    msg.message?.extendedTextMessage?.text ||
    "";

  if (!text) return;

  const gatilhos = {
    "menu": ["Para receber a lista de comandos escreva .menu"],
  };

  const msgLower = text.toLowerCase();

  for (const key in gatilhos) {
    if (msgLower.includes(key)) {
      const respostas = gatilhos[key];
      const resposta = respostas[Math.floor(Math.random() * respostas.length)];
      await conn.sendMessage(from, { text: resposta }, { quoted: msg });
      break; // Para de checar outros gatilhos
    }
  }
};