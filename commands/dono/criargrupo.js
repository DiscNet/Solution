// commands/dono/criargrupo.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");

module.exports = {
  name: "criargrupo",
  description: "𝑪𝒓𝒊𝒂 𝒖𝒎 𝒈𝒓𝒖𝒑𝒐 𝒄𝒐𝒎 𝒏𝒐𝒎𝒆 𝒆 𝒇𝒐𝒕𝒐 𝒑𝒆𝒓𝒔𝒐𝒏𝒂𝒍𝒊𝒛𝒂𝒅𝒂",

  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const owner = config.ownerName || "LukaModzz";
      const ownerNumber = config.ownerNumber || "5563992003562";
      const ownerLid = config.ownerLid || null;
      
      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      const sender = msg.key.participant || from;
      const senderClean = sender.replace(/[^0-9]/g, "");
      const ownerClean = ownerNumber.replace(/[^0-9]/g, "");
      
      const isOwnerByNumber = senderClean === ownerClean;
      const isOwnerByLid = ownerLid && sender === ownerLid;
      const isOwner = isOwnerByNumber || isOwnerByLid;
      
      if (!isOwner) {
        return conn.sendMessage(from, {
          text: `❌ *Apenas o dono do bot pode usar este comando!*`,
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
        }, {
          quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
        });
      }

      const groupName = args.join(" ") || "Testes";
      
      await conn.sendMessage(from, { react: { text: "⚙️", key: msg.key } });

      // 🔥 Avisa que vai demorar um pouco
      await conn.sendMessage(from, {
        text: "⏳ *Criando grupo...* Aguarde alguns segundos.",
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      });

      // 🔥 Espera 5 segundos antes de tentar (evita rate limit)
      await delay(5000);

      const ownerJid = ownerClean + "@s.whatsapp.net";
      
      // 🔥 Apenas UMA tentativa
      const group = await conn.groupCreate(groupName, [ownerJid]);
      const groupId = group.id;

      console.log(`✅ Grupo criado: ${groupName} (${groupId})`);

      // Aguarda o grupo ser registrado
      await delay(3000);

      // Define a foto do grupo
      const imgPath = path.join(__dirname, "..", "..", "imagens", "bot.jpg");
      
      if (fs.existsSync(imgPath)) {
        try {
          await delay(2000);
          const imageBuffer = fs.readFileSync(imgPath);
          await conn.updateProfilePicture(groupId, imageBuffer);
          console.log("✅ Foto do grupo definida!");
        } catch (e) {
          console.log("⚠️ Não foi possível definir a foto:", e.message);
        }
      }

      // Gera link de convite
      let inviteLink = "Não disponível";
      try {
        await delay(2000);
        const inviteCode = await conn.groupInviteCode(groupId);
        inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
      } catch (e) {}

      // Mensagem no grupo
      await conn.sendMessage(groupId, {
        text: `🎉 *Grupo criado com sucesso!*\n\n📛 *Nome:* ${groupName}\n\n🪐 *LukaModzz BOT*`
      });

      // Confirmação no chat atual
      await conn.sendMessage(from, {
        text: `✅ *Grupo "${groupName}" criado!*\n\n🔗 *Link:* ${inviteLink}\n🆔 *ID:* \`${groupId}\`\n🖼️ *Foto:* ${fs.existsSync(imgPath) ? '✅ Definida' : '❌ Não encontrada'}`,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      }, {
        quoted: { key: { remoteJid: "status@broadcast", fromMe: false, participant: "13135550002@s.whatsapp.net" }, message: { contactMessage: { displayName: pushName, vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=13135550002:556384673123\nEND:VCARD" } } }
      });

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("Erro criargrupo:", error);
      
      let errorMsg = "❌ Erro ao criar grupo!";
      if (error.data === 429) {
        errorMsg = "❌ *Limite de criação excedido!*\n\n⚠️ O WhatsApp limita a criação de grupos.\n⏳ Aguarde alguns minutos e tente novamente.";
      }
      
      await conn.sendMessage(from, { 
        text: errorMsg,
        contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: "LukaModzz", serverMessageId: 116 } }
      }, { quoted: msg });
    }
  }
};

function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}