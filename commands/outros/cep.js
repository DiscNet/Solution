// commands/cep.js
const config = require("../../config/config");

module.exports = {
  name: "cep",
  description: "𝑪𝒐𝒏𝒔𝒖𝒍𝒕𝒂 𝒆𝒏𝒅𝒆𝒓𝒆ç𝒐 𝒑𝒐𝒓 𝑪𝑬𝑷",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      
      if (!args[0]) {
        await conn.sendMessage(from, { 
          text: `❌ *Por favor, forneça um CEP!*\n\n📌 *Exemplo:* ${prefix}cep 77064012` 
        }, { quoted: msg });
        return;
      }

      const cep = args[0].replace(/\D/g, '');
      
      if (cep.length !== 8) {
        await conn.sendMessage(from, { 
          text: `❌ *CEP inválido!* Digite um CEP com 8 dígitos (ex: 77064012).` 
        }, { quoted: msg });
        return;
      }

      await conn.sendMessage(from, { text: "⏳ *Consultando CEP...*" }, { quoted: msg });

      // Usar API ViaCEP
      const response = await axiosInstance.get(`https://viacep.com.br/ws/${cep}/json/`);
      
      const endereco = response.data;
      
      if (endereco.erro) {
        await conn.sendMessage(from, { 
          text: `❌ *CEP ${cep} não encontrado!* Verifique o número.` 
        }, { quoted: msg });
        return;
      }

      const texto = `
╭══════════════════════════════╮
     📬 *𝑪𝑶𝑵𝑺𝑼𝑳𝑻𝑨 𝑪𝑬𝑷* 📬
╰══════════════════════════════╯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *CEP:* ${endereco.cep}
🏙️ *Cidade:* ${endereco.localidade} - ${endereco.uf}
📍 *Bairro:* ${endereco.bairro || "Não informado"}
🏠 *Logradouro:* ${endereco.logradouro || "Não informado"}
🏷️ *Complemento:* ${endereco.complemento || "Não informado"}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Use ${prefix}menu para mais comandos*
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`;

      await conn.sendMessage(from, { text: texto }, { quoted: msg });
      await conn.sendMessage(from, { react: { text: "📬", key: msg.key } });

    } catch (error) {
      console.error("Erro no cep:", error);
      
      let errorMsg = "❌ *Erro ao consultar CEP!* Tente novamente.";
      
      if (error.response?.status === 400) {
        errorMsg = `❌ *CEP ${args[0]} inválido!* Verifique o número.`;
      }
      
      await conn.sendMessage(from, { text: errorMsg }, { quoted: msg });
    }
  }
};