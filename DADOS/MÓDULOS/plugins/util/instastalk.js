// Menu: Utilidades - Stalker | Comando: instastalk
const config = require("../../../config/config");
const profiles = require("../../functions/publicProfiles");
const tokitoApi = require("../../functions/apiClient");
const { createStatusQuoted } = require("../../functions/statusCard");
const { newsletterContext } = require("../../functions/ownerGroupManager");

const TOKITO_ROUTE = "/api/pesquisa/instagram-stalker";

function boolLabel(value) {
  if (value === undefined || value === null || value === "") return "Desconhecido";
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "sim", "yes", "1"].includes(normalized)) return "Sim";
    if (["false", "nao", "não", "no", "0"].includes(normalized)) return "Não";
  }
  return value ? "Sim" : "Não";
}

function firstDefined(...values) {
  return values.find(value => value !== undefined && value !== null && value !== "");
}

function unwrapResult(data) {
  let current = data;

  for (let i = 0; i < 5; i += 1) {
    if (!current || typeof current !== "object" || Array.isArray(current)) break;

    const next = firstDefined(
      current.resultado,
      current.result,
      current.data,
      current.response,
      current.perfil,
      current.profile,
      current.user,
      current.usuario
    );

    if (!next || next === current) break;
    current = next;
  }

  if (Array.isArray(current)) return current[0] || {};
  return current && typeof current === "object" ? current : {};
}

function numberValue(...values) {
  const raw = firstDefined(...values);
  if (raw === undefined || raw === null || raw === "") return 0;

  if (typeof raw === "number") return raw;

  const cleaned = String(raw)
    .trim()
    .replace(/\s/g, "")
    .replace(/\.(?=\d{3}(?:\D|$))/g, "")
    .replace(/,(?=\d{3}(?:\D|$))/g, "")
    .replace(",", ".")
    .replace(/[^0-9.-]/g, "");

  const parsed = Number(cleaned);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeTokitoProfile(data, requestedUsername) {
  const raw = unwrapResult(data);

  const username = String(firstDefined(
    raw.username,
    raw.user_name,
    raw.usuario,
    raw.user,
    raw.login,
    requestedUsername
  ) || requestedUsername)
    .trim()
    .replace(/^@+/, "");

  const avatar = String(firstDefined(
    raw.profile_pic_url_hd,
    raw.profile_pic_url,
    raw.profile,
    raw.foto,
    raw.foto_perfil,
    raw.avatar,
    raw.avatar_url,
    raw.picture,
    raw.image,
    raw.imagem
  ) || "").trim();

  return {
    username,
    fullName: String(firstDefined(
      raw.full_name,
      raw.fullname,
      raw.nome,
      raw.name,
      raw.nome_completo
    ) || "").trim(),

    biography: String(firstDefined(
      raw.biography,
      raw.bio,
      raw.biografia,
      raw.description,
      raw.descricao
    ) || "").trim(),

    followers: numberValue(
      raw.followers,
      raw.follower,
      raw.seguidores,
      raw.followers_count,
      raw.edge_followed_by?.count
    ),

    following: numberValue(
      raw.following,
      raw.followings,
      raw.seguindo,
      raw.follows_count,
      raw.edge_follow?.count
    ),

    posts: numberValue(
      raw.posts,
      raw.timeline,
      raw.publicacoes,
      raw.publicações,
      raw.media_count,
      raw.edge_owner_to_timeline_media?.count
    ),

    verified: firstDefined(
      raw.verified,
      raw.is_verified,
      raw.verificado
    ),

    private: firstDefined(
      raw.private,
      raw.is_private,
      raw.privado
    ),

    category: String(firstDefined(
      raw.category,
      raw.category_name,
      raw.categoria,
      raw.business_category_name
    ) || "").trim(),

    externalUrl: String(firstDefined(
      raw.external_url,
      raw.externalUrl,
      raw.website,
      raw.site,
      raw.url_externa
    ) || "").trim(),

    avatar,
    profileUrl: "https://www.instagram.com/" + encodeURIComponent(username) + "/",
  };
}

function frame(lines) {
  return [
    "╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮",
    ...lines.filter(Boolean).map(line => `├̬⌑ؔ͟ ${line}`),
    "╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯",
  ].join("\n");
}

function caption(profile) {
  const bio = profile.biography
    ? profile.biography.replace(/\s+/g, " ").trim().slice(0, 500)
    : "Sem bio pública.";

  return frame([
    "⎾📸⏌ *𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼 𝚂𝚃𝙰𝙻𝙺*",
    `⎾👤⏌ 𝚄𝚜𝚞𝚊́𝚛𝚒𝚘: *@${profile.username}*`,
    profile.fullName
      ? `⎾🪪⏌ 𝙽𝚘𝚖𝚎: *${profile.fullName}*`
      : null,
    `⎾👥⏌ 𝚂𝚎𝚐𝚞𝚒𝚍𝚘𝚛𝚎𝚜: *${profiles.fullNumber(profile.followers)}*`,
    `⎾➡️⏌ 𝚂𝚎𝚐𝚞𝚒𝚗𝚍𝚘: *${profiles.fullNumber(profile.following)}*`,
    `⎾🖼️⏌ 𝙿𝚞𝚋𝚕𝚒𝚌𝚊𝚌̧𝚘̃𝚎𝚜: *${profiles.fullNumber(profile.posts)}*`,
    `⎾✅⏌ 𝚅𝚎𝚛𝚒𝚏𝚒𝚌𝚊𝚍𝚘: *${boolLabel(profile.verified)}*`,
    `⎾🔒⏌ 𝙿𝚛𝚒𝚟𝚊𝚍𝚘: *${boolLabel(profile.private)}*`,
    profile.category
      ? `⎾🏷️⏌ 𝙲𝚊𝚝𝚎𝚐𝚘𝚛𝚒𝚊: *${profile.category}*`
      : null,
    `⎾📝⏌ 𝙱𝚒𝚘: *${bio}*`,
    profile.externalUrl
      ? `⎾🔗⏌ 𝙻𝚒𝚗𝚔: ${profile.externalUrl}`
      : null,
    `⎾🌐⏌ 𝙿𝚎𝚛𝚏𝚒𝚕: ${profile.profileUrl}`,
  ]);
}

function usageText(prefix) {
  return frame([
    "⎾📸⏌ *𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼 𝚂𝚃𝙰𝙻𝙺*",
    `⎾🔹⏌ Uso: *${prefix}instastalk <usuario>*`,
    `⎾💎⏌ Exemplo: *${prefix}instastalk instagram*`,
  ]);
}

function errorText(message) {
  return frame([
    "⎾📸⏌ *𝙸𝙽𝚂𝚃𝙰𝙶𝚁𝙰𝙼 𝚂𝚃𝙰𝙻𝙺*",
    `⎾❌⏌ ${String(message || "Não foi possível consultar o perfil.")}`,
  ]);
}

async function fetchTokitoInstagram(username) {
  const clean = String(username || "")
    .trim()
    .replace(/^@+/, "")
    .replace(/^https?:\/\/(?:www\.)?instagram\.com\//i, "")
    .split(/[/?#]/)[0]
    .trim();

  if (!/^[A-Za-z0-9._]{1,30}$/.test(clean)) {
    const error = new Error("Informe um usuário válido do Instagram.");
    error.code = "INVALID_USERNAME";
    throw error;
  }

  const data = await tokitoApi.get(
    TOKITO_ROUTE,
    { username: clean },
    { timeout: 45000 }
  );

  const profile = normalizeTokitoProfile(data, clean);

  if (!profile.username) {
    const error = new Error("A Tokito API não retornou um perfil válido.");
    error.code = "INVALID_RESPONSE";
    throw error;
  }

  return profile;
}

module.exports = {
  name: "instastalk",
  aliases: ["igstalk", "instagramstalk", "stalkinsta"],
  description: "Consulta informações públicas de um perfil do Instagram pela Tokito API",
  menuCategory: "Utilidades",
  menuSection: "Stalker",
  usage: "instastalk <usuario>",

  async execute(conn, msg, args = [], from) {
    const prefix = String(config.prefix || ".");
    const raw = args.join(" ").trim();

    if (!raw) {
      return conn.sendMessage(from, {
        text: usageText(prefix),
        contextInfo: newsletterContext(),
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🔎", key: msg.key },
      }).catch(() => {});

      const profile = await fetchTokitoInstagram(raw);
      const text = caption(profile);

      if (profile.avatar) {
        try {
          await conn.sendMessage(from, {
            image: { url: profile.avatar },
            caption: text,
            contextInfo: newsletterContext(),
          }, { quoted: createStatusQuoted(msg) });

          await conn.sendMessage(from, {
            react: { text: "✅", key: msg.key },
          }).catch(() => {});

          return;
        } catch (_) {}
      }

      await conn.sendMessage(from, {
        text,
        contextInfo: newsletterContext(),
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[INSTASTALK/TOKITO]", tokitoApi.sanitize(error?.message || error));

      await conn.sendMessage(from, {
        react: { text: "❌", key: msg.key },
      }).catch(() => {});

      const detail = error?.code === "INVALID_USERNAME"
        ? "❌ Informe um usuário válido do Instagram."
        : tokitoApi.userError(
            error,
            "Não foi possível consultar esse perfil do Instagram."
          );

      return conn.sendMessage(from, {
        text: errorText(detail.replace(/^❌\s*/, "")),
        contextInfo: newsletterContext(),
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  _test: {
    boolLabel,
    unwrapResult,
    numberValue,
    normalizeTokitoProfile,
    frame,
    caption,
    usageText,
    errorText,
    fetchTokitoInstagram,
  },
};
