const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");

function command({ name, aliases = [], route, params, description, validate }) {
  return {
    name,
    aliases,
    menuCategory: "IA",
    menuSection: "API",
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
        const data = await tokitoApi.get(route, params(q), { timeout: 90000 });

        if (validate && !validate(data)) {
          throw new Error(
            data?.mensagem ||
            data?.message ||
            data?.erro ||
            "A API não retornou uma resposta válida."
          );
        }

        const answer = tokitoApi.text(data);
        if (!answer) throw new Error("Resposta vazia da API.");

        await conn.sendMessage(from, {
          text: answer.slice(0, 12000),
        }, { quoted: createStatusQuoted(msg) });

        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[API IA]", name, info.status || "-", info.message);
        await conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível consultar a IA agora.")
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

async function ttsBuffer(text) {
  const result = await tokitoApi.buffer("/api/gemini-tts", {
    texto: text,
  }, {
    timeout: 60000,
    headers: {
      accept: "audio/mpeg,audio/*,*/*",
    },
  });

  if (!result.buffer.length || !/audio/i.test(result.contentType)) {
    let message = "A API não retornou áudio.";
    try {
      const data = JSON.parse(result.buffer.toString("utf8"));
      message = data?.resultado || data?.message || data?.error || message;
    } catch {}
    throw new Error(String(message));
  }

  return result;
}

const commands = [
  command({
    name: "gemini",
    aliases: ["geminiia"],
    route: "/api/gemini",
    params: q => ({ texto: q }),
    description: "Pergunta ao Gemini pela API",
  }),
  command({
    name: "geminipro",
    aliases: ["gemini-pro"],
    route: "/api/gemini-pro",
    params: q => ({ texto: q }),
    description: "Pergunta ao Gemini Pro pela API",
  }),
  command({
    name: "openai",
    aliases: ["gpt", "chatgpt"],
    route: "/api/openai",
    params: q => ({ q }),
    description: "Pergunta ao endpoint OpenAI da API",
    validate: data => data?.status !== false,
  }),
  command({
    name: "perplexity",
    aliases: ["perplexityai", "ppx"],
    route: "/api/perplexity-ai",
    params: q => ({ q, query: q }),
    description: "Pesquisa com IA pelo endpoint Perplexity da API",
    validate: data => data?.status !== false,
  }),
  command({
    name: "chatia",
    aliases: ["assistenteia"],
    route: "/api/tokito-ia",
    params: q => ({ texto: q }),
    description: "Conversa com a IA da API",
  }),
  {
    name: "geminitts",
    aliases: ["gemini-tts", "ttsgemini"],
    menuCategory: "IA",
    menuSection: "API",
    usage: "geminitts texto",
    description: "Gera voz com Gemini TTS pela API",
    async execute(conn, msg, args, from) {
      const q = args.join(" ").trim();
      if (!q) {
        return conn.sendMessage(from, {
          text: "❌ Informe o texto. Ex.: .geminitts olá, tudo bem?"
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        await conn.sendMessage(from, { react: { text: "🔊", key: msg.key } }).catch(() => {});
        const result = await ttsBuffer(q);
        await conn.sendMessage(from, {
          audio: result.buffer,
          mimetype: result.contentType.split(";")[0] || "audio/mpeg",
          ptt: false,
        }, { quoted: createStatusQuoted(msg) });
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[API GEMINI TTS]", info.status || "-", info.message);
        await conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível gerar o áudio.")
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "iaaudio",
    aliases: ["audioia", "voz-ia"],
    menuCategory: "IA",
    menuSection: "API",
    usage: "iaaudio pergunta",
    description: "Pergunta à IA e recebe a resposta em voz",
    async execute(conn, msg, args, from) {
      const q = args.join(" ").trim();
      if (!q) {
        return conn.sendMessage(from, {
          text: "❌ Uso: .iaaudio <pergunta>"
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        await conn.sendMessage(from, { react: { text: "🎙️", key: msg.key } }).catch(() => {});
        const data = await tokitoApi.get("/api/tokito-ia", { texto: q }, { timeout: 90000 });
        const answer = tokitoApi.text(data);
        if (!answer) throw new Error("A IA não retornou resposta.");

        const result = await ttsBuffer(answer);
        await conn.sendMessage(from, {
          audio: result.buffer,
          mimetype: result.contentType.split(";")[0] || "audio/mpeg",
          ptt: true,
        }, { quoted: createStatusQuoted(msg) });
        await conn.sendMessage(from, { react: { text: "✅", key: msg.key } }).catch(() => {});
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[API IA AUDIO]", info.status || "-", info.message);
        await conn.sendMessage(from, {
          text: tokitoApi.userError(error, "Não foi possível gerar a resposta em voz.")
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  },
  {
    name: "apitest",
    aliases: ["diagnosticoapi"],
    menuCategory: "Utilidades",
    menuSection: "API",
    usage: "apitest",
    description: "Diagnostica a autenticação da API sem expor a chave",
    async execute(conn, msg, args, from) {
      const checks = [
        ["YouTube Search", "/api/youtube-search", { query: "teste" }],
        ["Gemini", "/api/gemini", { texto: "responda apenas OK" }],
      ];

      const rows = [];
      for (const [label, route, params] of checks) {
        try {
          await tokitoApi.get(route, params, { timeout: 15000 });
          rows.push("✅ " + label + ": OK");
        } catch (error) {
          const info = tokitoApi.errorInfo(error);
          rows.push("❌ " + label + ": " + (info.status || "erro") + " — " + info.message);
        }
      }

      await conn.sendMessage(from, {
        text:
          "🧪 *DIAGNÓSTICO DA API*\n\n" +
          rows.join("\n") +
          "\n\nA chave nunca é exibida neste comando.",
      }, { quoted: createStatusQuoted(msg) });
    },
  },
];

module.exports = commands;
module.exports._test = { ttsBuffer };
