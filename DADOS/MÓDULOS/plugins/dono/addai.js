// Menu: Dono - Grupos | Comando: addai
// commands/dono/addai.js
const config = require("../../../config/config");

module.exports = {
  permissions: { owner: true },
  name: "addai",
  aliases: ["adicionarai", "metai"],
  description: "ᴀᴅɪᴄɪᴏɴᴀ ᴀ ᴍᴇᴛᴀ ᴀɪ ᴀᴏ ɢʀᴜᴘᴏ (ᴀᴘᴇɴᴀs ᴅᴏɴᴏ)",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefix = config.prefix || ".";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      const sender = msg.key.participant || msg.key.remoteJid || from;
      const numeroUsuario = sender.replace(/[^0-9]/g, "");

      // VERIFICA SE É O DONO
      const isOwner = sender === ownerLid || numeroUsuario === ownerLid.replace(/[^0-9]/g, "");

      if (!isOwner) {
        return await conn.sendMessage(from, {
          text: "❌ ᴀᴘᴇɴᴀs ᴏ ᴅᴏɴᴏ ᴘᴏᴅᴇ ᴜsᴀʀ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ!",
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
          quoted: {
            key: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              participant: `${numeroUsuario}@s.whatsapp.net`
            },
            message: {
              contactMessage: {
                displayName: pushName,
                vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=" + numeroUsuario + ":" + numeroUsuario + "\nEND:VCARD"
              }
            }
          }
        });
      }

      // VERIFICA SE É UM GRUPO
      if (!from.endsWith("@g.us")) {
        return await conn.sendMessage(from, {
          text: "❌ ᴇsᴛᴇ ᴄᴏᴍᴀɴᴅᴏ sᴏ́ ᴘᴏᴅᴇ sᴇʀ ᴜsᴀᴅᴏ ᴇᴍ ɢʀᴜᴘᴏs!",
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
          quoted: {
            key: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              participant: `${numeroUsuario}@s.whatsapp.net`
            },
            message: {
              contactMessage: {
                displayName: pushName,
                vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=" + numeroUsuario + ":" + numeroUsuario + "\nEND:VCARD"
              }
            }
          }
        });
      }

      // 🔥 JID DA META AI
      const META_AI_JID = "867051314767696@bot";

      // 🔥 TENTA ADICIONAR A META AI
      try {
        await conn.groupParticipantsUpdate(from, [META_AI_JID], "add");

        await conn.sendMessage(from, {
          text: `✅ ᴍᴇᴛᴀ ᴀɪ ғᴏɪ ᴀᴅɪᴄɪᴏɴᴀᴅᴀ ᴀᴏ ɢʀᴜᴘᴏ ᴄᴏᴍ sᴜᴄᴇssᴏ!`,
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
          quoted: {
            key: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              participant: `${numeroUsuario}@s.whatsapp.net`
            },
            message: {
              contactMessage: {
                displayName: pushName,
                vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=" + numeroUsuario + ":" + numeroUsuario + "\nEND:VCARD"
              }
            }
          }
        });

        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });

      } catch (error) {
        console.error("❌ Erro ao adicionar Meta AI:", error);

        // 🔥 TENTATIVA ALTERNATIVA: Adicionar como contato primeiro
        if (error.message.includes("account_reachout_restricted")) {
          try {
            // Tenta adicionar como contato
            await conn.sendMessage(META_AI_JID, {
              text: "👋 ᴏʟá! ᴇsᴛᴏᴜ ᴛᴇɴᴛᴀɴᴅᴏ ᴀᴅɪᴄɪᴏɴᴀʀ ᴠᴏᴄê ᴀᴏ ɢʀᴜᴘᴏ."
            });

            // Aguarda 2 segundos
            await new Promise(resolve => setTimeout(resolve, 2000));

            // Tenta adicionar novamente
            await conn.groupParticipantsUpdate(from, [META_AI_JID], "add");

            await conn.sendMessage(from, {
              text: `✅ ᴍᴇᴛᴀ ᴀɪ ғᴏɪ ᴀᴅɪᴄɪᴏɴᴀᴅᴀ ᴀᴏ ɢʀᴜᴘᴏ ᴀᴘᴏs ᴄᴏɴᴛᴀᴛᴏ ɪɴɪᴄɪᴀʟ!`,
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
              quoted: {
                key: {
                  remoteJid: "0@s.whatsapp.net",
                  fromMe: false,
                  participant: `${numeroUsuario}@s.whatsapp.net`
                },
                message: {
                  contactMessage: {
                    displayName: pushName,
                    vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=" + numeroUsuario + ":" + numeroUsuario + "\nEND:VCARD"
                  }
                }
              }
            });

            await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
            return;

          } catch (e2) {
            console.error("❌ Tentativa alternativa falhou:", e2);
          }
        }

        // 🔥 FALLBACK: Gerar link de convite
        let errorMsg = "❌ ɴᴀ̃ᴏ ғᴏɪ ᴘᴏssɪ́ᴠᴇʟ ᴀᴅɪᴄɪᴏɴᴀʀ ᴀ ᴍᴇᴛᴀ ᴀɪ ᴀᴏ ɢʀᴜᴘᴏ.\n\n";

        if (error.message.includes("account_reachout_restricted")) {
          errorMsg += "🔒 ᴀ ᴍᴇᴛᴀ ᴀɪ ᴛᴇᴍ ʀᴇsᴛʀɪᴄ̧ᴏ̃ᴇs ᴅᴇ ᴘʀɪᴠᴀᴄɪᴅᴀᴅᴇ.\n\n";
          errorMsg += "📌 sᴏʟᴜᴄ̧ᴏ̃ᴇs:\n";
          errorMsg += "1️⃣ ᴀᴅɪᴄɪᴏɴᴇ ᴏ ɴᴜ́ᴍᴇʀᴏ ᴅᴀ ᴍᴇᴛᴀ ᴀɪ ɴᴏs sᴇᴜs ᴄᴏɴᴛᴀᴛᴏs\n";
          errorMsg += "2️⃣ ᴘᴇᴄ̧ᴀ ᴀ ᴘᴀʀᴀ ᴀ ᴍᴇᴛᴀ ᴀɪ ᴛᴇ ʀᴇsᴘᴏɴᴅᴇʀ ᴘʀɪᴠᴀᴅᴀᴍᴇɴᴛᴇ\n";
          errorMsg += "3️⃣ ᴀᴅɪᴄɪᴏɴᴇ ᴍᴀɴᴜᴀʟᴍᴇɴᴛᴇ ᴘᴇʟᴏ ʟɪɴᴋ ᴀʙᴀɪxᴏ";

          // Tenta gerar link de convite
          try {
            const inviteCode = await conn.groupInviteCode(from);
            const inviteLink = `https://chat.whatsapp.com/${inviteCode}`;
            errorMsg += `\n\n🔗 *ʟɪɴᴋ ᴅᴏ ɢʀᴜᴘᴏ:*\n${inviteLink}`;
          } catch (e) {}
        } else {
          errorMsg += `📌 ᴇʀʀᴏ: ${error.message}`;
        }

        await conn.sendMessage(from, {
          text: errorMsg,
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
          quoted: {
            key: {
              remoteJid: "0@s.whatsapp.net",
              fromMe: false,
              participant: `${numeroUsuario}@s.whatsapp.net`
            },
            message: {
              contactMessage: {
                displayName: pushName,
                vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=" + numeroUsuario + ":" + numeroUsuario + "\nEND:VCARD"
              }
            }
          }
        });
      }

    } catch (error) {
      console.error("❌ Erro addai:", error);
      const sender = msg.key.participant || msg.key.remoteJid || from;
      const numeroUsuario = sender.replace(/[^0-9]/g, "");

      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ!*\n\n📌 ${error.message}`,
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
        quoted: {
          key: {
            remoteJid: "0@s.whatsapp.net",
            fromMe: false,
            participant: `${numeroUsuario}@s.whatsapp.net`
          },
          message: {
            contactMessage: {
              displayName: pushName,
              vcard: "BEGIN:VCARD\nVERSION:3.0\nFN:" + pushName + "\nORG:" + owner + ";\nTEL;type=CELL;type=VOICE;waid=" + numeroUsuario + ":" + numeroUsuario + "\nEND:VCARD"
            }
          }
        }
      });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Dono",
  "menuSection": "Grupos",
  "description": "adiciona a meta ai ao grupo"
});
