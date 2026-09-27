// Menu: Utilidades - Stalker | Comando: robloxstalk
const config = require("../../../config/config");
const profiles = require("../../functions/publicProfiles");
const tokitoApi = require("../../functions/apiClient");
const { createStatusQuoted } = require("../../functions/statusCard");

const TOKITO_ROUTE = "/api/pesquisa/roblox-stalker";

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

  const avatar = String(firstDefined(
    raw.avatar,
    raw.avatar_url,
    raw.avatarUrl,
    raw.image,
    raw.imagem,
    raw.foto,
    raw.thumbnail,
    raw.thumbnailUrl,
    raw.headshot,
    raw.profile_pic
  ) || "").trim();

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

function caption(profile) {
  const bio = profile.description
    ? profile.description.replace(/\s+/g, " ").trim().slice(0, 700)
    : "Sem descrição pública.";

  const lines = [
    "🎮 *ROBLOX STALK*",
    "",
    "👤 *Usuário:* @" + profile.username,
    profile.displayName
      ? "🪪 *Nome de exibição:* " + profile.displayName
      : null,
    profile.id
      ? "🆔 *ID:* " + profile.id
      : null,
    "👥 *Seguidores:* " + profiles.fullNumber(profile.followers),
    "➡️ *Seguindo:* " + profiles.fullNumber(profile.following),
    "🤝 *Amigos:* " + profiles.fullNumber(profile.friends),
    "✅ *Verificado:* " + boolLabel(profile.verified),
    "🚫 *Banido:* " + boolLabel(profile.banned),
    profile.created
      ? "📅 *Conta criada:* " + profiles.datePt(profile.created)
      : null,
    "",
    "📝 *Descrição:* " + bio,
    "",
    "🌐 " + profile.profileUrl,
    "",
    "⚡ _Dados consultados pela Tokito API._",
  ].filter(Boolean);

  return lines.join("\n");
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
        text:
          "🎮 *ROBLOX STALK*\n\n" +
          "Uso: *" + prefix + "robloxstalk <usuario>*\n" +
          "Ex.: *" + prefix + "robloxstalk Builderman*",
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
          await conn.sendMessage(from, {
            image: { url: profile.avatar },
            caption: text,
          }, { quoted: createStatusQuoted(msg) });

          await conn.sendMessage(from, {
            react: { text: "✅", key: msg.key },
          }).catch(() => {});

          return;
        } catch (_) {}
      }

      await conn.sendMessage(from, {
        text,
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

      const detail = error?.code === "INVALID_USERNAME"
        ? "❌ Informe um usuário válido do Roblox."
        : tokitoApi.userError(
            error,
            "Não foi possível consultar esse perfil do Roblox."
          );

      return conn.sendMessage(from, {
        text: detail,
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  _test: {
    boolLabel,
    unwrapResult,
    numberValue,
    normalizeTokitoProfile,
    caption,
    fetchTokitoRoblox,
  },
};
