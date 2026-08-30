// commands/tc.js
const config = require("../config/config");
module.exports = {
  name: "dono",
  description: "Envia um contato personalizado",

  async execute(conn, msg, args, from, axiosInstance) {
    try {
      // ==============================================
      // CONFIGURAÇÃO DO CONTATO
      // ==============================================
      // Pega os argumentos passados pelo usuário (.tc Nome Número Organização)
      const nome = config.ownerName || "LukaModzz 🪐"; 
      const numero = config.ownerNumber || "556384673123"; 
      const org = config.botName || "LukaModzz BOT"; 
      
      // Remove qualquer caractere que não seja número
      const numeroLimpo = numero.replace(/[^\d]/g, "");
      
      // MONTAGEM DO VCARD PADRÃO WHATSAPP (CORRIGIDO)
      const vcardEstruturado = 
        "BEGIN:VCARD\n" +
        "VERSION:3.0\n" +
        `FN:${nome}\n` +
        `ORG:${org};\n` +
        // O segredo está aqui: injetar o waid mapeia a foto de perfil real nos servidores do WhatsApp
        `TEL;type=CELL;type=VOICE;waid=${numeroLimpo}:+${numeroLimpo}\n` +
        "END:VCARD";

      const CONTATO = {
        displayName: nome,
        numero: numeroLimpo,
        vcard: vcardEstruturado
      };
      // ==============================================

      // ENVIO DO CARTÃO DE CONTATO PRINCIPAL
      await conn.sendMessage(from, {
        contacts: {
          displayName: CONTATO.displayName,
          contacts: [
            {
              vcard: CONTATO.vcard
            }
          ]
        },
      }, {
        // Objeto decorativo mantendo o design do status no topo
        quoted: {
          key: {
            remoteJid: "status@broadcast",
            fromMe: false,
            // ID fixo do sistema para o cabeçalho decorativo
            participant: "0@s.whatsapp.net"
          },
          message: {
            extendedTextMessage: {
              text: "𝐀𝐪𝐮𝐢 𝐦𝐞𝐮 𝐝𝐨𝐧𝐨 シ︎"
            }
          }
        }
      });

    } catch (err) {
      console.error("Erro no tc:", err);
      await conn.sendMessage(from, {
        text: "❌ Erro ao enviar contato.\nUse: .tc [nome] [numero] [organização]"
      }, { quoted: msg });
    }
  }
}
