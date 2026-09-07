// Menu: Dono - Mensagens | Comando: copiar
// commands/admins/copiar.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { sendButtons, sendInteractiveMessage } = require("gifted-btns");

// ==============================================
// CACHE DE MENSAGENS (para mensagens completas)
// ==============================================
const messagesCache = new Map();

// ==============================================
// FUNÇÕES AUXILIARES
// ==============================================

async function getFileBuffer(msgObj, tipo) {
  const { downloadMediaMessage } = require("@whiskeysockets/baileys");
  const quotedMsg = {
    message: { [tipo + "Message"]: msgObj },
    key: { remoteJid: "0@s.whatsapp.net", fromMe: false }
  };
  return await downloadMediaMessage(quotedMsg, "buffer", {}, {});
}

async function writeExifImg(buffer, metadata) {
  return buffer;
}

// ==============================================
// FUNÇÃO PARA CONVERTER BOTÕES DO WHATSAPP PARA GIFTED-BTNS
// ==============================================
function converterBotoesParaGifted(buttonsMessage) {
  try {
    const giftedButtons = [];

    // Verifica se é buttonsMessage
    if (buttonsMessage.buttonsMessage) {
      const btnMsg = buttonsMessage.buttonsMessage;

      // Tenta extrair botões
      if (btnMsg.buttons && Array.isArray(btnMsg.buttons)) {
        for (const btn of btnMsg.buttons) {
          if (btn.buttonId && btn.buttonText) {
            giftedButtons.push({
              id: btn.buttonId,
              text: btn.buttonText.displayText || btn.buttonText || "Botão"
            });
          }
        }
      }

      // Tenta extrair de nativeFlowMessage
      if (btnMsg.nativeFlowMessage?.buttons) {
        for (const btn of btnMsg.nativeFlowMessage.buttons) {
          if (btn.name === "quick_reply" || btn.name === "cta_url") {
            try {
              const params = JSON.parse(btn.buttonParamsJson || '{}');
              giftedButtons.push({
                id: params.id || `btn_${Date.now()}`,
                text: params.display_text || "Botão",
                url: params.url || null
              });
            } catch (e) {}
          }
        }
      }

      // Tenta extrair de interactiveMessage
      if (btnMsg.interactiveMessage?.nativeFlowMessage?.buttons) {
        for (const btn of btnMsg.interactiveMessage.nativeFlowMessage.buttons) {
          if (btn.name === "quick_reply" || btn.name === "cta_url") {
            try {
              const params = JSON.parse(btn.buttonParamsJson || '{}');
              giftedButtons.push({
                id: params.id || `btn_${Date.now()}`,
                text: params.display_text || "Botão",
                url: params.url || null
              });
            } catch (e) {}
          }
        }
      }
    }

    // Verifica se é interactiveMessage diretamente
    if (buttonsMessage.interactiveMessage?.nativeFlowMessage?.buttons) {
      for (const btn of buttonsMessage.interactiveMessage.nativeFlowMessage.buttons) {
        if (btn.name === "quick_reply" || btn.name === "cta_url") {
          try {
            const params = JSON.parse(btn.buttonParamsJson || '{}');
            giftedButtons.push({
              id: params.id || `btn_${Date.now()}`,
              text: params.display_text || "Botão",
              url: params.url || null
            });
          } catch (e) {}
        }
      }
    }

    return giftedButtons;
  } catch (e) {
    console.error("Erro ao converter botões:", e);
    return [];
  }
}

// ==============================================
// FUNÇÃO PARA EXTRAIR TEXTO DE MENSAGEM INTERATIVA
// ==============================================
function extrairTextoInterativo(msgObj) {
  try {
    // Tenta extrair de buttonsMessage
    if (msgObj.buttonsMessage) {
      return msgObj.buttonsMessage.contentText?.text ||
             msgObj.buttonsMessage.text ||
             msgObj.buttonsMessage.contentText ||
             "";
    }

    // Tenta extrair de interactiveMessage
    if (msgObj.interactiveMessage) {
      return msgObj.interactiveMessage.body?.text ||
             msgObj.interactiveMessage.header?.text ||
             msgObj.interactiveMessage.footer?.text ||
             "";
    }

    // Tenta extrair de templateMessage
    if (msgObj.templateMessage) {
      return msgObj.templateMessage.text || "";
    }

    // Tenta extrair de listMessage
    if (msgObj.listMessage) {
      return msgObj.listMessage.description ||
             msgObj.listMessage.title ||
             "";
    }

    return "";
  } catch (e) {
    return "";
  }
}

// ==============================================
// FUNÇÃO PARA EXTRAIR TÍTULO DE MENSAGEM INTERATIVA
// ==============================================
function extrairTituloInterativo(msgObj) {
  try {
    if (msgObj.buttonsMessage?.header?.title) {
      return msgObj.buttonsMessage.header.title;
    }
    if (msgObj.interactiveMessage?.header?.title) {
      return msgObj.interactiveMessage.header.title;
    }
    if (msgObj.listMessage?.title) {
      return msgObj.listMessage.title;
    }
    return null;
  } catch (e) {
    return null;
  }
}

// ==============================================
// COMANDO
// ==============================================

module.exports = {
  permissions: { owner: true },
  name: "copiar",
  aliases: ["clonar", "copy", "clone"],
  description: "ᴄʟᴏɴᴀ ᴏᴜᴛʀᴀs ᴍᴇɴsᴀɢᴇɴs (ɪᴍᴀɢᴇᴍ, ᴠɪᴅᴇᴏ, sᴛɪᴄᴋᴇʀ, ᴛᴇxᴛᴏ ᴇ ᴏᴜᴛʀᴏs)",
  async execute(conn, msg, args, from, axiosInstance, cmdUsado) {
    try {
      const owner = config.ownerName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const ownerLid = config.ownerLid || "";
      const prefix = config.prefix || ".";

      let pushName = "ᴜsᴜᴀ́ʀɪᴏ";
      try { pushName = msg.pushName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; } catch (e) { pushName = "ʟᴜᴋᴀᴍᴏᴅᴢᴢ"; }

      // ==============================================
      // EXTRAI DADOS
      // ==============================================
      const ctx = msg.message?.extendedTextMessage?.contextInfo;
      const citada = ctx?.quotedMessage;
      const sender = msg.key.participant || msg.key.remoteJid || from;
      const numeroUsuario = sender.replace(/[^0-9]/g, "");

      // ==============================================
      // VERIFICA SE ESTÁ RESPONDENDO A UMA MENSAGEM
      // ==============================================
      if (!citada) {
        return await conn.sendMessage(from, {
          text: `📋 *ᴄᴏᴘɪᴀʀ*

ʀᴇsᴘᴏɴᴅᴀ/ᴍᴀʀǫᴜᴇ ᴜᴍᴀ ᴍᴇɴsᴀɢᴇᴍ ᴄᴏᴍ:
${prefix + module.exports.name}

ᴇᴜ ᴛᴇɴᴛᴏ ᴄʟᴏɴᴀʀ ᴛᴇxᴛᴏ, ɪᴍᴀɢᴇᴍ, ᴠɪ́ᴅᴇᴏ, ᴀ́ᴜᴅɪᴏ, sᴛɪᴄᴋᴇʀ, ᴅᴏᴄᴜᴍᴇɴᴛᴏ, ᴇɴǫᴜᴇᴛᴇ, ᴄᴏɴᴛᴀᴛᴏ, ʟᴏᴄᴀʟɪᴢᴀᴄ̧ᴀ̃ᴏ, ʙᴏᴛᴏ̃ᴇs, ʟɪsᴛᴀs ᴇ ᴄᴀʀʀᴏssᴇʟ.`,
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

      // ==============================================
      // REAÇÃO
      // ==============================================
      await conn.sendMessage(from, { react: { text: "📋", key: msg.key } });

      // ==============================================
      // TENTA PEGAR DO CACHE
      // ==============================================
      const stanzaId = ctx?.stanzaId || null;
      const fonteCompleta = typeof messagesCache !== "undefined" && stanzaId
        ? messagesCache.get(stanzaId)
        : null;

      const baseMsg = fonteCompleta || citada;
      const veioDoCache = !!fonteCompleta;

      // ==============================================
      // DESEMBRULHA MENSAGEM (view once, ephemeral, etc)
      // ==============================================
      function desembrulhar(m) {
        let msgObj = m;
        for (let i = 0; i < 5 && msgObj; i++) {
          if (msgObj.viewOnceMessageV2?.message) msgObj = msgObj.viewOnceMessageV2.message;
          else if (msgObj.viewOnceMessageV2Extension?.message) msgObj = msgObj.viewOnceMessageV2Extension.message;
          else if (msgObj.viewOnceMessage?.message) msgObj = msgObj.viewOnceMessage.message;
          else if (msgObj.ephemeralMessage?.message) msgObj = msgObj.ephemeralMessage.message;
          else if (msgObj.documentWithCaptionMessage?.message) msgObj = msgObj.documentWithCaptionMessage.message;
          else break;
        }
        return msgObj;
      }

      const msgObj = desembrulhar(baseMsg);
      const tipo = Object.keys(msgObj || {})[0] || "desconhecido";

      // ==============================================
      // RELATÓRIO
      // ==============================================
      const relatorio =
        `╭━━〔 📋 ᴄʟᴏɴᴀᴅᴏʀ 〕━━╮
┃ 🎯 ᴛɪᴘᴏ: ${tipo}
┃ 📡 ғᴏɴᴛᴇ: ${veioDoCache ? "ᴄᴀᴄʜᴇ ᴄᴏᴍᴘʟᴇᴛᴀ" : "ᴍᴇɴsᴀɢᴇᴍ ᴍᴀʀᴄᴀᴅᴀ"}
╰━━━━━━━━━━━━━━━━━━╯`;

      // ==============================================
      // CLONA BOTÕES / INTERATIVOS (USANDO GIFTED-BTNS)
      // ==============================================
      if (
        msgObj.interactiveMessage ||
        msgObj.buttonsMessage ||
        msgObj.templateMessage ||
        msgObj.listMessage ||
        msgObj.productMessage
      ) {
        // Extrai texto e botões
        const textoInterativo = extrairTextoInterativo(msgObj);
        const titulo = extrairTituloInterativo(msgObj);
        const botoes = converterBotoesParaGifted(msgObj);

        // Prepara o texto
        let textFinal = relatorio;
        if (textoInterativo) {
          textFinal += `\n\n${textoInterativo}`;
        }
        if (titulo) {
          textFinal = `📌 *${titulo}*\n\n${textFinal}`;
        }

        // Se tem botões, usa gifted-btns
        if (botoes && botoes.length > 0) {
          // Separa botões de URL e de reply
          const urlButtons = botoes.filter(b => b.url);
          const replyButtons = botoes.filter(b => !b.url);

          // Monta os botões no formato do gifted-btns
          const giftedButtons = [];

          // Botões de reply (quick_reply)
          if (replyButtons.length > 0) {
            for (const btn of replyButtons) {
              giftedButtons.push({
                name: "quick_reply",
                buttonParamsJson: JSON.stringify({
                  display_text: btn.text || "Botão",
                  id: btn.id || `btn_${Date.now()}`
                })
              });
            }
          }

          // Botões de URL (cta_url)
          if (urlButtons.length > 0) {
            for (const btn of urlButtons) {
              giftedButtons.push({
                name: "cta_url",
                buttonParamsJson: JSON.stringify({
                  display_text: btn.text || "Link",
                  url: btn.url || "https://wa.me/"
                })
              });
            }
          }

          // Envia com gifted-btns
          if (giftedButtons.length > 0) {
            await sendInteractiveMessage(conn, from, {
              text: textFinal,
              footer: "ʟᴜᴋᴀᴍᴏᴅᴢᴢ • ᴄʟᴏɴᴀᴅᴏʀ",
              contextInfo: {
                forwardingScore: 1,
                isForwarded: true,
                forwardedNewsletterMessageInfo: {
                  newsletterJid: "120363426698503859@newsletter",
                  newsletterName: `${bot}`,
                  serverMessageId: 116
                }
              },
              interactiveButtons: giftedButtons
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
          }
        }

        // Se não tem botões, tenta relay normal
        try {
          await conn.sendMessage(from, {
            text: textFinal,
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
        } catch (e) {
          return await conn.sendMessage(from, {
            text: `❌ ɴᴀ̃ᴏ ᴄᴏɴsᴇɢᴜɪ ᴄʟᴏɴᴀʀ ᴇssᴇ ʀɪᴄʜ/ɪɴᴛᴇʀᴀᴛɪᴠᴏ.

ᴇʀʀᴏ: ${e.message}`,
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

      // ==============================================
      // CLONA IMAGEM
      // ==============================================
      if (msgObj.imageMessage) {
        const o = msgObj.imageMessage;
        const buf = await getFileBuffer(o, "image");

        await conn.sendMessage(from, {
          image: buf,
          caption: o.caption ? `${relatorio}\n\n${o.caption}` : relatorio,
          mimetype: o.mimetype || "image/jpeg",
          ...(o.viewOnce ? { viewOnce: true } : {})
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
      }

      // ==============================================
      // CLONA VÍDEO
      // ==============================================
      if (msgObj.videoMessage) {
        const o = msgObj.videoMessage;
        const buf = await getFileBuffer(o, "video");

        await conn.sendMessage(from, {
          video: buf,
          caption: o.caption ? `${relatorio}\n\n${o.caption}` : relatorio,
          mimetype: o.mimetype || "video/mp4",
          gifPlayback: !!o.gifPlayback,
          ...(o.viewOnce ? { viewOnce: true } : {})
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
      }

      // ==============================================
      // CLONA ÁUDIO
      // ==============================================
      if (msgObj.audioMessage) {
        const o = msgObj.audioMessage;
        const buf = await getFileBuffer(o, "audio");

        await conn.sendMessage(from, {
          text: relatorio,
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

        await conn.sendMessage(from, {
          audio: buf,
          mimetype: o.mimetype || "audio/ogg; codecs=opus",
          ptt: !!o.ptt
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
      }

      // ==============================================
      // CLONA STICKER
      // ==============================================
      if (msgObj.stickerMessage) {
        const o = msgObj.stickerMessage;
        const buf = await getFileBuffer(o, "sticker");

        try {
          if (typeof writeExifImg === "function") {
            const stickerExif = await writeExifImg(buf, {
              packname: "Zyron-MD Copy",
              author: "GzeeScriptsDev"
            });

            const envio = typeof stickerExif === "string"
              ? { sticker: fs.readFileSync(stickerExif) }
              : { sticker: stickerExif };

            await conn.sendMessage(from, envio, {
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

            if (typeof stickerExif === "string") {
              try { fs.unlinkSync(stickerExif); } catch {}
            }
          } else {
            await conn.sendMessage(from, { sticker: buf }, {
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
        } catch {
          await conn.sendMessage(from, { sticker: buf }, {
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

        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
        return;
      }

      // ==============================================
      // CLONA DOCUMENTO
      // ==============================================
      if (msgObj.documentMessage) {
        const o = msgObj.documentMessage;
        const buf = await getFileBuffer(o, "document");

        await conn.sendMessage(from, {
          document: buf,
          mimetype: o.mimetype || "application/octet-stream",
          fileName: o.fileName || "arquivo",
          caption: o.caption ? `${relatorio}\n\n${o.caption}` : relatorio
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
      }

      // ==============================================
      // CLONA ENQUETE
      // ==============================================
      if (msgObj.pollCreationMessage || msgObj.pollCreationMessageV3) {
        const o = msgObj.pollCreationMessageV3 || msgObj.pollCreationMessage;
        const opcoes = (o.options || []).map(op => op.optionName).filter(Boolean);

        await conn.sendMessage(from, {
          text: relatorio,
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

        await conn.sendMessage(from, {
          poll: {
            name: o.name || "Enquete",
            values: opcoes.length ? opcoes : ["Opção 1", "Opção 2"],
            selectableCount: o.selectableOptionsCount || 1
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
      }

      // ==============================================
      // CLONA LOCALIZAÇÃO
      // ==============================================
      if (msgObj.locationMessage) {
        const o = msgObj.locationMessage;

        await conn.sendMessage(from, {
          text: relatorio,
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

        await conn.sendMessage(from, {
          location: {
            degreesLatitude: o.degreesLatitude,
            degreesLongitude: o.degreesLongitude
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
      }

      // ==============================================
      // CLONA CONTATO
      // ==============================================
      if (msgObj.contactMessage) {
        const o = msgObj.contactMessage;

        await conn.sendMessage(from, {
          text: relatorio,
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

        await conn.sendMessage(from, {
          contacts: {
            displayName: o.displayName || "Contato",
            contacts: [{ vcard: o.vcard }]
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
      }

      // ==============================================
      // CLONA TEXTO
      // ==============================================
      const textoMsg = msgObj.conversation || msgObj.extendedTextMessage?.text;

      if (textoMsg) {
        const ctxCitado = msgObj.extendedTextMessage?.contextInfo || {};

        const payload = {
          text: `${relatorio}\n\n${textoMsg}`
        };

        if (ctxCitado.externalAdReply) {
          payload.contextInfo = {
            externalAdReply: ctxCitado.externalAdReply
          };
        }

        if (Array.isArray(ctxCitado.mentionedJid) && ctxCitado.mentionedJid.length) {
          payload.mentions = ctxCitado.mentionedJid;
        }

        await conn.sendMessage(from, payload, {
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
      }

      // ==============================================
      // FALLBACK: TENTA RELAY
      // ==============================================
      try {
        await conn.sendMessage(from, {
          text: relatorio,
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

        const mid = crypto.randomBytes(10).toString("hex").toUpperCase();
        await conn.relayMessage(from, msgObj, { messageId: mid });
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
      } catch (e) {
        await conn.sendMessage(from, { react: { text: "❌", key: msg.key } });
        await conn.sendMessage(from, {
          text: `❌ ɴᴀ̃ᴏ ᴄᴏɴsᴇɢᴜɪ ᴄʟᴏɴᴀʀ ᴇssᴇ ᴛɪᴘᴏ: *${tipo}*

ᴇssᴇ ᴛɪᴘᴏ ᴅᴇ ᴍᴇɴsᴀɢᴇᴍ ᴀɪɴᴅᴀ ɴᴀ̃ᴏ ᴇ́ sᴜᴘᴏʀᴛᴀᴅᴏ ᴘᴇʟᴏ ᴄʟᴏɴᴀᴅᴏʀ.`,
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
      console.error("❌ Erro copiar:", error);
      const sender = msg.key.participant || msg.key.remoteJid || from;
      const numeroUsuario = sender.replace(/[^0-9]/g, "");

      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄʟᴏɴᴀʀ ᴀ ᴍᴇɴsᴀɢᴇᴍ!*\n\n📌 ${error.message}`,
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
  "menuSection": "Mensagens",
  "usage": "copiar (responda à mensagem)",
  "description": "Uso: .copiar (responda à mensagem)"
});
