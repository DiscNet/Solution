const axios = require("axios");
const configLoader = require("./configLoader");

function settings() {
  const config = configLoader.getBaseConfig();
  return {
    baseUrl: String(
      process.env.TOKITO_API_URL ||
      process.env.API_URL ||
      config.tokitoApiUrl ||
      config.API_URL ||
      "https://tokito-apis.com.br"
    ).replace(/\/+$/, ""),
    apiKey: String(
      process.env.TOKITO_API ||
      process.env.TOKITO_API_KEY ||
      process.env.API_KEY_TOKITO ||
      config.tokitoApi ||
      config.API_KEY_TOKITO ||
      ""
    ).trim(),
  };
}

function ensureConfigured() {
  const cfg = settings();
  if (!cfg.apiKey) {
    const error = new Error("Chave da API não configurada no config.js/ambiente.");
    error.code = "TOKITO_API_NOT_CONFIGURED";
    throw error;
  }
  return cfg;
}

function url(route, params = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const path = String(route || "").startsWith("/")
    ? String(route)
    : "/" + String(route || "");

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params || {})) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  query.set("apikey", apiKey);
  return `${baseUrl}${path}?${query.toString()}`;
}

function sanitize(value) {
  const { apiKey } = settings();
  let output = String(value ?? "");
  if (apiKey) output = output.split(apiKey).join("[API_KEY]");
  return output.replace(/([?&]apikey=)[^&\s]+/gi, "$1[API_KEY]");
}

function headersToObject(headers) {
  const out = {};
  if (!headers) return out;

  if (typeof headers.forEach === "function") {
    headers.forEach((value, key) => {
      out[String(key).toLowerCase()] = String(value);
    });
    return out;
  }

  for (const [key, value] of Object.entries(headers)) {
    out[String(key).toLowerCase()] = String(value);
  }
  return out;
}

function isProtection403(error) {
  if (Number(error?.response?.status || 0) !== 403) return false;

  const data = error?.response?.data;
  const headers = headersToObject(error?.response?.headers);
  const contentType = headers["content-type"] || "";
  const server = headers.server || "";

  return (
    /cloudflare/i.test(server) ||
    /text\/html/i.test(contentType) ||
    (typeof data === "string" && /<html|<!doctype|cloudflare/i.test(data))
  );
}

function errorInfo(error) {
  const status = Number(error?.response?.status || 0) || null;
  const data = error?.response?.data;

  let message =
    data?.message ||
    data?.mensagem ||
    data?.error ||
    data?.erro ||
    error?.message ||
    "Erro na API.";

  if (typeof data === "string" && data.trim() && !/<html|<!doctype/i.test(data)) {
    message = data.trim();
  }

  if (status === 403 && typeof data === "string" && /<html|<!doctype/i.test(data)) {
    message = "A proteção HTTP da API recusou a requisição (403).";
  }

  return {
    status,
    message: sanitize(message).slice(0, 500),
  };
}

function userError(error, fallback = "Não foi possível consultar a API.") {
  if (error?.code === "TOKITO_API_NOT_CONFIGURED") {
    return "❌ A chave da API não está configurada no config.js ou nas variáveis de ambiente.";
  }

  const info = errorInfo(error);
  if (info.status) return `❌ API (${info.status}): ${info.message}`;
  return `❌ ${info.message || fallback}`;
}

function timeoutSignal(timeoutMs) {
  const timeout = Number(timeoutMs || 0);
  if (!timeout || timeout <= 0) return undefined;

  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeout);
  }

  return undefined;
}

async function fetchFallback(target, options = {}) {
  if (typeof fetch !== "function") {
    const error = new Error("Fetch nativo não está disponível neste Node.js.");
    error.code = "TOKITO_FETCH_UNAVAILABLE";
    throw error;
  }

  const method = String(options.method || "GET").toUpperCase();
  const headers = { ...(options.headers || {}) };
  const init = {
    method,
    headers,
    signal: options.signal || timeoutSignal(options.timeout),
  };

  if (options.body !== undefined) {
    if (
      options.body !== null &&
      typeof options.body === "object" &&
      !Buffer.isBuffer(options.body) &&
      !(options.body instanceof ArrayBuffer) &&
      !(typeof URLSearchParams !== "undefined" && options.body instanceof URLSearchParams)
    ) {
      init.body = JSON.stringify(options.body);
      if (!Object.keys(headers).some(key => key.toLowerCase() === "content-type")) {
        headers["content-type"] = "application/json";
      }
    } else {
      init.body = options.body;
    }
  }

  const response = await fetch(target, init);
  const responseHeaders = headersToObject(response.headers);
  const contentType = responseHeaders["content-type"] || "";
  const responseType = options.responseType || "json";

  let data;
  if (responseType === "arraybuffer") {
    data = Buffer.from(await response.arrayBuffer());
  } else {
    const raw = await response.text();

    if (/application\/json|\+json/i.test(contentType)) {
      try {
        data = raw ? JSON.parse(raw) : null;
      } catch (_) {
        data = raw;
      }
    } else {
      try {
        data = raw ? JSON.parse(raw) : raw;
      } catch (_) {
        data = raw;
      }
    }
  }

  if (!response.ok) {
    const error = new Error(`Request failed with status code ${response.status}`);
    error.response = {
      status: response.status,
      data,
      headers: responseHeaders,
    };
    throw error;
  }

  return {
    status: response.status,
    data,
    headers: responseHeaders,
  };
}

async function get(route, params = {}, options = {}) {
  const target = url(route, params);

  try {
    const response = await axios.get(target, options);
    return response.data;
  } catch (error) {
    if (!isProtection403(error)) throw error;

    const response = await fetchFallback(target, {
      method: "GET",
      headers: options.headers,
      timeout: options.timeout,
      signal: options.signal,
    });

    return response.data;
  }
}

async function post(route, body = {}, options = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const path = String(route || "").startsWith("/")
    ? String(route)
    : "/" + String(route || "");

  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options.params || {})) {
    if (value === undefined || value === null || value === "") continue;
    query.set(key, String(value));
  }
  query.set("apikey", apiKey);

  const target = `${baseUrl}${path}?${query.toString()}`;
  const axiosOptions = { ...options };
  delete axiosOptions.params;

  try {
    const response = await axios.post(target, body, axiosOptions);
    return response.data;
  } catch (error) {
    if (!isProtection403(error)) throw error;

    const response = await fetchFallback(target, {
      method: "POST",
      body,
      headers: options.headers,
      timeout: options.timeout,
      signal: options.signal,
    });

    return response.data;
  }
}

async function buffer(route, params = {}, options = {}) {
  const target = url(route, params);

  try {
    const response = await axios.get(target, {
      ...options,
      responseType: "arraybuffer",
    });

    return {
      buffer: Buffer.from(response.data || []),
      contentType: String(response.headers?.["content-type"] || ""),
      status: response.status,
    };
  } catch (error) {
    if (!isProtection403(error)) throw error;

    const response = await fetchFallback(target, {
      method: "GET",
      responseType: "arraybuffer",
      headers: options.headers,
      timeout: options.timeout,
      signal: options.signal,
    });

    return {
      buffer: Buffer.from(response.data || []),
      contentType: String(response.headers?.["content-type"] || ""),
      status: response.status,
    };
  }
}

function firstObject(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data.resultado || data.result || data.data || data.results || data;
}

function list(data) {
  const raw =
    data?.resultado ??
    data?.resultados ??
    data?.result ??
    data?.data ??
    data?.results ??
    data;

  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.videos)) return raw.videos;
  if (Array.isArray(raw?.tracks)) return raw.tracks;
  return raw ? [raw] : [];
}

function geminiText(value) {
  const candidates =
    value?.candidates ||
    value?.resposta?.candidates ||
    value?.resultado?.candidates ||
    [];

  if (!Array.isArray(candidates) || !candidates.length) return "";

  return String(
    candidates[0]?.content?.parts
      ?.map(part => part?.text || "")
      .join("") || ""
  ).trim();
}

function text(data) {
  if (typeof data === "string" && data.trim()) return data.trim();

  const candidates = [
    data?.resposta,
    data?.response,
    data?.text,
    data?.texto,
    data?.answer,
    data?.result,
    data?.resultado,
    data?.message,
    data?.data?.resposta,
    data?.data?.text,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  const nested = geminiText(data);
  if (nested) return nested;

  for (const value of candidates) {
    if (!value || typeof value !== "object") continue;
    const inner = text(value);
    if (inner) return inner;
  }

  return "";
}

module.exports = {
  axios,
  rawAxios: axios,
  settings,
  ensureConfigured,
  url,
  sanitize,
  errorInfo,
  userError,
  isProtection403,
  fetchFallback,
  get,
  post,
  buffer,
  firstObject,
  list,
  geminiText,
  text,
};
