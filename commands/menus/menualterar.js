const { createStatusQuoted } = require("../../functions/statusCard");
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const { loadCommandModules } = require("../../functions/commandRegistry");
const readmore = String.fromCharCode(8206).repeat(4001);

function getFraseFilosofica() {
  try {
    const frasesPath = path.join(__dirname, "..", "..", "database", "frases.json");
    if (fs.existsSync(frasesPath)) {
      const data = JSON.parse(fs.readFileSync(frasesPath, "utf8"));
      const frases = data.frases || [];
      if (frases.length > 0) {
        const random = Math.floor(Math.random() * frases.length);
        const item = frases[random];
        return `\n\n╭─🪐〔 𝙵𝚁𝙰𝚂𝙴 𝙳𝙾 𝙳𝙸𝙰 〕🪐─╮\n┃ ✦ "${item.frase}"\n┃ ✦ — ${item.autor}\n╰─🪐━━━━━━━━━━━━━🪐─╯`;
      }
    }
  } catch (error) {
    console.error("Erro ao carregar frase:", error);
  }
  return "";
}

function getAlteradorCommands() {
  const alteradoresPath = path.join(__dirname, "..", "alteradores");
  const { records, errors } = loadCommandModules(alteradoresPath);

  for (const item of errors) {
    console.error(`Falha ao carregar alterador ${path.basename(item.file)}:`, item.error.message);
  }

  return [...new Set(records.map((record) => record.name))].sort();
}

function formatarLista(cmds, prefix) {
  if (!cmds || cmds.length === 0) return "┃ ✦ ɴᴇɴʜᴜᴍ ᴄᴏᴍᴀɴᴅᴏ";
  return cmds.map((command) => `├̬⌑ؔ͟ 「🧊」${prefix}${command}`).join("\n");
}

module.exports = {
  name: "menualterar",
  aliases: ["menualt", "alterar", "alteracoes"],
  description: "ᴍᴇɴᴜ ᴅᴏs ᴄᴏᴍᴀɴᴅᴏs ᴅᴇ ᴀʟᴛᴇʀᴀᴄ̧ᴀ̃ᴏ",
  getAlteradorCommands,
  async execute(conn, msg, args, from) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "GrimmJow";
      const name = config.botName || "GrimmJow";
      const comandos = getAlteradorCommands();

      const text = `╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮
├̬⌑ؔ͟ ⎾🧊⏌͟ˉ̵͟͞𝙱𝚘𝚝: ${name}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙳𝚎𝚟: ${owner}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: ${new Date().toLocaleTimeString("pt-BR")}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: ${prefix}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙼𝚎𝚗𝚞: 𝙰𝚕𝚝𝚎𝚛𝚊𝚍𝚘𝚛𝚎𝚜
╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯
${readmore}
╭─┄─💎〔 𝙰𝙻𝚃𝙴𝚁𝙰𝙳𝙾𝚁𝙴𝚂 〕
${formatarLista(comandos, prefix)}
╰─┄─💎
${getFraseFilosofica()}`;

      const img = path.join(__dirname, "..", "..", "imagens", "menu.jpg");
      const contextInfo = {
        forwardingScore: 1,
        isForwarded: true,
        forwardedNewsletterMessageInfo: {
          newsletterJid: "120363426698503859@newsletter",
          newsletterName: name,
          serverMessageId: 116
        }
      };

      if (fs.existsSync(img)) {
        await conn.sendMessage(from, {
          image: fs.readFileSync(img),
          caption: text,
          contextInfo
        }, { quoted: createStatusQuoted(msg) });
      } else {
        await conn.sendMessage(from, { text, contextInfo }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, { react: { text: "👑", key: msg.key } });
    } catch (error) {
      console.error("Erro no menualterar:", error);
      await conn.sendMessage(from, {
        text: "❌ ᴇʀʀᴏ ᴀᴏ ᴄᴀʀʀᴇɢᴀʀ ᴏ ᴍᴇɴᴜ!"
      }, { quoted: createStatusQuoted(msg) });
    }
  }
};
