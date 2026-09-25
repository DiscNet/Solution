const axios = require("axios");
const config = require("../config/config");

function settings() {
  return {
    baseUrl: String(config.tokitoApiUrl || process.env.TOKITO_API_URL || "https://tokito-apis.com.br").replace(/\/+$/, ""),
    apiKey: String(config.tokitoApi || process.env.TOKITO_API || "").trim(),
  };
}

function ensureConfigured() {
  const cfg = settings();
  if (!cfg.apiKey) {
    const error = new Error("TOKITO_API não configurada.");
    error.code = "TOKITO_API_NOT_CONFIGURED";
    throw error;
  }
  return cfg;
}

function url(route, params = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const normalized = String(route || "").startsWith("/") ? String(route) : "/" + String(route || "");
  const target = new URL(baseUrl + normalized);

  for (const [key, value] of Object.entries({ ...params, apikey: apiKey })) {
    if (value === undefined || value === null || value === "") continue;
    target.searchParams.set(key, String(value));
  }

  return target.toString();
}

async function get(route, params = {}, options = {}) {
  const response = await axios.get(url(route, params), {
    timeout: options.timeout || 120000,
    headers: {
      "user-agent": "SolutionBot/TokitoApi",
      accept: "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });
  return response.data;
}

async function post(route, body = {}, options = {}) {
  const { baseUrl, apiKey } = ensureConfigured();
  const normalized = String(route || "").startsWith("/") ? String(route) : "/" + String(route || "");
  const target = baseUrl + normalized;

  const response = await axios.post(target, body, {
    timeout: options.timeout || 120000,
    params: { ...(options.params || {}), apikey: apiKey },
    headers: {
      "user-agent": "SolutionBot/TokitoApi",
      accept: "application/json",
      ...(options.headers || {}),
    },
    ...options,
  });

  return response.data;
}

async function buffer(route, params = {}, options = {}) {
  const response = await axios.get(url(route, params), {
    responseType: "arraybuffer",
    timeout: options.timeout || 120000,
    maxContentLength: options.maxContentLength || 40 * 1024 * 1024,
    maxBodyLength: options.maxBodyLength || 40 * 1024 * 1024,
    headers: {
      "user-agent": "SolutionBot/TokitoApi",
      ...(options.headers || {}),
    },
  });

  return {
    buffer: Buffer.from(response.data || []),
    contentType: String(response.headers?.["content-type"] || ""),
  };
}

function firstObject(data) {
  if (!data) return null;
  if (Array.isArray(data)) return data[0] || null;
  return data.resultado || data.result || data.data || data.results || data;
}

function list(data) {
  const raw = data?.resultado ?? data?.resultados ?? data?.result ?? data?.data ?? data?.results ?? data;
  if (Array.isArray(raw)) return raw;
  if (Array.isArray(raw?.items)) return raw.items;
  if (Array.isArray(raw?.results)) return raw.results;
  if (Array.isArray(raw?.videos)) return raw.videos;
  if (Array.isArray(raw?.tracks)) return raw.tracks;
  return raw ? [raw] : [];
}

function text(data) {
  const candidates = [
    data?.resposta,
    data?.response,
    data?.text,
    data?.texto,
    data?.answer,
    data?.result,
    data?.resultado,
    data?.data?.resposta,
    data?.data?.text,
  ];

  for (const value of candidates) {
    if (typeof value === "string" && value.trim()) return value.trim();
  }

  return "";
}

module.exports = {
  axios,
  settings,
  ensureConfigured,
  url,
  get,
  post,
  buffer,
  firstObject,
  list,
  text,
};
