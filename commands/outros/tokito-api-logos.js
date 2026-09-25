const tokitoApi = require("../../functions/tokitoApi");
const { createStatusQuoted } = require("../../functions/statusCard");

const LOGOS = [
  "darkgreen",
  "write",
  "advancedglow",
  "typography",
  "pixelglitch",
  "neonglitch",
  "flag",
  "flag3d",
  "deleting",
  "blackpink",
  "glowing",
  "underwater",
  "logomaker",
  "papercut",
  "watercolor",
  "affectclouds",
  "blackpinklogo",
  "gradient",
  "summerbeach",
  "luxurygold",
  "sandsummer",
  "galaxywallpaper",
  "1917",
  "markingneon",
  "royal",
  "freecreate",
  "galaxy",
  "lighteffects",
  "neondevil",
  "frozen",
  "metal3d",
  "ligatures",
  "sunset",
  "clouds",
  "colorido",
  "naruto",
  "amongus",
  "comic3d",
];

function makeLogoCommand(definition) {
  const name = typeof definition === "string" ? definition : definition.name;
  const route = typeof definition === "string" ? definition : definition.route;

  return {
    name,
    aliases: [],
    menuCategory: "Logos",
    menuSection: "Tokito API",
    usage: name + " texto",
    description: "Gera logo " + name + " pela Tokito API",
    async execute(conn, msg, args, from) {
      const text = args.join(" ").trim();

      if (!text) {
        return conn.sendMessage(from, {
          text: "❌ Uso: ." + name + " <texto>",
        }, { quoted: createStatusQuoted(msg) });
      }

      try {
        await conn.sendMessage(from, {
          react: { text: "🎨", key: msg.key },
        }).catch(() => {});

        const result = await tokitoApi.buffer(
          "/api/" + route,
          { texto: text },
          {
            timeout: 90000,
            headers: { accept: "image/*,*/*" },
            maxContentLength: 20 * 1024 * 1024,
            maxBodyLength: 20 * 1024 * 1024,
          }
        );

        if (!result.buffer?.length || !/image/i.test(result.contentType)) {
          let apiMessage = "";
          try {
            const data = JSON.parse(result.buffer.toString("utf8"));
            apiMessage =
              data?.resultado ||
              data?.mensagem ||
              data?.message ||
              data?.error ||
              "";
          } catch {}

          throw new Error(
            String(apiMessage || "A Tokito API não retornou uma imagem válida.")
          );
        }

        await conn.sendMessage(from, {
          image: result.buffer,
          caption: "🎨 *" + name.toUpperCase() + "*\n\n" + text,
        }, { quoted: createStatusQuoted(msg) });

        await conn.sendMessage(from, {
          react: { text: "✅", key: msg.key },
        }).catch(() => {});
      } catch (error) {
        const info = tokitoApi.errorInfo(error);
        console.error("[TOKITO LOGO]", name, info.status || "-", info.message);

        await conn.sendMessage(from, {
          text: tokitoApi.userError(
            error,
            "Não foi possível gerar esse logo agora."
          ),
        }, { quoted: createStatusQuoted(msg) });
      }
    },
  };
}

const commands = LOGOS.map(makeLogoCommand);

module.exports = commands;
module.exports._test = {
  LOGOS,
  makeLogoCommand,
};
