// Menu: Utilidades - Stalker | Comando: instastalk
const config = require("../../../config/config");
const profiles = require("../../functions/publicProfiles");
const { createStatusQuoted } = require("../../functions/statusCard");

function boolLabel(value) {
  return value ? "Sim" : "Não";
}

function caption(profile) {
  const bio = profile.biography
    ? profile.biography.replace(/\s+/g, " ").trim().slice(0, 500)
    : "Sem bio pública.";

  const lines = [
    "📸 *INSTAGRAM STALK*",
    "",
    "👤 *Usuário:* @" + profile.username,
    profile.fullName ? "🪪 *Nome:* " + profile.fullName : null,
    "👥 *Seguidores:* " + profiles.fullNumber(profile.followers),
    "➡️ *Seguindo:* " + profiles.fullNumber(profile.following),
    "🖼️ *Publicações:* " + profiles.fullNumber(profile.posts),
    "✅ *Verificado:* " + boolLabel(profile.verified),
    "🔒 *Privado:* " + boolLabel(profile.private),
    profile.category ? "🏷️ *Categoria:* " + profile.category : null,
    "",
    "📝 *Bio:* " + bio,
    profile.externalUrl ? "🔗 *Link da bio:* " + profile.externalUrl : null,
    "",
    "🌐 " + profile.profileUrl,
    "",
    "_Somente informações públicas do perfil._",
  ].filter(Boolean);

  return lines.join("\n");
}

module.exports = {
  name: "instastalk",
  aliases: ["igstalk", "instagramstalk", "stalkinsta"],
  description: "Consulta informações públicas de um perfil do Instagram",
  menuCategory: "Utilidades",
  menuSection: "Stalker",
  usage: "instastalk <usuario>",

  async execute(conn, msg, args = [], from) {
    const prefix = String(config.prefix || ".");
    const raw = args.join(" ").trim();

    if (!raw) {
      return conn.sendMessage(from, {
        text:
          "📸 *INSTAGRAM STALK*\n\n" +
          "Uso: *" + prefix + "instastalk <usuario>*\n" +
          "Ex.: *" + prefix + "instastalk instagram*",
      }, { quoted: createStatusQuoted(msg) });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🔎", key: msg.key },
      }).catch(() => {});

      const profile = await profiles.fetchInstagramProfile(raw);
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
      console.error("[INSTASTALK]", error?.message || error);

      await conn.sendMessage(from, {
        react: { text: "❌", key: msg.key },
      }).catch(() => {});

      let detail = error?.message || "Não foi possível consultar o perfil.";
      if (error?.code === "INVALID_USERNAME") {
        detail = "Informe um usuário válido do Instagram.";
      } else if (error?.code === "NOT_FOUND") {
        detail = "Esse perfil do Instagram não foi encontrado.";
      } else if (error?.code === "INSTAGRAM_BLOCKED") {
        detail = "O Instagram bloqueou temporariamente consultas públicas automatizadas.";
      } else if (error?.code === "RATE_LIMIT") {
        detail = "O Instagram limitou as consultas. Tente novamente mais tarde.";
      }

      return conn.sendMessage(from, {
        text: "❌ " + detail,
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  _test: { caption },
};
