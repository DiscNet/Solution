const { createStatusQuoted } = require("../../functions/statusCard");
// commands/menugeral.js
const config = require("../../config/config");
const fs = require('fs');
const path = require('path');
const readmore = String.fromCharCode(8206).repeat(4001);

// Função para pegar frase aleatória
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

// 🔥 Função para listar comandos de uma pasta
function getComandosDaPasta(pastaNome) {
  const pastaPath = path.join(__dirname, '..', pastaNome);
  if (!fs.existsSync(pastaPath)) return [];
  
  const comandos = [];
  const arquivos = fs.readdirSync(pastaPath).filter(f => f.endsWith('.js'));
  
  for (const arquivo of arquivos) {
    try {
      const cmdPath = path.join(pastaPath, arquivo);
      // Limpa o cache para evitar conflitos
      delete require.cache[require.resolve(cmdPath)];
      const cmd = require(cmdPath);
      if (cmd.name) {
        comandos.push(cmd.name);
      }
    } catch (e) {
      // Ignora erros de carregamento
    }
  }
  return comandos.sort();
}

module.exports = {
  name: "menugeral",
  aliases: ["menug", "menuall"],
  description: "ᴍᴇɴᴜ ɢᴇʀᴀʟ ᴄᴏᴍ ᴛᴏᴅᴏs ᴏs ᴄᴏᴍᴀɴᴅᴏs",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const name = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";

      let pushName = "Usuário";
      try { pushName = msg.pushName || "Usuário"; } catch (e) { pushName = "Usuário"; }

      // 🔥 Carrega comandos das pastas especificadas
      const pastas = {
        '𝗦𝘁𝗶𝗰𝗸𝗲𝗿': getComandosDaPasta('sticker'),
        '𝗗𝗪𝗦': getComandosDaPasta('dws'),
        '𝗔𝗱𝗺𝗶𝗻𝘀': getComandosDaPasta('admins'),
        '𝗔𝗹𝘁𝗲𝗿𝗮𝗱𝗼𝗿𝗲𝘀': getComandosDaPasta('alteradores'),
        '𝗕𝗿𝗶𝗻𝗰𝗮𝗱𝗲𝗶𝗿𝗮𝘀': getComandosDaPasta('brincadeiras'),
        '𝗥𝗣𝗚': getComandosDaPasta('rpg'),
        '𝗗𝗼𝗻𝗼': getComandosDaPasta('dono'),
        '𝗢𝘂𝘁𝗿𝗼𝘀': getComandosDaPasta('outros')
      };

      // 🔥 Formata lista de comandos com prefixo
      const formatarLista = (cmds) => {
        if (!cmds || cmds.length === 0) return '┃ ✦ ɴᴇɴʜᴜᴍ ᴄᴏᴍᴀɴᴅᴏ';
        return cmds.map(c => `├̬⌑ؔ͟ 「🧊」${prefix}${c}`).join('\n');
      };

      const header = ` 🪐̶⃔͢ᴍᴇɴᴜ ɢᴇʀᴀʟ\n${readmore}`;

      let text = `╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮
├̬⌑ؔ͟ ⎾🧊⏌͟ˉ̵͟͞𝙱𝚘𝚝: ${name}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙳𝚎𝚟: ${owner}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: ${new Date().toLocaleTimeString("pt-BR")}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: ${prefix}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙱𝚊𝚒𝚕𝚎𝚢𝚜: 7.0.0-rc13
╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯
${readmore}
╭─┄─💎〔 𝙼𝙴𝙽𝚄'𝚂 〕
┃ ✦  ${prefix}menu ( Pʀɪɴᴄɪᴀᴘʟ / Cᴏᴍ Bᴏᴛᴏ̃ᴇs)
┃ ✦  ${prefix}menugeral ( Esᴛᴇ )
┃ ✦  ${prefix}menuadm ( Sᴏᴍᴇɴᴛs Aᴅᴍɪɴs)
┃ ✦  ${prefix}menudono ( Sᴏᴍᴇɴᴛᴇ Dᴏɴᴏ )
╰─┄─💎\n\n`;

      // Adiciona cada seção
      for (const [nome, comandos] of Object.entries(pastas)) {
        if (comandos && comandos.length > 0) {
          text += `╭─┄─💎〔 ${nome} 〕\n${formatarLista(comandos)}\n╰─┄─💎\n\n`;
        }
      }

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
      console.error("Erro no menugeral:", error);
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