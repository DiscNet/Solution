// commands/lid.js
const util = require("util");

module.exports = {
  name: "lid",
  description: "𝑶𝒃𝒕𝒆́𝒎 𝒐 𝑳𝑰𝑫 𝒅𝒆 𝒖𝒎 𝒖𝒔𝒖𝒂́𝒓𝒊𝒐",

  async execute(conn, msg, args, from, axiosInstance) {
    try {
      let targetMsg = msg;

      // Se respondeu a uma mensagem, pega ela
      if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        const quotedContext = msg.message.extendedTextMessage.contextInfo;
        targetMsg = {
          key: {
            remoteJid: quotedContext.remoteJid || msg.key.remoteJid,
            fromMe: false,
            id: quotedContext.stanzaId || msg.key.id,
            participant: quotedContext.participant || ""
          },
          messageTimestamp: msg.messageTimestamp,
          pushName: quotedContext.pushName || msg.pushName,
          broadcast: false,
          message: { extendedTextMessage: quoted }
        };
      }

      // Se mencionou alguém
      if (msg.message?.extendedTextMessage?.contextInfo?.mentionedJid?.length > 0) {
        const mentionedJid = msg.message.extendedTextMessage.contextInfo.mentionedJid[0];
        try {
          const contact = await conn.getContact(mentionedJid);
          targetMsg = {
            key: { remoteJid: mentionedJid, fromMe: false, id: msg.key.id, participant: "" },
            messageTimestamp: msg.messageTimestamp,
            pushName: contact.notifyName || contact.name || mentionedJid.split("@")[0],
            broadcast: false,
            message: msg.message
          };
        } catch (e) {}
      }

      // Dump completo do objeto
      const msgDump = util.inspect(targetMsg, { 
        showHidden: true, 
        depth: 10, 
        colors: false, 
        maxArrayLength: null, 
        compact: false 
      });

      // 🔥 Converte para o formato de código com destaque (botForwardedMessage)
      const linhas = msgDump.split("\n");
      const codeBlocks = [];

      linhas.forEach(line => {
        if (line.trim() === "") {
          codeBlocks.push({
            highlightType: 0,
            codeContent: ""
          });
          return;
        }

        // Regex para destacar palavras-chave e strings
        const regex = 
          /(\b(?:const|let|var|function|async|await|return|new|this|try|catch|throw|if|else|for|while|switch|case|break|default|import|export|from|class|extends|super|typeof|instanceof|in|of|delete|void|yield|module|exports|require|true|false|null|undefined|NaN|Infinity|JSON|Object|Array|String|Number|Boolean|RegExp|Date|Math|console|process|Buffer|setTimeout|setInterval|clearTimeout|clearInterval)\b)|('(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*")|([^'"]+)/g;

        let match;

        while ((match = regex.exec(line)) !== null) {
          if (match[1]) {
            // Palavra-chave destacada
            codeBlocks.push({
              highlightType: 1,
              codeContent: match[1]
            });
          } else if (match[2]) {
            // String
            codeBlocks.push({
              highlightType: 0,
              codeContent: match[2]
            });
          } else if (match[3]) {
            // Texto normal
            codeBlocks.push({
              highlightType: 0,
              codeContent: match[3]
            });
          }
        }

        codeBlocks.push({
          highlightType: 0,
          codeContent: "\n"
        });
      });

      // 🔥 Envia usando botForwardedMessage (formato que funciona)
      await conn.relayMessage(
        from,
        {
          botForwardedMessage: {
            message: {
              richResponseMessage: {
                messageType: 1,
                submessages: [
                  {
                    messageType: 5,
                    codeMetadata: {
                      codeLanguage: "json",
                      codeBlocks: codeBlocks
                    }
                  }
                ],
                contextInfo: {
                  forwardingScore: 1,
                  isForwarded: true,
                  forwardedAiBotMessageInfo: {
                    botJid: "867051314767696@bot"
                  },
                  forwardOrigin: 4
                }
              }
            }
          }
        },
        {}
      );

    } catch (error) {
      console.error("Erro no comando lid:", error);
      
      // 🔥 FALLBACK: Envia como texto simples com bloco de código
      try {
        const msgDump = util.inspect(msg, { 
          showHidden: true, 
          depth: 10, 
          colors: false, 
          maxArrayLength: null, 
          compact: false 
        });
        
        // Fallback para enviar como texto normal
        await conn.sendMessage(from, { 
          text: "🔑 *LID (fallback)*\n\n```json\n" + msgDump + "\n```"
        }, { quoted: msg });
        
      } catch (e) {
        // Último recurso: mensagem simples
        await conn.sendMessage(from, { 
          text: "❌ Erro ao obter LID!",
          contextInfo: { forwardingScore: 1, isForwarded: true, forwardedNewsletterMessageInfo: { newsletterJid: "120363426698503859@newsletter", newsletterName: " ̵ ̵̲͞𝑳𝒖𝒌𝒂𝐌𝐨𝐝𝐳𝐳 だ", serverMessageId: 116 } }
        }, { quoted: msg });
      }
    }
  }
};