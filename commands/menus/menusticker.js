const { createStatusQuoted } = require("../../functions/statusCard");
// commands/menusticker.js
const config = require("../../config/config");
const fs = require('fs');
const path = require('path');
const readmore = String.fromCharCode(8206).repeat(4001);

function getFraseFilosofica() {
  try {
    const frasesPath = path.join(__dirname, "..", '..', 'database', 'frases.json');
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

function getComandosDaPasta(pastaNome) {
  const pastaPath = path.join(__dirname, '..', pastaNome);
  if (!fs.existsSync(pastaPath)) return [];
  
  const comandos = [];
  const arquivos = fs.readdirSync(pastaPath).filter(f => f.endsWith('.js'));
  
  for (const arquivo of arquivos) {
    try {
      const cmdPath = path.join(pastaPath, arquivo);
      delete require.cache[require.resolve(cmdPath)];
      const cmd = require(cmdPath);
      if (cmd.name) {
        comandos.push(cmd.name);
      }
    } catch (e) {}
  }
  return comandos.sort();
}

module.exports = {
  name: "menusticker",
  aliases: ["menus", "stickers", "figurinhas"],
  description: "ᴍᴇɴᴜ ᴅᴏs ᴄᴏᴍᴀɴᴅᴏs ᴅᴇ ғɪɢᴜʀɪɴʜᴀs",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const name = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";

      let pushName = "Usuário";
      try { pushName = msg.pushName || "Usuário"; } catch (e) { pushName = "Usuário"; }

      const comandos = getComandosDaPasta('sticker');

      const formatarLista = (cmds) => {
        if (!cmds || cmds.length === 0) return '┃ ✦ ɴᴇɴʜᴜᴍ ᴄᴏᴍᴀɴᴅᴏ';
        return cmds.map(c => `├̬⌑ؔ͟ 「🧊」${prefix}${c}`).join('\n');
      };

      let text = `╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮
├̬⌑ؔ͟ ⎾🧊⏌͟ˉ̵͟͞𝙱𝚘𝚝: ${name}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙳𝚎𝚟: ${owner}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: ${new Date().toLocaleTimeString("pt-BR")}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: ${prefix}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙼𝚎𝚗𝚞: 𝚂𝚝𝚒𝚌𝚔𝚎𝚛
╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯
${readmore}
╭─┄─💎〔 𝚂𝚃𝙸𝙲𝙺𝙴𝚁𝚂 〕
${formatarLista(comandos)}
╰─┄─💎
${getFraseFilosofica()}`;

      const img = path.join(__dirname, "..", '..', 'imagens', 'menu.jpg');

      if (fs.existsSync(img)) {
        await conn.sendMessage(from, {
          image: fs.readFileSync(img),
          caption: text,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: config.botName || "LukaModzz",
              serverMessageId: 116
            }
          }
        }, {
          quoted: createStatusQuoted(msg)
        });
      } else {
        await conn.sendMessage(from, {
          text: text,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: config.botName || "LukaModzz", serverMessageId: 116 }
          }
        }, {
          quoted: createStatusQuoted(msg)
        });
      }

      await conn.sendMessage(from, { react: { text: "👑", key: msg.key } });

    } catch (error) {
      console.error("Erro no menusticker:", error);
      await conn.sendMessage(from, { 
        text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ ᴏ ᴍᴇɴᴜ!",
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: config.botName || "LukaModzz", serverMessageId: 116 }
        }
      }, { quoted: msg });
    }
  }
};