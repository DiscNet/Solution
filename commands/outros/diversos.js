const config = require("../../config/config");
const fs = require('fs');
const path = require('path');
const readmore = String.fromCharCode(8206).repeat(4001);

// Função para pegar frase aleatória
function getFraseFilosofica() {
  try {
    const frasesPath = path.join(__dirname, '..', 'database', 'frases.json');
    if (fs.existsSync(frasesPath)) {
      const data = JSON.parse(fs.readFileSync(frasesPath, 'utf8'));
      const frases = data.frases || [];
      if (frases.length > 0) {
        const random = Math.floor(Math.random() * frases.length);
        const item = frases[random];
        return `\n\n╭─🪐〔 𝙵𝚁𝙰𝚂𝙴 𝙳𝙾 𝙳𝙸𝙰 〕🪐─╮\n┃ ✦ "${item.frase}"\n┃ ✦ — ${item.autor}\n╰─🪐━━━━━━━━━━━━━🪐─╯`;
      }
    }
  } catch (e) {
    console.error("Erro ao carregar frase:", e);
  }
  return "";
}

module.exports = {
  name: "diversos",
  async execute(conn, msg, args, from) {
    try {
      const prefix = config.prefix || ".";

      const header = `
╭━🪐━━━━━━━⬣━━━━━━━🪐━╮
┃   ✦ 𝙻𝚞𝚔𝚊𝙼𝚘𝚍𝚣𝚣 𝙱𝙾𝚃 ✦
╰━🪐━━━━━━━⬣━━━━━━━🪐━╯
${readmore}
`;

      const text = `
${header}
╭─🪐〔 𝙳𝙸𝚅𝙴𝚁𝚂𝙾𝚂 〕🪐─╮
┃ ✦  ${prefix}ping
┃ ✦  ${prefix}gay
┃ ✦  ${prefix}corno
┃ ✦  ${prefix}hetero
┃ ✦  ${prefix}gado
┃ ✦  ${prefix}criador
╰─🪐━━━━━━━━━━🪐─╯
${getFraseFilosofica()}
`;

      const img = path.join(__dirname, "..", '..', 'imagens', 'menugarou.jpg');

      if (fs.existsSync(img)) {
        await conn.sendMessage(from, { image: fs.readFileSync(img), caption: text }, { quoted: msg });
      } else {
        await conn.sendMessage(from, { text }, { quoted: msg });
      }

      await conn.sendMessage(from, { react: { text: "👑", key: msg.key } });

    } catch {
      await conn.sendMessage(from, { text: "❌ Erro Diversos" }, { quoted: msg });
    }
  }
};