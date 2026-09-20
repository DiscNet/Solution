// Menu: Utilidades - Imagem | Comando: testwelcome
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  parseCommandInput,
  generateWelcomeCard,
} = require("../../functions/welcomeCard");

module.exports = {
  name: "testwelcome",
  aliases: ["twelcome", "welcometest"],
  description: "gera o card clássico do antigo SkyNetApi",
  menuCategory: "Utilidades",
  menuSection: "Imagem",
  usage: "testwelcome fundo | imagem | texto1 | texto2 | texto3",

  async execute(conn, msg, args, from) {
    try {
      const raw = args.join(" ").trim();
      const input = parseCommandInput(raw);

      if (!input) {
        return conn.sendMessage(from, {
          text:
            "🖼️ *ᴛᴇsᴛᴡᴇʟᴄᴏᴍᴇ*\n\n" +
            "Gera o card clássico do antigo *SkyNetApi* com 5 campos:\n\n" +
            "1. imagem de fundo\n" +
            "2. imagem principal\n" +
            "3. texto1\n" +
            "4. texto2\n" +
            "5. texto3\n\n" +
            "📌 *Uso:*\n" +
            ".testwelcome URL_FUNDO | URL_IMAGEM | Texto 1 | Texto 2 | Texto 3"
        }, { quoted: createStatusQuoted(msg) });
      }

      await conn.sendMessage(from, {
        react: { text: "🎨", key: msg.key }
      }).catch(() => {});

      const card = await generateWelcomeCard(input);

      await conn.sendMessage(from, {
        image: card,
        caption:
          "✅ *ᴄᴀʀᴅ ɢᴇʀᴀᴅᴏ!*\n\n" +
          "🎨 Layout baseado no gerador clássico do seu antigo SkyNetApi."
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key }
      }).catch(() => {});
    } catch (error) {
      console.error("[TESTWELCOME]", error);
      return conn.sendMessage(from, {
        text:
          "❌ *Não foi possível gerar o card.*\n\n" +
          "📌 " + (error.message || "Erro desconhecido")
      }, { quoted: createStatusQuoted(msg) });
    }
  },
};
