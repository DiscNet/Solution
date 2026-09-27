// Menu: Utilidades - Stalker | Comando: robloxstalk
const config = require("../../../config/config");
const profiles = require("../../functions/publicProfiles");
const tokitoApi = require("../../functions/apiClient");
const { createStatusQuoted } = require("../../functions/statusCard");
const { newsletterContext } = require("../../functions/ownerGroupManager");

const TOKITO_ROUTES = [
  "/api/roblox-stalker",
  "/api/pesquisa/roblox-stalker",
];

let workingTokitoRoute = null;

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
  return values.find(value =>
    value !== undefined &&
    value !== null &&
    value !== ""
  );
}

function isHttpUrl(value) {
  return /^https?:\/\//i.test(String(value || "").trim());
}

function findImageUrlDeep(value, depth = 0, seen = new Set()) {
  if (depth > 8 || value === null || value === undefined) return "";

  if (typeof value === "string") {
    const text = value.trim();
    return isHttpUrl(text) && /(?:image|avatar|thumbnail|headshot|rbxcdn|roblox)/i.test(text)
      ? text
      : "";
  }

  if (typeof value !== "object" || seen.has(value)) return "";
  seen.add(value);

  const preferredKeys = [
    "imageUrl",
    "image_url",
    "avatar",
    "avatarUrl",
    "avatar_url",
    "thumbnail",
    "thumbnailUrl",
    "thumbnail_url",
    "headshot",
    "headshotUrl",
    "headshot_url",
    "profileImage",
    "profile_image",
    "profile_pic",
    "foto",
    "imagem",
    "picture",
    "icon",
  ];

  for (const key of preferredKeys) {
    const candidate = value?.[key];

    if (typeof candidate === "string" && isHttpUrl(candidate)) {
      return candidate.trim();
    }

    if (candidate && typeof candidate === "object") {
      const nested = findImageUrlDeep(candidate, depth + 1, seen);
      if (nested) return nested;
    }
  }

  const entries = Array.isArray(value)
    ? value.map((item, index) => [String(index), item])
    : Object.entries(value);

  for (const [, nestedValue] of entries) {
    const nested = findImageUrlDeep(nestedValue, depth + 1, seen);
    if (nested) return nested;
  }

  return "";
}

async function officialRobloxHeadshot(userId) {
  const id = String(userId || "").replace(/\D/g, "");
  if (!id) return "";

  try {
    const { data } = await tokitoApi.axios.get(
      "https://thumbnails.roblox.com/v1/users/avatar-headshot",
      {
        params: {
          userIds: id,
          size: "420x420",
          format: "Png",
          isCircular: false,
        },
        timeout: 20000,
        headers: {
          "user-agent": "WhatsAppBot/1.0",
          accept: "application/json",
        },
      }
    );

    const item = Array.isArray(data?.data) ? data.data[0] : null;
    return isHttpUrl(item?.imageUrl) ? String(item.imageUrl).trim() : "";
  } catch (_) {
    return "";
  }
}

async function resolveAvatar(profile, rawData) {
  let url = String(profile?.avatar || "").trim();

  if (!isHttpUrl(url)) {
    url = findImageUrlDeep(rawData);
  }

  if (!isHttpUrl(url) && profile?.id) {
    url = await officialRobloxHeadshot(profile.id);
  }

  return isHttpUrl(url) ? url : "";
}

async function downloadImage(url) {
  if (!isHttpUrl(url)) return null;

  try {
    const response = await tokitoApi.axios.get(url, {
      responseType: "arraybuffer",
      timeout: 25000,
      maxContentLength: 8 * 1024 * 1024,
      maxBodyLength: 8 * 1024 * 1024,
      headers: {
        "user-agent": "WhatsAppBot/1.0",
        accept: "image/*,*/*;q=0.8",
      },
    });

    const buffer = Buffer.from(response.data || []);
    return buffer.length ? buffer : null;
  } catch (_) {
    return null;
  }
}

function unwrapResult(data) {
  let current = data;

  for (let i = 0; i < 6; i += 1) {
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

  return current && typeof current === "object"
    ? current
    : {};
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

  return Number.isFinite(parsed)
    ? parsed
    : 0;
}

function normalizeDate(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";

  const parsed = new Date(raw);

  if (Number.isNaN(parsed.getTime())) {
    return raw;
  }

  return parsed.toISOString();
}

function normalizeTokitoProfile(data, requestedUsername) {
  const raw = unwrapResult(data);

  const username = String(firstDefined(
    raw.username,
    raw.user_name,
    raw.name,
    raw.usuario,
    raw.user,
    raw.login,
    requestedUsername
  ) || requestedUsername)
    .trim()
    .replace(/^@+/, "");

  const id = firstDefined(
    raw.id,
    raw.userId,
    raw.userid,
    raw.user_id,
    raw.id_usuario,
    raw.idUser
  );

  const directAvatar = firstDefined(
    raw.avatar,
    raw.avatar_url,
    raw.avatarUrl,
    raw.imageUrl,
    raw.image_url,
    raw.image,
    raw.imagem,
    raw.foto,
    raw.thumbnail,
    raw.thumbnailUrl,
    raw.thumbnail_url,
    raw.headshot,
    raw.headshotUrl,
    raw.headshot_url,
    raw.profile_pic
  );

  const avatar =
    typeof directAvatar === "string" && isHttpUrl(directAvatar)
      ? directAvatar.trim()
      : findImageUrlDeep(data);

  return {
    id: id !== undefined && id !== null
      ? String(id)
      : "",

    username,

    displayName: String(firstDefined(
      raw.displayName,
      raw.display_name,
      raw.display,
      raw.nome_exibicao,
      raw.nomeExibicao,
      raw.nome
    ) || "").trim(),

    description: String(firstDefined(
      raw.description,
      raw.descricao,
      raw.bio,
      raw.biography,
      raw.sobre
    ) || "").trim(),

    created: normalizeDate(firstDefined(
      raw.created,
      raw.createdAt,
      raw.created_at,
      raw.creation_date,
      raw.data_criacao,
      raw.criado_em
    )),

    banned: firstDefined(
      raw.isBanned,
      raw.is_banned,
      raw.banned,
      raw.banido
    ),

    verified: firstDefined(
      raw.hasVerifiedBadge,
      raw.verified,
      raw.is_verified,
      raw.verificado
    ),

    followers: numberValue(
      raw.followers,
      raw.follower,
      raw.followersCount,
      raw.followers_count,
      raw.seguidores
    ),

    following: numberValue(
      raw.following,
      raw.followings,
      raw.followingCount,
      raw.followingsCount,
      raw.following_count,
      raw.seguindo
    ),

    friends: numberValue(
      raw.friends,
      raw.friendCount,
      raw.friendsCount,
      raw.friends_count,
      raw.amigos
    ),

    avatar,

    profileUrl: id
      ? "https://www.roblox.com/users/" + encodeURIComponent(String(id)) + "/profile"
      : "https://www.roblox.com/search/users?keyword=" + encodeURIComponent(username),
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
  const bio = profile.description
    ? profile.description.replace(/\s+/g, " ").trim().slice(0, 700)
    : "Sem descrição pública.";

  return frame([
    "⎾🎮⏌ *𝚁𝙾𝙱𝙻𝙾𝚇 𝚂𝚃𝙰𝙻𝙺*",
    `⎾👤⏌ 𝚄𝚜𝚞𝚊́𝚛𝚒𝚘: *@${profile.username}*`,
    profile.displayName
      ? `⎾🪪⏌ 𝙽𝚘𝚖𝚎: *${profile.displayName}*`
      : null,
    profile.id
      ? `⎾🆔⏌ 𝙸𝙳: *${profile.id}*`
      : null,
    `⎾👥⏌ 𝚂𝚎𝚐𝚞𝚒𝚍𝚘𝚛𝚎𝚜: *${profiles.fullNumber(profile.followers)}*`,
    `⎾➡️⏌ 𝚂𝚎𝚐𝚞𝚒𝚗𝚍𝚘: *${profiles.fullNumber(profile.following)}*`,
    `⎾🤝⏌ 𝙰𝚖𝚒𝚐𝚘𝚜: *${profiles.fullNumber(profile.friends)}*`,
    `⎾✅⏌ 𝚅𝚎𝚛𝚒𝚏𝚒𝚌𝚊𝚍𝚘: *${boolLabel(profile.verified)}*`,
    `⎾🚫⏌ 𝙱𝚊𝚗𝚒𝚍𝚘: *${boolLabel(profile.banned)}*`,
    profile.created
      ? `⎾📅⏌ 𝙲𝚛𝚒𝚊𝚍𝚘 𝚎𝚖: *${profiles.datePt(profile.created)}*`
      : null,
    `⎾📝⏌ 𝙳𝚎𝚜𝚌𝚛𝚒𝚌̧𝚊̃𝚘: *${bio}*`,
    `⎾🌐⏌ 𝙿𝚎𝚛𝚏𝚒𝚕: ${profile.profileUrl}`,
    "⎾⚡⏌ 𝙵𝚘𝚗𝚝𝚎: *Tokito API*",
  ]);
}

function usageText(prefix) {
  return frame([
    "⎾🎮⏌ *𝚁𝙾𝙱𝙻𝙾𝚇 𝚂𝚃𝙰𝙻𝙺*",
    `⎾🔹⏌ Uso: *${prefix}robloxstalk <usuario>*`,
    `⎾💎⏌ Exemplo: *${prefix}robloxstalk Builderman*`,
  ]);
}

function errorText(message) {
  return frame([
    "⎾🎮⏌ *𝚁𝙾𝙱𝙻𝙾𝚇 𝚂𝚃𝙰𝙻𝙺*",
    `⎾❌⏌ ${String(message || "Não foi possível consultar o perfil.")}`,
  ]);
}

async function requestTokitoRoblox(route, clean) {
  return tokitoApi.get(
    route,
    { username: clean },
    { timeout: 45000 }
  );
}

async function fetchTokitoRoblox(username) {
  const clean = String(username || "")
    .trim()
    .replace(/^@+/, "");

  if (!/^[A-Za-z0-9_]{3,20}$/.test(clean)) {
    const error = new Error("Informe um usuário válido do Roblox.");
    error.code = "INVALID_USERNAME";
    throw error;
  }

  const routes = workingTokitoRoute
    ? [workingTokitoRoute, ...TOKITO_ROUTES.filter(route => route !== workingTokitoRoute)]
    : TOKITO_ROUTES;

  let last404 = null;

  for (const route of routes) {
    try {
      const data = await requestTokitoRoblox(route, clean);
      const profile = normalizeTokitoProfile(data, clean);

      if (!profile.username) {
        const error = new Error("A Tokito API não retornou um perfil válido.");
        error.code = "INVALID_RESPONSE";
        throw error;
      }

      profile.avatar = await resolveAvatar(profile, data);

      workingTokitoRoute = route;
      return profile;
    } catch (error) {
      const status = Number(error?.response?.status || error?.httpStatus || 0);

      if (status === 404) {
        last404 = error;

        if (workingTokitoRoute === route) {
          workingTokitoRoute = null;
        }

        continue;
      }

      throw error;
    }
  }

  const error = new Error(
    "Nenhuma rota Roblox Stalker conhecida respondeu na Tokito API."
  );
  error.code = "TOKITO_ROBLOX_ROUTE_NOT_FOUND";
  error.cause = last404;
  throw error;
}

module.exports = {
  name: "robloxstalk",
  aliases: ["rstalk", "stalkroblox", "robloxperfil"],
  description: "Consulta informações públicas de um perfil do Roblox pela Tokito API",
  menuCategory: "Utilidades",
  menuSection: "Stalker",
  usage: "robloxstalk <usuario>",

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

      const profile = await fetchTokitoRoblox(raw);
      const text = caption(profile);

      if (profile.avatar) {
        try {
          const avatarBuffer = await downloadImage(profile.avatar);

          await conn.sendMessage(from, {
            image: avatarBuffer || { url: profile.avatar },
            caption: text,
            contextInfo: newsletterContext(),
          }, { quoted: createStatusQuoted(msg) });

          await conn.sendMessage(from, {
            react: { text: "✅", key: msg.key },
          }).catch(() => {});

          return;
        } catch (imageError) {
          console.warn(
            "[ROBLOXSTALK/AVATAR]",
            imageError?.message || imageError
          );
        }
      }

      await conn.sendMessage(from, {
        text,
        contextInfo: newsletterContext(),
      }, { quoted: createStatusQuoted(msg) });

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error(
        "[ROBLOXSTALK/TOKITO]",
        tokitoApi.sanitize(error?.message || error)
      );

      await conn.sendMessage(from, {
        react: { text: "❌", key: msg.key },
      }).catch(() => {});

      let detail;

      if (error?.code === "INVALID_USERNAME") {
        detail = "❌ Informe um usuário válido do Roblox.";
      } else if (error?.code === "TOKITO_ROBLOX_ROUTE_NOT_FOUND") {
        detail =
          "❌ O endpoint Roblox Stalker da Tokito mudou ou não está disponível nessa versão da API.";
      } else {
        detail = tokitoApi.userError(
          error,
          "Não foi possível consultar esse perfil do Roblox."
        );
      }

      return conn.sendMessage(from, {
        text: errorText(detail.replace(/^❌\s*/, "")),
        contextInfo: newsletterContext(),
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  _test: {
    boolLabel,
    isHttpUrl,
    findImageUrlDeep,
    officialRobloxHeadshot,
    resolveAvatar,
    downloadImage,
    unwrapResult,
    numberValue,
    normalizeTokitoProfile,
    frame,
    caption,
    usageText,
    errorText,
    requestTokitoRoblox,
    fetchTokitoRoblox,
    TOKITO_ROUTES,
  },
};
