// Menu: Dono - Utilidades | Comando: privnote
const crypto = require("crypto");

const PRIVNOTE_BASE_URL = "https://privnote.com";
const MAX_NOTE_LENGTH = 12000;

function evpBytesToKey(password, salt, keyLength = 32, ivLength = 16) {
  const passwordBuffer = Buffer.isBuffer(password)
    ? password
    : Buffer.from(String(password), "utf8");

  const blocks = [];
  let previous = Buffer.alloc(0);

  while (Buffer.concat(blocks).length < keyLength + ivLength) {
    const hash = crypto.createHash("md5");
    hash.update(previous);
    hash.update(passwordBuffer);
    hash.update(salt);
    previous = hash.digest();
    blocks.push(previous);
  }

  const material = Buffer.concat(blocks);
  return {
    key: material.subarray(0, keyLength),
    iv: material.subarray(keyLength, keyLength + ivLength),
  };
}

function encryptPrivnote(text, passphrase) {
  const salt = crypto.randomBytes(8);
  const { key, iv } = evpBytesToKey(passphrase, salt);

  const cipher = crypto.createCipheriv("aes-256-cbc", key, iv);
  const encrypted = Buffer.concat([
    cipher.update(String(text), "utf8"),
    cipher.final(),
  ]);

  // Formato OpenSSL/GibberishAES: "Salted__" + salt + ciphertext.
  return Buffer.concat([
    Buffer.from("Salted__", "ascii"),
    salt,
    encrypted,
  ]).toString("base64");
}

function generatePassphrase() {
  // Somente caracteres seguros para fragmento de URL.
  return crypto.randomBytes(12).toString("base64url");
}

function normalizeResponse(data) {
  if (data && typeof data === "object") return data;
  if (typeof data !== "string") return {};

  try {
    return JSON.parse(data);
  } catch (_) {
    return {};
  }
}

async function createPrivnote(http, text) {
  const passphrase = generatePassphrase();
  const encrypted = encryptPrivnote(text, passphrase);

  const form = new URLSearchParams();
  form.append("", "");
  form.append("data", encrypted);
  form.append("has_manual_pass", "false");
  form.append("duration_hours", "0");
  form.append("dont_ask", "false");
  form.append("data_type", "T");
  form.append("notify_email", "");
  form.append("notify_ref", "");

  const response = await http.post(
    PRIVNOTE_BASE_URL + "/legacy/",
    form.toString(),
    {
      timeout: 30000,
      validateStatus: () => true,
      headers: {
        "content-type": "application/x-www-form-urlencoded",
        "x-requested-with": "XMLHttpRequest",
        "user-agent": "Mozilla/5.0",
        accept: "application/json, text/plain, */*",
      },
    },
  );

  if (response.status < 200 || response.status >= 300) {
    throw new Error("Privnote respondeu HTTP " + response.status + ".");
  }

  const data = normalizeResponse(response.data);
  const noteLink = String(
    data.note_link ||
    data.noteLink ||
    data.url ||
    "",
  ).trim();

  if (!noteLink) {
    throw new Error("Privnote não retornou o link da nota.");
  }

  const base = /^https?:\/\//i.test(noteLink)
    ? noteLink
    : new URL(noteLink, PRIVNOTE_BASE_URL).toString();

  const clean = base.split("#")[0];
  return clean + "#" + passphrase;
}

module.exports = {
  permissions: { owner: true, private: true },
  name: "privnote",
  aliases: ["pn"],
  menuCategory: "Dono",
  menuSection: "Utilidades",
  usage: "privnote <texto>",
  description: "Cria uma nota Privnote criptografada e descartável",

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

      const url = await createPrivnote(axiosInstance, text);

      await conn.sendMessage(from, {
        text:
          "🔐 *PRIVNOTE CRIADO*\n\n" +
          url +
          "\n\n⚠️ O link contém a chave de descriptografia. " +
          "Por padrão, a nota é destruída após a primeira leitura.",
      });

      await conn.sendMessage(from, {
        react: { text: "✅", key: msg.key },
      }).catch(() => {});
    } catch (error) {
      console.error("[PRIVNOTE]", error?.message || error);

      await conn.sendMessage(from, {
        react: { text: "❌", key: msg.key },
      }).catch(() => {});

      return conn.sendMessage(from, {
        text: "❌ Não foi possível criar a nota no Privnote agora.",
      });
    }
  },

  _test: {
    evpBytesToKey,
    encryptPrivnote,
    generatePassphrase,
    normalizeResponse,
    createPrivnote,
  },
};
