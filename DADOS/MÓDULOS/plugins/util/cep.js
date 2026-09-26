// Menu: Utilidades - Consulta | Comando: cep
// commands/cep.js
const config = require("../../../config/config");

module.exports = {
  name: "cep",
  description: "𝑪𝒐𝒏𝒔𝒖𝒍𝒕𝒂 𝒆𝒏𝒅𝒆𝒓𝒆ç𝒐 𝒑𝒐𝒓 𝑪𝑬𝑷",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";

      if (!args[0]) {
        await conn.sendMessage(from, {
          text: `❌ *ᴘᴏʀ ғᴀᴠᴏʀ, ғᴏʀɴᴇçᴀ ᴜᴍ ᴄᴇᴘ!*\n\n📌 *ᴇxᴇᴍᴘʟᴏ:* ${prefix}cep 77064012`
        }, { quoted: msg });
        return;
      }

      const cep = args[0].replace(/\D/g, '');

      if (cep.length !== 8) {
        await conn.sendMessage(from, {
          text: `❌ *ᴄᴇᴘ ɪɴᴠáʟɪᴅᴏ!* ᴅɪɢɪᴛᴇ ᴜᴍ ᴄᴇᴘ ᴄᴏᴍ 8 ᴅíɢɪᴛᴏs (ᴇx: 77064012).`
        }, { quoted: msg });
        return;
      }

      await conn.sendMessage(from, { text: "⏳ *ᴄᴏɴsᴜʟᴛᴀɴᴅᴏ ᴄᴇᴘ...*" }, { quoted: msg });

      // Usar API ViaCEP
      const response = await axiosInstance.get(`https://viacep.com.br/ws/${cep}/json/`);

      const endereco = response.data;

      if (endereco.erro) {
        await conn.sendMessage(from, {
          text: `❌ *ᴄᴇᴘ ${cep} ɴãᴏ ᴇɴᴄᴏɴᴛʀᴀᴅᴏ!* ᴠᴇʀɪғɪǫᴜᴇ ᴏ ɴúᴍᴇʀᴏ.`
        }, { quoted: msg });
        return;
      }

      const texto = `
╭══════════════════════════════╮
     📬 *𝑪𝑶𝑵𝑺𝑼𝑳𝑻𝑨 𝑪𝑬𝑷* 📬
╰══════════════════════════════╯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *ᴄᴇᴘ:* ${endereco.cep}
🏙️ *ᴄɪᴅᴀᴅᴇ:* ${endereco.localidade} - ${endereco.uf}
📍 *ʙᴀɪʀʀᴏ:* ${endereco.bairro || "Não informado"}
🏠 *ʟᴏɢʀᴀᴅᴏᴜʀᴏ:* ${endereco.logradouro || "Não informado"}
🏷️ *ᴄᴏᴍᴘʟᴇᴍᴇɴᴛᴏ:* ${endereco.complemento || "Não informado"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *ᴜsᴇ ${prefix}menu para mais comandos*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await conn.sendMessage(from, { text: texto }, { quoted: msg });
      await conn.sendMessage(from, { react: { text: "📬", key: msg.key } });

    } catch (error) {
      console.error("Erro no cep:", error);

      let errorMsg = "❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴏɴsᴜʟᴛᴀʀ ᴄᴇᴘ!* ᴛᴇɴᴛᴇ ɴᴏᴠᴀᴍᴇɴᴛᴇ.";

      if (error.response?.status === 400) {
        errorMsg = `❌ *CEP ${args[0]} inválido!* Verifique o número.`;
      }

      await conn.sendMessage(from, { text: errorMsg }, { quoted: msg });
    }
  }
};

Object.assign(module.exports, {
  "menuCategory": "Utilidades",
  "menuSection": "Consulta",
  "usage": "cep CEP",
  "description": "Uso: .cep CEP"
});
