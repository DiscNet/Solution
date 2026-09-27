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

  const browserHeaders = {
    "user-agent":
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 " +
      "(KHTML, like Gecko) Chrome/140.0.0.0 Safari/537.36",
    accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language": "pt-BR,pt;q=0.9,en;q=0.8",
  };

  const home = await http.get(PRIVNOTE_BASE_URL + "/", {
    timeout: 30000,
    maxRedirects: 5,
    validateStatus: () => true,
    headers: browserHeaders,
  });

  const cookies = Array.isArray(home.headers?.["set-cookie"])
    ? home.headers["set-cookie"]
        .map(value => String(value).split(";")[0])
        .filter(Boolean)
        .join("; ")
    : "";

  if (home.status < 200 || home.status >= 400) {
    const error = new Error("Privnote recusou a sessão inicial com HTTP " + home.status + ".");
    error.httpStatus = home.status;
    throw error;
  }

  const postHeaders = {
    ...browserHeaders,
    "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
    "x-requested-with": "XMLHttpRequest",
    origin: PRIVNOTE_BASE_URL,
    referer: PRIVNOTE_BASE_URL + "/",
    accept: "application/json, text/javascript, */*; q=0.01",
    ...(cookies ? { cookie: cookies } : {}),
  };

  let response = null;
  for (const endpoint of ["/legacy/", "/"]) {
    response = await http.post(
      PRIVNOTE_BASE_URL + endpoint,
      form.toString(),
      {
        timeout: 30000,
        maxRedirects: 5,
        validateStatus: () => true,
        headers: postHeaders,
      },
    );

    if (response.status >= 200 && response.status < 300) break;
    if (response.status !== 403 && response.status !== 404) break;
  }

  if (!response || response.status < 200 || response.status >= 300) {
    const status = Number(response?.status || 0);
    const error = new Error(
      "Privnote respondeu HTTP " + (status || "desconhecido") + "."
    );
    error.httpStatus = status || null;
    throw error;
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

      const status = Number(error?.httpStatus || error?.response?.status || 0);
      const detail = status ? ` (HTTP ${status})` : "";

      return conn.sendMessage(from, {
        text:
          "❌ Não foi possível criar a nota no Privnote agora" +
          detail +
          ".",
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
