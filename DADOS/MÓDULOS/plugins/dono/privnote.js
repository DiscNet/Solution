// Menu: Dono - Utilidades | Comando: privnote
const ONETIME_SECRET_BASE_URL = "https://us.onetimesecret.com";
const ONETIME_SECRET_SHARE_DOMAIN = "us.onetimesecret.com";
const MAX_NOTE_LENGTH = 12000;

function normalizeResponse(data) {
  if (data && typeof data === "object") return data;
  if (typeof data !== "string") return {};

  try {
    return JSON.parse(data);
  } catch (_) {
    return {};
  }
}

async function createOnetimeSecret(http, text) {
  const response = await http.post(
    ONETIME_SECRET_BASE_URL + "/api/v2/guest/secret/conceal",
    {
      secret: {
        kind: "conceal",
        share_domain: ONETIME_SECRET_SHARE_DOMAIN,
        secret: String(text),
      },
    },
    {
      timeout: 30000,
      validateStatus: () => true,
      headers: {
        "content-type": "application/json",
        accept: "application/json",
        "user-agent": "WhatsAppBot/1.0",
      },
    },
  );

  if (response.status < 200 || response.status >= 300) {
    const data = normalizeResponse(response.data);
    const message = String(data.message || data.error || "").trim();
    const error = new Error(
      "Onetime Secret respondeu HTTP " +
        response.status +
        (message ? ": " + message : "."),
    );
    error.httpStatus = response.status;
    throw error;
  }

  const data = normalizeResponse(response.data);
  const record = data.record && typeof data.record === "object" ? data.record : {};
  const secret = record.secret && typeof record.secret === "object" ? record.secret : {};
  const receipt = record.receipt && typeof record.receipt === "object" ? record.receipt : {};

  const identifier = String(
    secret.identifier || receipt.secret_identifier || "",
  ).trim();

  if (!identifier) {
    throw new Error("Onetime Secret não retornou o identificador da nota.");
  }

  const shareDomain = String(
    record.share_domain || receipt.share_domain || ONETIME_SECRET_SHARE_DOMAIN,
  )
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/+$/, "");

  if (!shareDomain) {
    throw new Error("Onetime Secret não retornou um domínio de compartilhamento válido.");
  }

  return {
    url: `https://${shareDomain}/secret/${encodeURIComponent(identifier)}`,
    provider: "Onetime Secret",
  };
}

module.exports = {
  permissions: { owner: true, private: true },
  name: "privnote",
  aliases: ["pn"],
  menuCategory: "Dono",
  menuSection: "Utilidades",
  usage: "privnote <texto>",
  description: "Cria uma nota descartável de visualização única no Onetime Secret",

  async execute(conn, msg, args = [], from, axiosInstance) {
    const text = args.join(" ").trim();

    if (!text) {
      return conn.sendMessage(from, {
        text:
          "📝 *PRIVNOTE*\n\n" +
          "Uso: *.privnote <texto>*\n" +
          "Ex.: *.privnote código temporário*",
      });
    }

    if (text.length > MAX_NOTE_LENGTH) {
      return conn.sendMessage(from, {
        text: `❌ A nota deve ter no máximo ${MAX_NOTE_LENGTH} caracteres.`,
      });
    }

    try {
      await conn.sendMessage(from, {
        react: { text: "🔐", key: msg.key },
      }).catch(() => {});

      const note = await createOnetimeSecret(axiosInstance, text);

      await conn.sendMessage(from, {
        text:
          "🔐 *NOTA DESCARTÁVEL CRIADA*\n\n" +
          note.url +
          "\n\n🌐 Serviço: *" + note.provider + "*\n" +
          "⚠️ O conteúdo pode ser visualizado uma única vez e depois é destruído.",
      });

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[PRIVNOTE]", error?.message || error);

      await conn.sendMessage(from, {
        react: { text: "❌", key: msg.key },
      }).catch(() => {});

      const status = Number(error?.httpStatus || error?.response?.status || 0);
      const detail = status ? ` (HTTP ${status})` : "";

      return conn.sendMessage(from, {
        text:
          "❌ Não foi possível criar a nota no Onetime Secret agora" +
          detail +
          ".",
      });
    }
  },

  _test: {
    normalizeResponse,
    createOnetimeSecret,
  },
};
