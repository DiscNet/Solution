const { createStatusQuoted } = require("../../functions/statusCard");
// commands/geral/perfil.js
const config = require("../../config/config");
const axios = require("axios");

module.exports = {
  name: "perfil",
  aliases: ["profile", "meuperfil"],
  description: "ᴍᴏsᴛʀᴀ ᴀs ɪɴғᴏʀᴍᴀᴄ̧ᴏ̃ᴇs ᴅᴏ sᴇᴜ ᴘᴇʀғɪʟ",
  async execute(conn, msg, args, from) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const tokitoApi = config.tokitoApi;

      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      const isGroup = from.endsWith("@g.us");
      let userJid = null;
      let userNumber = "";

      // =====================
      // PEGA O JID DO USUÁRIO (SEMPRE QUEM USOU O COMANDO)
      // =====================
      if (isGroup) {
        userJid = msg.key.participantAlt || msg.key.participant || msg.sender;
      } else {
        userJid = msg.key.remoteJidAlt || msg.key.remoteJid || from;
      }

      if (!userJid) {
        return conn.sendMessage(from, {
          text: "❌ ᴇʀʀᴏ ᴀᴏ ɪᴅᴇɴᴛɪғɪᴄᴀʀ ᴏ ᴜsᴜᴀ́ʀɪᴏ.",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: `${bot}`, serverMessageId: 116 } }
        });
      }

      // Extrai o número
      userNumber = userJid.replace(/[^0-9]/g, "");
      if (userNumber.length > 13) userNumber = userNumber.substring(0, 13);

      console.log("📌 Perfil - JID:", userJid);
      console.log("📌 Perfil - Número:", userNumber);

      // =====================
      // BUSCA O AVATAR DO USUÁRIO
      // =====================
      let avatarUrl = null;

      // 1. PROFILE PICTURE NORMAL
      try {
        avatarUrl = await conn.profilePictureUrl(userJid, "image");
        console.log("✅ Avatar obtido via profilePictureUrl");
      } catch {}

      // 2. FALLBACK LID → PN
      if (!avatarUrl) {
        try {
          const wa = await conn.onWhatsApp(userJid);
          const realJid = wa?.[0]?.jid;
          if (realJid) {
            avatarUrl = await conn.profilePictureUrl(realJid, "image");
            console.log("✅ Avatar obtido via onWhatsApp");
          }
        } catch {}
      }

      // 3. PREVIEW
      if (!avatarUrl) {
        try {
          avatarUrl = await conn.profilePictureUrl(userJid, "preview");
          console.log("✅ Avatar obtido via preview");
        } catch {}
      }

      // 4. IQ DIRETO
      if (!avatarUrl) {
        try {
          const res = await conn.query({
            tag: "iq",
            attrs: {
              to: userJid,
              type: "get",
              xmlns: "w:profile:picture"
            },
            content: [
              {
                tag: "picture",
                attrs: { type: "image" }
              }
            ]
          });
          const pic = res?.content?.find(x => x.tag === "picture");
          avatarUrl = pic?.attrs?.url || null;
          if (avatarUrl) console.log("✅ Avatar obtido via IQ");
        } catch {}
      }

      // Avatar padrão se não tiver foto
      if (!avatarUrl) {
        avatarUrl = "https://raw.githubusercontent.com/dylanModz/uploadsgg/main/midias/imagens/176d2335e4d.jpg";
        console.log("⚠️ Usando avatar padrão");
      }

      // =====================
      // INFORMAÇÕES DO GRUPO (SE FOR GRUPO)
      // =====================
      let grupoNome = "PV";
      let isAdmin = false;
      let isVip = false;
      let bio = "privado, ou sem recado!!";

      if (isGroup) {
        try {
          const groupMetadata = await conn.groupMetadata(from);
          grupoNome = groupMetadata.subject || "Grupo";

          // Verifica se é admin
          isAdmin = groupMetadata.participants.some(p => p.id === userJid && p.admin);

          // Verifica se é VIP (dono ou superadmin)
          isVip = groupMetadata.participants.some(p => p.id === userJid && p.admin === 'superadmin');

        } catch (e) {
          console.log("⚠️ Erro ao obter metadados do grupo:", e.message);
        }
      }

      // Tenta buscar a bio do usuário
      try {
        const contact = await conn.contactQuery(userJid);
        if (contact?.status) {
          bio = contact.status;
        }
      } catch (e) {
        console.log("⚠️ Erro ao buscar bio:", e.message);
      }

      // =====================
      // GERANDO PORCENTAGENS ALEATÓRIAS
      // =====================
      const gayPercent = Math.floor(Math.random() * 101);
      const gadoPercent = Math.floor(Math.random() * 101);
      const gostosuraPercent = Math.floor(Math.random() * 101);
      const putariaPercent = Math.floor(Math.random() * 101);
      const dinheiro = Math.floor(Math.random() * 10000) + 100;

      // =====================
      // CONSTRÓI A URL DO CANVAS
      // =====================
      const nome = encodeURIComponent(pushName);
      const grupo = encodeURIComponent(grupoNome);
      const cargo = isAdmin ? "ADMIN" : "Membro";
      const vip = isVip ? "SIM ✅" : "NAO ❌";
      const bioEncoded = encodeURIComponent(bio || "privado, ou sem recado!!");

      const canvasUrl = `https://tokito-apis.com.br/canvas/perfil?fundo=${encodeURIComponent(avatarUrl)}&avatar=${encodeURIComponent(avatarUrl)}&text=${nome}&subtext=${grupo}&logo=${encodeURIComponent(avatarUrl)}&cargo=${cargo}&vip=${vip}&bio=${bioEncoded}&apikey=${tokitoApi}`;

      console.log("🖼️ Canvas URL:", canvasUrl);

      // =====================
      // BAIXA A IMAGEM DO CANVAS
      // =====================
      let imageBuffer = null;

      try {
        const response = await axios.get(canvasUrl, {
          responseType: "arraybuffer",
          timeout: 30000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        });
        imageBuffer = Buffer.from(response.data);
        console.log("✅ Imagem do perfil baixada com sucesso! Tamanho:", imageBuffer.length);
      } catch (e) {
        console.log("⚠️ Erro ao baixar imagem do canvas:", e.message);
      }

      // =====================
      // TEXTO DO PERFIL (NOVO FORMATO)
      // =====================
      const textProfile = `*👤 | ᴘᴇʀғɪʟ ᴅᴏ ᴜsᴜᴀʀɪᴏ*

- *👤 | ᴜsᴜᴀ́ʀɪᴏ* → *@${pushName}*
- *📱 | ɴᴜᴍᴇʀᴏ → ${userNumber}*
- *🗒️ | ʙɪᴏ → ${bio}*
- *💎 | ᴠɪᴘ → ${vip}*
- *🧰 | ᴄᴀʀɢᴏ → ${cargo}*
- *🏘️ | ɢʀᴜᴘᴏ → ${grupoNome}*
- *🐂 | ɴɪᴠᴇʟ ɢᴀᴅᴏ → ${gadoPercent}%*
- *😋 | ɢᴏsᴛᴏsᴜʀᴀ → ${gostosuraPercent}%*
- *🏳️‍🌈 | ɢᴀʏ → ${gayPercent}%*
- *🔞 | ᴘᴜᴛᴀʀɪᴀ → ${putariaPercent}%*
- *💰 | ᴘʀᴏɢʀᴀᴍᴀ → R$${dinheiro.toLocaleString('pt-BR')}*

> 🌫️ | ᴜᴛɪʟɪᴢᴇ ${prefix}menu ᴘᴀʀᴀ ʀᴇᴄᴇʙᴇʀ ᴀ ʟɪsᴛᴀ ᴅᴇ ᴄᴏᴍᴀɴᴅᴏs`;

      // =====================
      // ENVIA A RESPOSTA
      // =====================
      await conn.sendMessage(from, { react: { text: "👤", key: msg.key } });

      if (imageBuffer && imageBuffer.length > 1000) {
        // Envia a imagem do canvas
        await conn.sendMessage(from, {
          image: imageBuffer,
          caption: textProfile,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, {
          quoted: createStatusQuoted(msg)
        });
      } else {
        // Fallback: envia só o texto
        await conn.sendMessage(from, {
          text: textProfile,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

    } catch (error) {
      console.error("❌ Erro perfil:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ɢᴇʀᴀʀ ᴘᴇʀғɪʟ!*\n\n📌 ${error.message}`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: `${bot}`,
            serverMessageId: 116
          }
        }
      }, { quoted: msg });
    }
  }
};