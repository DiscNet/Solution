// Menu: Brincadeiras | Comando: privnote / PrivRush
const config = require("../../../config/config");
const { senderFrom } = require("../../sistemas/contexto");
const privRush = require("../../functions/privRush");

const ONETIME_SECRET_BASE_URL = "https://us.onetimesecret.com";
const ONETIME_SECRET_SHARE_DOMAIN = "us.onetimesecret.com";
const MAX_NOTE_LENGTH = 8500;
const SECRET_TTL_SECONDS = Math.floor(privRush.DROP_TTL_MS / 1000);

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
        ttl: String(SECRET_TTL_SECONDS),
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

function buildRushSecret(text, draft, prefix) {
  return (
    "🏁 PRIVRUSH — COFRE RELÂMPAGO\n\n" +
    "📩 CONTEÚDO DO CRIADOR:\n" +
    String(text) +
    "\n\n━━━━━━━━━━━━━━━━━━\n" +
    "🎟️ CÓDIGO DE RESGATE:\n" +
    draft.code +
    "\n\n" +
    "🏆 Você foi a primeira pessoa a revelar este cofre.\n" +
    "Volte ao WhatsApp e use:\n" +
    prefix + "resgatar " + draft.code +
    "\n\n" +
    "💠 Prêmio base: " + draft.basePoints + " PrivPoints\n" +
    "⚡ Quanto mais rápido resgatar, maior o bônus.\n" +
    "🚫 O criador do drop não pode resgatar.\n" +
    "⌛ O código expira em 10 minutos."
  );
}

module.exports = {
  // O arquivo continua na pasta /dono por compatibilidade, mas estas flags
  // anulam a permissão inferida e deixam o comando disponível em qualquer chat.
  permissions: { owner: false, private: false },
  name: "privnote",
  aliases: ["pn", "privrush", "cofre"],
  menuCategory: "Brincadeiras",
  menuSection: "PrivRush",
  usage: "privnote <mensagem>",
  description: "Cria um cofre de visualização única; o primeiro a resgatar o código vence",

  async execute(conn, msg, args = [], from, axiosInstance) {
    const text = args.join(" ").trim();
    const prefix = String(config.prefix || ".");
    const creator = senderFrom(msg, from);

    if (!text) {
      return conn.sendMessage(from, {
        text:
          "🏁 *PRIVRUSH*\n\n" +
          "Crie um cofre que só pode ser revelado uma vez.\n" +
          "Dentro dele haverá um código secreto. Quem abrir primeiro e usar o código antes dos outros vence.\n\n" +
          "Uso: *" + prefix + "privnote <mensagem>*\n" +
          "Resgate: *" + prefix + "resgatar KX-XXXX-XXXX*\n" +
          "Ranking: *" + prefix + "privrank*",
      });
    }

    if (text.length > MAX_NOTE_LENGTH) {
      return conn.sendMessage(from, {
        text: `❌ A mensagem deve ter no máximo ${MAX_NOTE_LENGTH} caracteres.`,
      });
    }

    let draft = null;

    try {
      draft = privRush.prepareDrop({
        creator,
        chatId: from,
        message: text,
      });

      privRush.commitDrop(draft);

      await conn.sendMessage(from, {
        react: { text: "🔐", key: msg.key },
      }).catch(() => {});

      const hiddenContent = buildRushSecret(text, draft, prefix);
      const note = await createOnetimeSecret(axiosInstance, hiddenContent);

      await conn.sendMessage(from, {
        text:
          "🏁 *PRIVRUSH ABERTO!*\n\n" +
          "🔐 " + note.url +
          "\n\n" +
          "👁️ A nota só pode ser revelada *uma vez*.\n" +
          "🎟️ Dentro dela existe um código de resgate.\n" +
          "🏆 A primeira pessoa que usar *" + prefix + "resgatar <código>* vence.\n" +
          "💠 Base: *" + draft.basePoints + " PrivPoints*\n" +
          "⚡ Bônus máximo de velocidade: *+200*\n" +
          "⌛ Validade: *10 minutos*\n" +
          "🚫 O criador não pode resgatar o próprio drop.\n\n" +
          "📊 Ranking deste chat: *" + prefix + "privrank*",
      });

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      if (draft) {
        try {
          privRush.cancelDrop(draft);
        } catch (_) {}
      }

      if (error?.code === "CREATE_COOLDOWN") {
        const seconds = Math.max(
          1,
          Math.ceil(Number(error.remainingMs || 0) / 1000)
        );

        return conn.sendMessage(from, {
          text:
            "⏳ Aguarde *" + seconds +
            "s* antes de soltar outro PrivRush.",
        });
      }

      console.error("[PRIVRUSH]", error?.message || error);

      await conn.sendMessage(from, {
        react: { text: "❌", key: msg.key },
      }).catch(() => {});

      const status = Number(error?.httpStatus || error?.response?.status || 0);
      const detail = status ? ` (HTTP ${status})` : "";

      return conn.sendMessage(from, {
        text:
          "❌ Não foi possível criar o PrivRush agora" +
          detail +
          ".",
      });
    }
  },

  _test: {
    normalizeResponse,
    createOnetimeSecret,
    buildRushSecret,
  },
};
