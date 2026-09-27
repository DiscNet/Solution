// Menu: Utilidades - Stalker | Comando: robloxstalk
const config = require("../../../config/config");
const profiles = require("../../functions/publicProfiles");
const { createStatusQuoted } = require("../../functions/statusCard");

function boolLabel(value) {
  return value ? "Sim" : "Não";
}

function caption(profile) {
  const bio = profile.description
    ? profile.description.replace(/\s+/g, " ").trim().slice(0, 700)
    : "Sem descrição pública.";

  const lines = [
    "🎮 *ROBLOX STALK*",
    "",
    "👤 *Usuário:* @" + profile.username,
    profile.displayName ? "🪪 *Nome de exibição:* " + profile.displayName : null,
    "🆔 *ID:* " + profile.id,
    "👥 *Seguidores:* " + profiles.fullNumber(profile.followers),
    "➡️ *Seguindo:* " + profiles.fullNumber(profile.following),
    "🤝 *Amigos:* " + profiles.fullNumber(profile.friends),
    "✅ *Verificado:* " + boolLabel(profile.verified),
    "🚫 *Banido:* " + boolLabel(profile.banned),
    "📅 *Conta criada:* " + profiles.datePt(profile.created),
    "",
    "📝 *Descrição:* " + bio,
    "",
    "🌐 " + profile.profileUrl,
    "",
    "_Somente informações públicas do perfil._",
  ].filter(Boolean);

  return lines.join("\n");
}

module.exports = {
  name: "robloxstalk",
  aliases: ["rstalk", "stalkroblox", "robloxperfil"],
  description: "Consulta informações públicas de um perfil do Roblox",
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

      const profile = await profiles.fetchRobloxProfile(raw);
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
      console.error("[ROBLOXSTALK]", error?.message || error);

      await conn.sendMessage(from, {
        react: { text: "❌", key: msg.key },
      }).catch(() => {});

      let detail = error?.message || "Não foi possível consultar o perfil.";
      if (error?.code === "INVALID_USERNAME") {
        detail = "Informe um usuário válido do Roblox.";
      } else if (error?.code === "NOT_FOUND") {
        detail = "Esse usuário do Roblox não foi encontrado.";
      } else if (error?.code === "RATE_LIMIT") {
        detail = "O Roblox limitou as consultas. Tente novamente mais tarde.";
      }

      return conn.sendMessage(from, {
        text: "❌ " + detail,
      }, { quoted: createStatusQuoted(msg) });
    }
  },

  _test: { caption },
};
