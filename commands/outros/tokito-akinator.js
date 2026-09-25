const tokitoApi = require("../../functions/tokitoApi");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");

const sessions = new Map();

function norm(value) {
  return String(value || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\s+/g, " ").trim();
}

function actor(msg, from) { return String(kit.senderId(msg, from) || from); }

function payload(data) { return data?.resultado || data?.result || data?.data || data || {}; }

function guessInfo(r = {}) {
  const sources = [r, r.resultado, r.result, r.acerto, r.guess, r.win, r.personagem, r.data,
    Array.isArray(r.guesses) ? r.guesses[0] : null, Array.isArray(r.answers) ? r.answers[0] : null].filter(Boolean);
  for (const item of sources) {
    const name = item.personagem || item.nome || item.name || item.character || item.proposition || item.name_proposition || item.suggestion_name || "";
    const desc = item.descricao || item.description || item.desc || item.pseudo || item.title || item.titulo || item.description_proposition || item.prop_desc || item.suggestion_desc || "";
    const photo = item.imagem || item.foto || item.image || item.photo || item.picture || item.avatar || item.absolute_picture_path || item.photo_path || item.suggestion_photo || "";
    if (name || desc || photo) return { name, desc, photo };
  }
  return { name: "", desc: "", photo: "" };
}

async function sendQuestion(conn, msg, from, r) {
  const question = r?.pergunta || r?.question || "Responda a pergunta";
  const step = r?.etapa || r?.step || 1;
  const progress = Number(r?.progresso || r?.progress || r?.progression || 0).toFixed(1);
  const image = tokitoApi.url("/canvas/akinator", { modo: "pergunta", etapa: step, pergunta: question, progresso: progress });
  return conn.sendMessage(from, {
    image: { url: image },
    caption: "🧞‍♂️ *AKINATOR*\n\n❓ Pergunta " + step + "\n📊 Progresso: " + progress + "%\n\n*" + question + "*\n\nResponda com: .akinator sim | nao | naosei | provavelmente | provavelmentenao\n↩️ .akinator voltar | ❌ .akinator cancelar",
  }, { quoted: createStatusQuoted(msg) });
}

module.exports = {
  name: "akinator",
  aliases: ["aki"],
  menuCategory: "Jogos",
  menuSection: "Tokito API",
  usage: "akinator iniciar",
  description: "Joga Akinator usando a Tokito API",
  permissions: { group: true },
  async execute(conn, msg, args, from) {
    const sender = actor(msg, from);
    const input = norm(args.join(" "));
    const current = sessions.get(from);
    const id = current?.id || (from + "_" + sender);

    try {
      if (current && current.sender !== sender) {
        return conn.sendMessage(from, { text: "⚠️ Já existe uma partida de Akinator em andamento neste grupo." }, { quoted: createStatusQuoted(msg) });
      }

      if (!input) {
        return conn.sendMessage(from, {
          image: { url: tokitoApi.url("/canvas/akinator", { modo: "inicio" }) },
          caption: "🧞‍♂️ *AKINATOR*\n\nPense em um personagem real ou fictício.\nUse *.akinator iniciar* para começar.",
        }, { quoted: createStatusQuoted(msg) });
      }

      if (["iniciar", "start", "jogar"].includes(input)) {
        const data = await tokitoApi.get("/api/akinator/start", { id });
        if (data?.status === false) throw new Error(data?.erro || data?.message || "Não foi possível iniciar.");
        sessions.set(from, { sender, id, startedAt: Date.now() });
        return sendQuestion(conn, msg, from, payload(data));
      }

      if (["cancelar", "sair", "parar", "end"].includes(input)) {
        await tokitoApi.get("/api/akinator/end", { id }).catch(() => {});
        sessions.delete(from);
        return conn.sendMessage(from, { text: "❌ Partida de Akinator encerrada." }, { quoted: createStatusQuoted(msg) });
      }

      if (!current) return conn.sendMessage(from, { text: "🧞‍♂️ Nenhuma partida ativa. Use *.akinator iniciar*." }, { quoted: createStatusQuoted(msg) });

      if (["voltar", "back"].includes(input)) {
        const data = await tokitoApi.get("/api/akinator/back", { id });
        if (data?.status === false) throw new Error(data?.erro || data?.message || "Não foi possível voltar.");
        return sendQuestion(conn, msg, from, payload(data));
      }

      const map = {
        sim: "sim", s: "sim", nao: "nao", "não": "nao", n: "nao",
        naosei: "naosei", "nao sei": "naosei", "não sei": "naosei",
        provavelmente: "provavelmente", "provavelmente sim": "provavelmente",
        provavelmentenao: "provavelmentenao", "provavelmente nao": "provavelmentenao", "provavelmente não": "provavelmentenao",
      };
      const answer = map[input];
      if (!answer) return conn.sendMessage(from, { text: "❌ Resposta inválida. Use sim, nao, naosei, provavelmente, provavelmentenao, voltar ou cancelar." }, { quoted: createStatusQuoted(msg) });

      const data = await tokitoApi.get("/api/akinator/answer", { id, resposta: answer });
      if (data?.status === false) throw new Error(data?.erro || data?.message || "Falha ao processar resposta.");
      const r = payload(data);
      if (r?.finalizado || r?.finished) {
        sessions.delete(from);
        const g = guessInfo(r);
        const progress = Number(r?.progresso || r?.progress || r?.progression || 0).toFixed(1);
        const image = tokitoApi.url("/canvas/akinator", {
          modo: "resultado", personagem: g.name || "Personagem", descricao: g.desc || "", foto: g.photo || "", progresso: progress,
        });
        return conn.sendMessage(from, {
          image: { url: image },
          caption: "🎯 *AKINATOR — RESULTADO*\n\n🎭 " + (g.name || "Personagem") + "\n📊 Confiança: " + progress + "%" + (g.desc ? "\n📖 " + g.desc : ""),
        }, { quoted: createStatusQuoted(msg) });
      }
      return sendQuestion(conn, msg, from, r);
    } catch (error) {
      console.error("[TOKITO AKINATOR]", error.message);
      return conn.sendMessage(from, { text: "❌ Akinator indisponível: " + String(error.message || "erro").slice(0, 180) }, { quoted: createStatusQuoted(msg) });
    }
  },
  _internals: { sessions, norm, payload, guessInfo },
};
