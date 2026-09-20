// Recursos inspirados no catálogo da Tokito V10, reimplementados para o Solution.
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");
const {
  getMessageProfilePicture,
  targetCandidates,
  senderCandidates,
} = require("../../functions/profilePicture");

const quizState = new Map();
const guessState = new Map();
const GAME_TTL = 15 * 60 * 1000;

const quizQuestions = [
  { q: "Qual planeta é conhecido como Planeta Vermelho?", a: "marte", display: "Marte" },
  { q: "Quanto é 9 × 7?", a: "63", display: "63" },
  { q: "Qual é a capital do Japão?", a: "toquio", display: "Tóquio" },
  { q: "Qual linguagem roda nativamente no navegador junto com HTML e CSS?", a: "javascript", display: "JavaScript" },
  { q: "Qual oceano fica entre as Américas e a Europa/África?", a: "atlantico", display: "Atlântico" },
  { q: "Qual gás as plantas absorvem principalmente na fotossíntese?", a: "dioxido de carbono", display: "Dióxido de carbono" },
  { q: "Quem escreveu Dom Casmurro?", a: "machado de assis", display: "Machado de Assis" },
  { q: "Qual é o maior planeta do Sistema Solar?", a: "jupiter", display: "Júpiter" },
];

function norm(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function choose(list) {
  return list[Math.floor(Math.random() * list.length)];
}

function cleanup(map, key) {
  const item = map.get(key);
  if (item && Date.now() - item.at > GAME_TTL) {
    map.delete(key);
    return null;
  }
  return item || null;
}

function firstTarget(msg, from) {
  return targetCandidates(msg, from)[0] || senderCandidates(msg, from)[0] || null;
}

function phone(jid) {
  return String(jid || "").split("@")[0].split(":")[0].replace(/\D/g, "");
}

function parseStatus(value) {
  return String(
    value?.status?.status ||
    value?.status ||
    value?.[0]?.status?.status ||
    value?.[0]?.status ||
    ""
  ).trim();
}

async function fetchBio(conn, candidates = []) {
  for (const jid of [...new Set(candidates.filter(Boolean))]) {
    try {
      if (typeof conn.fetchStatus === "function") {
        const result = await conn.fetchStatus(jid);
        const text = parseStatus(result);
        if (text) return { text, jid };
      }
    } catch (_) {}

    try {
      if (typeof conn.getStatus === "function") {
        const result = await conn.getStatus(jid);
        const text = parseStatus(result);
        if (text) return { text, jid };
      }
    } catch (_) {}
  }
  return null;
}

function ageFromDate(raw) {
  const match = String(raw || "").match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;

  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  const born = new Date(year, month - 1, day);
  if (
    born.getFullYear() !== year ||
    born.getMonth() !== month - 1 ||
    born.getDate() !== day
  ) return null;

  const now = new Date();
  if (born > now) return null;

  let years = now.getFullYear() - year;
  let months = now.getMonth() - (month - 1);
  let days = now.getDate() - day;

  if (days < 0) {
    months -= 1;
    const previousMonthDays = new Date(now.getFullYear(), now.getMonth(), 0).getDate();
    days += previousMonthDays;
  }

  if (months < 0) {
    years -= 1;
    months += 12;
  }

  const livedDays = Math.floor((now - born) / 86400000);
  let next = new Date(now.getFullYear(), month - 1, day);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (next < today) next = new Date(now.getFullYear() + 1, month - 1, day);
  const untilBirthday = Math.ceil((next - now) / 86400000);

  return { years, months, days, livedDays, untilBirthday };
}

const commands = [
  kit.makeCommand({
    name: "getperfil",
    aliases: ["getpfp"],
    section: "Perfil",
    usage: "getperfil [@usuario]",
    description: "Mostra a foto de perfil de um usuário usando o WhatsApp/Baileys",
    async execute(conn, msg, args, from) {
      try {
        const picture = await getMessageProfilePicture(conn, msg, from);
        if (!picture) throw kit.userError("A pessoa não possui foto acessível ou a privacidade impede a consulta.");
        const target = picture.jid || firstTarget(msg, from);
        const number = phone(target);
        await conn.sendMessage(from, {
          image: { url: picture.url },
          caption: `🖼️ *FOTO DE PERFIL*${number ? `\n\n👤 @${number}` : ""}`,
          mentions: target ? [target] : [],
        }, { quoted: createStatusQuoted(msg) });
      } catch (e) {
        await kit.fail(conn, msg, from, e, "Não foi possível obter a foto de perfil.");
      }
    },
  }),

  kit.makeCommand({
    name: "getbio",
    aliases: ["bio", "recado"],
    section: "Perfil",
    usage: "getbio [@usuario]",
    description: "Consulta o recado/bio do WhatsApp quando a privacidade permitir",
    async execute(conn, msg, args, from) {
      try {
        const candidates = targetCandidates(msg, from);
        if (!candidates.length) throw kit.userError("Não consegui identificar o usuário.");
        const result = await fetchBio(conn, candidates);
        const target = result?.jid || candidates[0];
        const number = phone(target);
        const bio = result?.text || "Privado ou sem recado.";
        await conn.sendMessage(from, {
          text: `📝 *BIO DO WHATSAPP*\n\n👤 @${number || "usuario"}\n💬 ${bio}`,
          mentions: target ? [target] : [],
        }, { quoted: createStatusQuoted(msg) });
      } catch (e) {
        await kit.fail(conn, msg, from, e, "Não foi possível consultar a bio.");
      }
    },
  }),

  kit.makeCommand({
    name: "wikipedia",
    aliases: ["wiki"],
    section: "Pesquisas",
    usage: "wikipedia [assunto]",
    description: "Pesquisa um assunto na Wikipédia em português",
    async execute(conn, msg, args, from, http) {
      try {
        const query = args.join(" ").trim();
        if (!query) throw kit.userError("Informe um assunto. Ex.: .wikipedia buraco negro");
        const search = await http.get("https://pt.wikipedia.org/w/api.php", {
          params: {
            action: "query",
            list: "search",
            srsearch: query,
            format: "json",
            utf8: 1,
            srlimit: 1,
          },
          timeout: 12000,
          headers: { "user-agent": "SolutionBot/1.0 (WhatsApp bot)" },
        });
        const hit = search.data?.query?.search?.[0];
        if (!hit?.title) throw kit.userError("Não encontrei um artigo para esse assunto.");

        const summary = await http.get(
          `https://pt.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(hit.title)}`,
          { timeout: 12000, headers: { "user-agent": "SolutionBot/1.0 (WhatsApp bot)" } }
        );
        const title = summary.data?.title || hit.title;
        const extract = String(summary.data?.extract || "").trim();
        const page = summary.data?.content_urls?.desktop?.page || "";
        if (!extract) throw kit.userError("O artigo foi encontrado, mas não possui resumo disponível.");

        await kit.reply(
          conn,
          msg,
          from,
          `📚 *WIKIPÉDIA — ${title}*\n\n${extract.slice(0, 3500)}${page ? `\n\n🔗 ${page}` : ""}`
        );
      } catch (e) {
        await kit.fail(conn, msg, from, e, "Não foi possível pesquisar na Wikipédia.");
      }
    },
  }),

  kit.makeCommand({
    name: "npm",
    aliases: ["npmpkg", "pacotenpm"],
    section: "Pesquisas",
    usage: "npm [pacote]",
    description: "Pesquisa pacotes no registro público do npm",
    async execute(conn, msg, args, from, http) {
      try {
        const query = args.join(" ").trim();
        if (!query) throw kit.userError("Informe o nome de um pacote. Ex.: .npm axios");
        const { data } = await http.get("https://registry.npmjs.org/-/v1/search", {
          params: { text: query, size: 5 },
          timeout: 12000,
        });
        const objects = Array.isArray(data?.objects) ? data.objects : [];
        if (!objects.length) throw kit.userError("Nenhum pacote encontrado.");

        const lines = objects.map((item, index) => {
          const pkg = item.package || {};
          return `${index + 1}. *${pkg.name || "sem nome"}* — v${pkg.version || "?"}\n   ${String(pkg.description || "Sem descrição").slice(0, 120)}\n   ${pkg.links?.npm || ""}`;
        });
        await kit.reply(conn, msg, from, `📦 *NPM — ${query}*\n\n${lines.join("\n\n")}`);
      } catch (e) {
        await kit.fail(conn, msg, from, e, "Não foi possível pesquisar no npm.");
      }
    },
  }),

  kit.makeCommand({
    name: "chance",
    aliases: ["probabilidade"],
    section: "Jogos rápidos",
    usage: "chance [pergunta]",
    description: "Gera uma porcentagem aleatória para uma pergunta de brincadeira",
    async execute(conn, msg, args, from) {
      const question = args.join(" ").trim();
      if (!question) return kit.reply(conn, msg, from, "❌ Uso: .chance <pergunta>");
      const value = Math.floor(Math.random() * 101);
      return kit.reply(conn, msg, from, `🎲 *CHANCE*\n\n${question}\n\n📊 *${value}%*`);
    },
  }),

  kit.makeCommand({
    name: "quando",
    section: "Jogos rápidos",
    usage: "quando [pergunta]",
    description: "Responde de brincadeira quando algo pode acontecer",
    async execute(conn, msg, args, from) {
      const question = args.join(" ").trim();
      if (!question) return kit.reply(conn, msg, from, "❌ Uso: .quando <pergunta>");
      const options = [
        "hoje", "amanhã", "esta semana", "daqui a alguns dias",
        "no próximo mês", "em alguns meses", "quando você menos esperar",
        "talvez demore bastante", "muito em breve"
      ];
      return kit.reply(conn, msg, from, `⏳ *QUANDO?*\n\n${question}\n\n🔮 ${choose(options)}.`);
    },
  }),

  kit.makeCommand({
    name: "quiz",
    section: "Jogos rápidos",
    usage: "quiz [resposta|novo|desistir]",
    description: "Quiz simples jogado por mensagens",
    async execute(conn, msg, args, from) {
      const input = norm(args.join(" "));
      let game = cleanup(quizState, from);

      if (!game || input === "novo") {
        const item = choose(quizQuestions);
        game = { ...item, at: Date.now() };
        quizState.set(from, game);
        return kit.reply(conn, msg, from, `🧠 *QUIZ*\n\n${item.q}\n\nResponda com *.quiz sua resposta*.`);
      }

      if (!input) return kit.reply(conn, msg, from, `🧠 *QUIZ*\n\n${game.q}\n\nResponda com *.quiz sua resposta*.`);
      if (["desistir", "parar"].includes(input)) {
        quizState.delete(from);
        return kit.reply(conn, msg, from, `🏳️ A resposta era *${game.display}*.`);
      }

      if (input === norm(game.a)) {
        quizState.delete(from);
        return kit.reply(conn, msg, from, `✅ *Acertou!* A resposta é *${game.display}*.`);
      }

      game.at = Date.now();
      return kit.reply(conn, msg, from, "❌ Não foi dessa vez. Tente novamente ou use *.quiz desistir*.");
    },
  }),

  kit.makeCommand({
    name: "adivinhe",
    aliases: ["adivinhar"],
    section: "Jogos rápidos",
    usage: "adivinhe [1-100|novo|desistir]",
    description: "Jogo de adivinhar um número de 1 a 100",
    async execute(conn, msg, args, from) {
      const raw = String(args[0] || "").trim().toLowerCase();
      let game = cleanup(guessState, from);

      if (!game || raw === "novo") {
        game = { value: Math.floor(Math.random() * 100) + 1, attempts: 0, at: Date.now() };
        guessState.set(from, game);
        return kit.reply(conn, msg, from, "🔢 *ADIVINHE*\n\nPensei em um número de *1 a 100*.\nUse *.adivinhe 50* para tentar.");
      }

      if (!raw) return kit.reply(conn, msg, from, "🔢 Use *.adivinhe <1-100>*.");
      if (["desistir", "parar"].includes(raw)) {
        guessState.delete(from);
        return kit.reply(conn, msg, from, `🏳️ O número era *${game.value}*.`);
      }

      const value = Number(raw);
      if (!Number.isInteger(value) || value < 1 || value > 100) {
        return kit.reply(conn, msg, from, "❌ Digite um número inteiro entre 1 e 100.");
      }

      game.at = Date.now();
      game.attempts += 1;

      if (value === game.value) {
        guessState.delete(from);
        return kit.reply(conn, msg, from, `🎉 *ACERTOU!* Era *${value}*. Tentativas: *${game.attempts}*.`);
      }

      return kit.reply(
        conn,
        msg,
        from,
        value < game.value ? "⬆️ Meu número é *maior*." : "⬇️ Meu número é *menor*."
      );
    },
  }),
];

module.exports = commands;
module.exports._test = { norm, ageFromDate, parseStatus, quizQuestions };
