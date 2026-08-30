const { createStatusQuoted } = require("../../functions/statusCard");
// commands/menu.js
const config = require("../../config/config");
const readmore = String.fromCharCode(8206).repeat(4001);
const { sendInteractiveMessage } = require("gifted-btns");
const fs = require('fs');
const path = require('path');

// URL da imagem do menu
const IMAGE_URL = "https://ik.imagekit.io/f6qfdj7c6p/Grimm%20V2%20(1).jpg";

// Número do desenvolvedor fixado a partir do banner ativo
const DEV_NUMBER = "5563984673123";

// Função para pegar frase aleatória
function getFraseFilosofica() {
  try {
    const frasesPath = path.join(__dirname, '..', '..', 'database', 'frases.json');
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

// 🔥 FUNÇÃO PARA PEGAR O NÚMERO DO USUÁRIO
function getNumeroUsuario(msg) {
  // Tenta pegar de várias fontes
  let numero = null;
  
  // 1. Tentar pelo participantAlt
  if (msg.key?.participantAlt) {
    numero = msg.key.participantAlt.replace(/[^0-9]/g, '');
  }
  
  // 2. Tentar pelo participant
  if (!numero && msg.key?.participant) {
    numero = msg.key.participant.replace(/[^0-9]/g, '');
  }
  
  // 3. Tentar pelo remoteJidAlt
  if (!numero && msg.key?.remoteJidAlt) {
    numero = msg.key.remoteJidAlt.replace(/[^0-9]/g, '');
  }
  
  // 4. Tentar pelo remoteJid
  if (!numero && msg.key?.remoteJid) {
    numero = msg.key.remoteJid.replace(/[^0-9]/g, '');
  }
  
  // 5. Tentar pelo sender (fallback)
  if (!numero && msg.sender) {
    numero = msg.sender.replace(/[^0-9]/g, '');
  }
  
  // Se ainda não tem, usa o número do desenvolvedor como fallback
  if (!numero || numero.length < 10) {
    numero = DEV_NUMBER;
  }
  
  return numero;
}

module.exports = {
  name: "menu",
  description: "𝑴𝒆𝒏𝒖 𝒑𝒓𝒊𝒏𝒄𝒊𝒑𝒂𝒍 𝒄𝒐𝒎 𝒄𝒂𝒕𝒆𝒈𝒐𝒓𝒊𝒂𝒔",

  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const owner = config.ownerName || "LukaModzz";
      const name = config.botName || "LukaModzz BOT";

      // Pega o Push Name da pessoa que usou o comando
      let pushName = "Usuário";
      try {
        pushName = msg.pushName || msg.message?.extendedTextMessage?.contextInfo?.pushName || "Usuário";
      } catch (e) {
        pushName = "Usuário";
      }

      // 🔥 PEGA O NÚMERO DO USUÁRIO
      const numeroUsuario = getNumeroUsuario(msg);
      console.log(`📱 Número do usuário: ${numeroUsuario}`);

      const menuText = `
╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮
├̬⌑ؔ͟ ⎾🧊⏌͟ˉ̵͟͞𝙱𝚘𝚝: ${name}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙳𝚎𝚟: ${owner}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: ${new Date().toLocaleTimeString("pt-BR")}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: ${prefix}
├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙱𝚊𝚒𝚕𝚎𝚢𝚜: 7.0.0-rc13
╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯
`;

      // ==============================================
      // ENVIA O MENU PRINCIPAL INTERATIVO
      // ==============================================
      await sendInteractiveMessage(conn, from, {
        text: menuText,
        footer: "Esᴄᴏʟʜᴀ ᴀ ᴏᴘᴄ̧ᴀ̃ᴏ ᴀʙᴀɪxᴏ",
        image: { url: IMAGE_URL },
        aimode: true,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: "LukaModzz",
            serverMessageId: 116
          }
        },

        interactiveButtons: [
          // 📜 LISTA DE MENUS
          {
            name: "single_select",
            buttonParamsJson: JSON.stringify({
              title: "『🧊』𝐌𝐄𝐍𝐔『🧊』",
              sections: [
                {
                  title: "       》𝐌𝐄𝐍𝐔 𝐋𝐈𝐒𝐓𝐀《",
                  rows: [
                    {
                      id: `${prefix}menugeral`,
                      title: "   『🧊』𝗠𝗘𝗡𝗨 𝗚𝗘𝗥𝗔𝗟",
                      description: "ᴍᴇɴᴜ ᴄᴏᴍᴘʟᴇᴛᴏ ᴄᴏᴍ ᴛᴏᴅᴏs ᴏs ᴄᴏᴍᴀɴᴅᴏs"
                    },
                    
                    {
                      id: `${prefix}menuadm`,
                      title: "   『🧊』𝗠𝗘𝗡𝗨 𝗔𝗗𝗠",
                      description: "ᴄᴏᴍᴀɴᴅᴏs ʀᴇsᴛʀɪᴛᴏs ᴀ ᴀᴅᴍɪɴɪsᴛʀᴀᴄ̧ᴀ̃ᴏ"
                    },
                    
                    {
                      id: `${prefix}menudono`,
                      title: "   『🧊』𝗠𝗘𝗡𝗨 𝗗𝗢𝗡𝗢",
                      description: "ᴄᴏᴍᴀɴᴅᴏs ᴅᴇsᴛɪɴᴀᴅᴏs ᴀᴏ ᴅᴏɴᴏ"
                    },
                    
                    {
                      id: `${prefix}menurpg`,
                      title: "   『🧊』𝗠𝗘𝗡𝗨 𝗥𝗣𝗚",
                      description: "ᴄᴏᴍᴀɴᴅᴏs ᴅᴏ ʀᴘɢ"
                    },
                    
                    {
                      id: `${prefix}menusticker`,
                      title: "   『🧊』𝗠𝗘𝗡𝗨 𝗦𝗧𝗜𝗖𝗞𝗘𝗥",
                      description: "ᴄᴏᴍᴀɴᴅᴏs ʀᴇʟᴀᴄɪᴏɴᴀᴅᴏs ᴀ̀ ғɪɢᴜʀɪɴʜᴀs"
                    },
                    
                    {
                      id: `${prefix}menudws`,
                      title: "   『🧊』𝗠𝗘𝗡𝗨 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗦",
                      description: "ᴄᴏᴍᴀɴᴅᴏs ᴅᴇ ᴅᴏᴡɴʟᴏᴀᴅ ᴅᴇ ᴍɪᴅɪᴀ/ᴀʀǫᴜɪᴠᴏs"
                    },
                    
                    {
                      id: `${prefix}menualterar`,
                      title: "   『🧊』𝗠𝗘𝗡𝗨 𝗔𝗟𝗧𝗘𝗥𝗔𝗗𝗢𝗥𝗘𝗦",
                      description: "ᴄᴏᴍᴀɴᴅᴏs ᴘᴀʀᴀ ᴀʟᴛᴇʀᴀʀ ᴍɪᴅɪᴀ ᴇ ᴇɴᴛʀᴇ ᴏᴜᴛʀᴏs"
                    },
                    
                    {
                      id: `${prefix}menubn`,
                      title: "   『🧊』𝗠𝗘𝗡𝗨 𝗕𝗥𝗜𝗡𝗖𝗔𝗗𝗘𝗜𝗥𝗔𝗦",
                      description: `ᴄᴏᴍᴀɴᴅᴏs ᴅᴇ ʙʀɪɴᴄᴀᴅᴇɪʀᴀs ᴄᴏᴍᴏ${prefix}ɢᴀʏ ᴇ ᴏᴜᴛʀᴏs`
                    }
                  ]
                },
                {
                  title: "       》𝐄𝐗𝐓𝐑𝐀𝐒《",
                  rows: [
                    {
                      id: `${prefix}ping`,
                      title: "   『💎』𝐏𝐈𝐍𝐆",
                      description: "Vᴇʀɪғɪᴄᴀʀ ʟᴀᴛᴇ̂ɴᴄɪᴀ ᴅᴏ ʙᴏᴛ"
                    },
                    {
                      id: `${prefix}alugarbot`,
                      title: "   『💎』𝐀𝐋𝐔𝐆𝐀𝐑 𝐁𝐎𝐓",
                      description: "Iɴғᴏʀᴍᴀçõᴇs ᴘᴀʀᴀ ᴀ ᴀʟᴜɢᴜᴇʟ ᴅᴏ ʙᴏᴛ"
                    }
                  ]
                }
              ]
            })
          },

          // 🔥 BOTÃO DO CANAL
          {
            name: "cta_url",
            buttonParamsJson: JSON.stringify({
              display_text: "『〩』𝐆𝐫𝐮𝐩𝐨𝐎𝐟𝐢𝐜𝐢𝐚𝐥『〩』",
              url: "https://chat.whatsapp.com/DgzrFZtkitBHZvNNYbuEKr?s=cl&p=a&ilr=4",
              merchant_url: "https://chat.whatsapp.com/DgzrFZtkitBHZvNNYbuEKr?s=cl&p=a&ilr=4"
            })
          },
        ]
      }, {
        // ==============================================
        // INTEGRAÇÃO DE CONTATO COM PUSH NAME
        // ==============================================
        quoted: createStatusQuoted(msg)
      });

      // ✅ reação
      await conn.sendMessage(from, {
        react: { text: "🧊", key: msg.key }
      });

    } catch (error) {
      console.error("Erro no menu:", error);

      await conn.sendMessage(
        from,
        { text: "❌ Erro ao gerar menu." },
        { quoted: msg }
      );
    }
  }
};