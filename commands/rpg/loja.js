// Menu: RPG - Economia e itens | Comando: loja
const { createStatusQuoted } = require("../../functions/statusCard");
// commands/rpg/loja.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const rpgSystem = require("../../functions/rpgSystem");
const { sendInteractiveMessage } = require("gifted-btns");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");
const lojaPath = path.join(__dirname, "..", "..", "database", "rpgLoja.json");

function carregarDb() {
  if (!fs.existsSync(dbPath)) return { usuarios: {} };
  return JSON.parse(fs.readFileSync(dbPath, "utf8"));
}

function carregarLoja() {
  if (!fs.existsSync(lojaPath)) return { loja: { arqueiro: {}, assassino: {}, geral: {} } };
  return JSON.parse(fs.readFileSync(lojaPath, "utf8"));
}

function salvarDb(data) {
  const dbDir = path.join(__dirname, "..", "..", "database");
  if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

module.exports = {
  permissions: { group: true },
  name: "loja",
  aliases: ["shop", "store"],
  description: "ᴠᴇʀ ᴏᴜ ᴄᴏᴍᴘʀᴀʀ ɪᴛᴇɴs ɴᴀ ʟᴏᴊᴀ",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const prefix = config.prefix || ".";

      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      // Verifica se o RPG está ativo
      if (from.endsWith("@g.us") && !rpgSystem.isRpgAtivo(from)) {
        return await conn.sendMessage(from, {
          text: `❌ *sɪsᴛᴇᴍᴀ ʀᴘɢ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n⚔️ ᴘᴇᴄᴀ ᴀ ᴜᴍ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴘᴀʀᴀ ᴀᴛɪᴠᴀʀ ᴏ sɪsᴛᴇᴍᴀ ᴄᴏᴍ:\n${prefix}rpgsystem on`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      let lid = msg.key.participant || msg.key.remoteJid || from;
      if (from.endsWith("@g.us") && msg.key.participant) {
        lid = msg.key.participant;
      }

      const db = carregarDb();
      const lojaData = carregarLoja();

      if (!db.usuarios[lid]) {
        return await conn.sendMessage(from, {
          text: `❌ ᴠᴏᴄᴇ ᴀɪɴᴅᴀ ɴᴀᴏ ᴇsᴛᴀ́ ʀᴇɢɪsᴛʀᴀᴅᴏ!\n\n📌 ᴜsᴇ ${prefix}registro para criar seu personagem.`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });
      }

      const ficha = db.usuarios[lid];
      const classe = ficha.classe.toLowerCase();

      // 🔥 VERIFICA SE É COMPRA
      if (args[0] && args[0].toLowerCase() === "comprar") {
        // 🔥 PEGA O NOME DO ITEM E REMOVE ASPAS SE HOUVER
        let itemNome = args.slice(1).join(" ").trim();
        // Remove aspas simples e duplas do início e fim
        itemNome = itemNome.replace(/^["']|["']$/g, "").trim();

        if (!itemNome) {
          return await conn.sendMessage(from, {
            text: `❌ ɪɴғᴏʀᴍᴇ ᴏ ɴᴏᴍᴇ ᴅᴏ ɪᴛᴇᴍ!\n📌 ${prefix}loja comprar arco basico\n📌 ${prefix}loja comprar "arco basico"`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // Procura o item em todas as categorias
        let itemEncontrado = null;
        let itemCategoria = null;
        let itemNomeOriginal = null;

        // Procura nos itens da classe
        if (lojaData.loja[classe]) {
          for (const [nome, item] of Object.entries(lojaData.loja[classe])) {
            if (nome.toLowerCase() === itemNome.toLowerCase()) {
              itemEncontrado = item;
              itemCategoria = classe;
              itemNomeOriginal = nome;
              break;
            }
          }
        }

        // Procura nos itens gerais
        if (!itemEncontrado) {
          for (const [nome, item] of Object.entries(lojaData.loja.geral)) {
            if (nome.toLowerCase() === itemNome.toLowerCase()) {
              itemEncontrado = item;
              itemCategoria = "geral";
              itemNomeOriginal = nome;
              break;
            }
          }
        }

        if (!itemEncontrado) {
          return await conn.sendMessage(from, {
            text: `❌ ɪᴛᴇᴍ *${itemNome}* ɴᴀ̃ᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ ɴᴀ ʟᴏᴊᴀ!`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // Verifica level
        if (ficha.level < itemEncontrado.level) {
          return await conn.sendMessage(from, {
            text: `❌ ᴠᴏᴄᴇ ᴘʀᴇᴄɪsᴀ sᴇʀ ʟᴇᴠᴇʟ ${itemEncontrado.level} ᴘᴀʀᴀ ᴄᴏᴍᴘʀᴀʀ *${itemNomeOriginal}*!\n📊 sᴇᴜ ʟᴇᴠᴇʟ: ${ficha.level}`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // Verifica gold
        if (ficha.gold < itemEncontrado.preco) {
          return await conn.sendMessage(from, {
            text: `❌ ᴠᴏᴄᴇ ɴᴀ̃ᴏ ᴛᴇᴍ ɢᴏʟᴅ sᴜғɪᴄɪᴇɴᴛᴇ!\n💰 ᴘʀᴇᴄ̧ᴏ: ${itemEncontrado.preco}\n💰 sᴇᴜ ɢᴏʟᴅ: ${ficha.gold}`,
            contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
          }, { quoted: msg });
        }

        // 🔥 COMPRA REALIZADA
        ficha.gold -= itemEncontrado.preco;

        // Adiciona ao inventário apropriado
        const tipo = itemEncontrado.tipo;
        if (tipo === "arco") {
          ficha.arma.push(itemNomeOriginal);
        } else if (tipo === "espada") {
          ficha.espada.push(itemNomeOriginal);
        } else if (tipo === "escudo") {
          ficha.escudo.push(itemNomeOriginal);
        } else if (tipo === "encantamento") {
          ficha.itens.push(itemNomeOriginal);
        } else {
          ficha.itens.push(itemNomeOriginal);
        }

        salvarDb(db);

        await conn.sendMessage(from, {
          text: `✅ *ᴄᴏᴍᴘʀᴀ ʀᴇᴀʟɪᴢᴀᴅᴀ ᴄᴏᴍ sᴜᴄᴇssᴏ!*\n\n🛒 *ɪᴛᴇᴍ:* ${itemNomeOriginal}\n💰 *ɢᴏʟᴅ ɢᴀsᴛᴏ:* ${itemEncontrado.preco}\n💰 *ɢᴏʟᴅ ʀᴇsᴛᴀɴᴛᴇ:* ${ficha.gold}\n📦 *ᴄᴀᴛᴇɢᴏʀɪᴀ:* ${tipo}`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        }, { quoted: msg });

        return; // 🔥 SAI DA FUNÇÃO PARA NÃO MOSTRAR A LOJA NOVAMENTE
      }

      // =====================
      // MENU INTERATIVO DA LOJA (SÓ MOSTRA SE NÃO FOR COMPRA)
      // =====================

      // Cria as seções de itens
      const sections = [];

      // Seção de Equipamentos da Classe
      const classRows = [];
      if (lojaData.loja[classe]) {
        for (const [nome, item] of Object.entries(lojaData.loja[classe])) {
          const disponivel = ficha.level >= item.level;
          const status = disponivel ? "✅" : "🔒";
          classRows.push({
            id: `${prefix}loja comprar "${nome}"`,
            title: `${status} ${nome}`,
            description: `💰 ${item.preco} ɢᴏʟᴅs | ʟᴠ.${item.level} | ${item.descricao || ""}`
          });
        }
      }

      if (classRows.length > 0) {
        sections.push({
          title: `🗡️ ᴇǫᴜɪᴘᴀᴍᴇɴᴛᴏs ᴅᴀ ᴄʟᴀssᴇ ${ficha.classe}`,
          rows: classRows
        });
      }

      // Seção de Itens Gerais
      const geralRows = [];
      for (const [nome, item] of Object.entries(lojaData.loja.geral)) {
        const disponivel = ficha.level >= item.level;
        const status = disponivel ? "✅" : "🔒";
        geralRows.push({
          id: `${prefix}loja comprar "${nome}"`,
          title: `${status} ${nome}`,
          description: `💰 ${item.preco} ɢᴏʟᴅs | ʟᴠ.${item.level} | ${item.descricao || ""}`
        });
      }

      if (geralRows.length > 0) {
        sections.push({
          title: "🛡️ ɪᴛᴇɴs ɢᴇʀᴀɪs",
          rows: geralRows
        });
      }

      // Seção de Informações do Jogador
      sections.push({
        title: "👤 sᴇᴜs ᴅᴀᴅᴏs",
        rows: [
          {
            id: `${prefix}ficha`,
            title: `📊 ${ficha.pushName}`,
            description: `ʟᴇᴠᴇʟ ${ficha.level} | ${ficha.classe} | 💰 ${ficha.gold} ɢᴏʟᴅs`
          }
        ]
      });

      // Envia a mensagem interativa
      await sendInteractiveMessage(conn, from, {
        text: `🏪 *ʟᴏᴊᴀ ᴅᴏ ʀᴘɢ*

━━━━━━━━━━━━━━━━━━━━
👤 *ɴᴏᴍᴇ:* ${ficha.pushName}
💰 *ɢᴏʟᴅ:* ${ficha.gold}
📊 *ʟᴇᴠᴇʟ:* ${ficha.level}
🏷️ *ᴄʟᴀssᴇ:* ${ficha.classe}
━━━━━━━━━━━━━━━━━━━━

📌 sᴇʟᴇᴄɪᴏɴᴇ ᴜᴍ ɪᴛᴇᴍ ᴘᴀʀᴀ ᴄᴏᴍᴘʀᴀʀ:

✅ = ᴅɪsᴘᴏɴɪ́ᴠᴇʟ
🔒 = ʙʟᴏǫᴜᴇᴀᴅᴏ (ʟᴇᴠᴇʟ ɪɴsᴜғɪᴄɪᴇɴᴛᴇ)`,
        footer: "ʟᴜᴋᴀᴍᴏᴅᴢᴢ • ʀᴘɢ",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } },
        interactiveButtons: [
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "🏪 ʟᴏᴊᴀ",
              sections: sections
            })
          }
        ]
      }, {
        quoted: createStatusQuoted(msg)
      });

    } catch (error) {
      console.error("❌ Erro loja:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴀᴄᴇssᴀʀ ᴀ ʟᴏᴊᴀ!*\n\n📌 ${error.message}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "RPG",
  "menuSection": "Loja e Itens",
  "description": "Uso: .loja [comprar item]",
  "usage": "loja [comprar item]"
});
