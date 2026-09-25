const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");

function command(name, aliases, route, param, description) {
  return {
    name,
    aliases,
    menuCategory: "IA",
    menuSection: "Tokito API",
    usage: name + " pergunta",
    description,
    async execute(conn, msg, args, from) {
      const q = args.join(" ").trim();
      if (!q) {
        return conn.sendMessage(from, {
          text: "❌ Informe uma pergunta. Ex.: ." + name + " explique buracos negros"
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        await conn.sendMessage(from, { react: { text: "🤖", key: msg.key } }).catch(() => {});
        const data = await tokitoApi.get(route, { [param]: q }, { timeout: 90000 });
        const answer = tokitoApi.text(data);
        if (!answer) throw new Error("Resposta vazia da Tokito API.");

        await conn.sendMessage(from, {
          text: answer.slice(0, 8000),
        }, { quoted: createStatusQuoted(msg) });

        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        console.error("[TOKITO IA]", name, error.message);
        await conn.sendMessage(from, {
          text: "❌ Não foi possível consultar a IA da Tokito agora."
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

const commands = [
  command("gemini", ["geminiia"], "/api/gemini", "texto", "Pergunta ao Gemini pela Tokito API"),
  command("geminipro", ["gemini-pro"], "/api/gemini-pro", "texto", "Pergunta ao Gemini Pro pela Tokito API"),
  command("openai", ["gpt"], "/api/openai", "q", "Pergunta ao endpoint OpenAI da Tokito API"),
  command("perplexity", ["perplexityai"], "/api/perplexity-ai", "q", "Pesquisa com IA pelo endpoint Perplexity da Tokito API"),
  command("tokitoia", ["tokito-ia"], "/api/tokito-ia", "texto", "Conversa com a IA da Tokito API"),
  {
    name: "geminitts",
    aliases: ["gemini-tts"],
    menuCategory: "IA",
    menuSection: "Tokito API",
    usage: "geminitts texto",
    description: "Gera voz com Gemini TTS pela Tokito API",
    async execute(conn, msg, args, from) {
      const q = args.join(" ").trim();
      if (!q) {
        return conn.sendMessage(from, {
          text: "❌ Informe o texto. Ex.: .geminitts olá, tudo bem?"
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        await conn.sendMessage(from, { react: { text: "🔊", key: msg.key } }).catch(() => {});
        await conn.sendMessage(from, {
          audio: { url: tokitoApi.url("/api/gemini-tts", { texto: q }) },
          mimetype: "audio/mpeg",
          ptt: false,
        }, { quoted: createStatusQuoted(msg) });
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        console.error("[TOKITO GEMINI TTS]", error.message);
        await conn.sendMessage(from, {
          text: "❌ Não foi possível gerar o áudio."
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
];

module.exports = commands;
