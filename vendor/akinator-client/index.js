"use strict";

const Languages = Object.freeze({
  Arabic: "ar",
  Chinese: "cn",
  Dutch: "nl",
  English: "en",
  French: "fr",
  German: "de",
  Hebrew: "il",
  Indonesian: "id",
  Italian: "it",
  Japanese: "jp",
  Korean: "kr",
  Polish: "pl",
  Portuguese: "pt",
  Russian: "ru",
  Spanish: "es",
  Turkish: "tr",
});

const Themes = Object.freeze({
  Character: 1,
  Objects: 2,
  Animals: 14,
});

const Answers = Object.freeze({
  Yes: 0,
  No: 1,
  IDontKnow: 2,
  Probably: 3,
  ProbablyNot: 4,
});

const USER_AGENT =
  "Mozilla/5.0 (Linux; Android 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0.0.0 Mobile Safari/537.36";

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function decodeHtml(value) {
  const named = {
    amp: "&",
    apos: "'",
    gt: ">",
    lt: "<",
    nbsp: " ",
    quot: '"',
  };
  return String(value || "")
    .replace(/&#(x?[0-9a-f]+);/gi, (_, code) => {
      const radix = /^x/i.test(code) ? 16 : 10;
      const number = Number.parseInt(code.replace(/^x/i, ""), radix);
      return Number.isFinite(number) ? String.fromCodePoint(number) : _;
    })
    .replace(/&([a-z]+);/gi, (all, name) => named[name.toLowerCase()] ?? all);
}

function stripHtml(value) {
  return decodeHtml(String(value || "").replace(/<[^>]+>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

function hiddenInput(html, name) {
  const safe = String(name).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const patterns = [
    new RegExp(`<input[^>]*name=["']${safe}["'][^>]*value=["']([^"']*)["'][^>]*>`, "i"),
    new RegExp(`<input[^>]*value=["']([^"']*)["'][^>]*name=["']${safe}["'][^>]*>`, "i"),
  ];
  for (const pattern of patterns) {
    const match = String(html || "").match(pattern);
    if (match) return decodeHtml(match[1]);
  }
  return "";
}

function questionFromHtml(html) {
  const source = String(html || "");
  const patterns = [
    /<[^>]+id=["']question-label["'][^>]*>([\s\S]*?)<\/[^>]+>/i,
    /<p[^>]+class=["'][^"']*question[^"']*["'][^>]*>([\s\S]*?)<\/p>/i,
  ];
  for (const pattern of patterns) {
    const match = source.match(pattern);
    if (match) {
      const text = stripHtml(match[1]);
      if (text) return text;
    }
  }
  return "";
}

function localStorageIdentifier(html) {
  const match = String(html || "").match(/localStorage\.(?:setItem\(\s*["']identifiant["']\s*,\s*|identifiant\s*=\s*)["']([^"']+)["']/i);
  return match ? decodeHtml(match[1]) : "";
}

function normalizeSetCookies(headers) {
  if (!headers) return [];
  if (typeof headers.getSetCookie === "function") return headers.getSetCookie();
  const raw = headers.get?.("set-cookie");
  if (!raw) return [];
  // Akinator normally sends simple cookies. Avoid splitting Expires dates on commas.
  return raw.split(/,(?=\s*[^;,=\s]+=[^;,]+)/g).map((value) => value.trim());
}

class AkinatorClient {
  constructor(options = {}) {
    this.language = options.language || Languages.English;
    this.theme = Number(options.theme || Themes.Character);
    this.childMode = Boolean(options.childMode);
    this.retries = Math.max(0, Math.min(5, Number(options.retries ?? 2) || 0));
    this.scraperApiKey = options.scraperApiKey || "";
    this.scraperApiSession = options.scraperApiSession || Math.floor(Math.random() * 1_000_000_000);
    this.timeoutMs = Math.max(5_000, Number(options.timeoutMs || 30_000));
    this.baseUrl = `https://${this.language}.akinator.com`;
    this.cookies = new Map();
    this._resetState();
  }

  _resetState() {
    this.session = "";
    this.signature = "";
    this.identifiant = "";
    this.question = "";
    this.step = 0;
    this.progression = 0;
    this.won = false;
    this.ko = false;
    this.started = false;
    this.winResult = null;
    this.akitude = "";
    this.stepLastProposition = "";
  }

  _cookieHeader() {
    return [...this.cookies.entries()].map(([name, value]) => `${name}=${value}`).join("; ");
  }

  _captureCookies(headers) {
    for (const cookie of normalizeSetCookies(headers)) {
      const first = String(cookie).split(";", 1)[0];
      const eq = first.indexOf("=");
      if (eq <= 0) continue;
      const name = first.slice(0, eq).trim();
      const value = first.slice(eq + 1).trim();
      if (name) this.cookies.set(name, value);
    }
  }

  _targetUrl(url) {
    if (!this.scraperApiKey) return url;
    const proxy = new URL("https://api.scraperapi.com/");
    proxy.searchParams.set("api_key", this.scraperApiKey);
    proxy.searchParams.set("url", url);
    proxy.searchParams.set("session_number", String(this.scraperApiSession));
    if (this.cookies.size) proxy.searchParams.set("keep_headers", "true");
    return proxy.toString();
  }

  async _request(method, pathname, form = null, { manualRedirect = false } = {}) {
    const absolute = /^https?:\/\//i.test(pathname) ? pathname : new URL(pathname, this.baseUrl).toString();
    const target = this._targetUrl(absolute);
    const body = form ? new URLSearchParams(Object.entries(form).filter(([, value]) => value !== undefined && value !== null).map(([key, value]) => [key, String(value)])) : undefined;
    let lastError;

    for (let attempt = 0; attempt <= this.retries; attempt++) {
      try {
        const headers = {
          Accept: "application/json, text/plain, */*",
          "User-Agent": USER_AGENT,
          Referer: `${this.baseUrl}/`,
        };
        const cookie = this._cookieHeader();
        if (cookie) headers.Cookie = cookie;
        if (body) headers["Content-Type"] = "application/x-www-form-urlencoded; charset=UTF-8";

        const response = await fetch(target, {
          method,
          headers,
          body,
          redirect: manualRedirect ? "manual" : "follow",
          signal: AbortSignal.timeout(this.timeoutMs),
        });
        this._captureCookies(response.headers);
        const text = await response.text();
        return { status: response.status, ok: response.ok, text, headers: response.headers };
      } catch (error) {
        lastError = error;
        if (attempt >= this.retries) break;
        await sleep(250 * (attempt + 1));
      }
    }

    throw lastError || new Error("Akinator request failed");
  }

  _sessionForm(extra = {}) {
    return {
      step: this.step,
      progression: this.progression,
      sid: this.theme,
      cm: this.childMode ? 1 : 0,
      session: this.session,
      signature: this.signature,
      ...extra,
    };
  }

  _json(text, endpoint) {
    const body = String(text || "").trim();
    if (!body || /^</.test(body)) {
      throw new Error(`Akinator returned a non-JSON response for ${endpoint}`);
    }
    try {
      return JSON.parse(body);
    } catch (error) {
      throw new Error(`Invalid Akinator JSON for ${endpoint}: ${error.message}`);
    }
  }

  _assertStarted() {
    if (!this.started || !this.session || !this.signature) {
      throw new Error("Akinator game has not been started");
    }
  }

  _update(data = {}) {
    if (data.session != null) this.session = String(data.session);
    if (data.signature != null) this.signature = String(data.signature);
    if (data.step != null && Number.isFinite(Number(data.step))) this.step = Number(data.step);
    if (data.progression != null && Number.isFinite(Number(data.progression))) this.progression = Number(data.progression);
    if (data.question != null) this.question = stripHtml(data.question);
    if (data.akitude != null) this.akitude = String(data.akitude);
    if (data.step_last_proposition != null) this.stepLastProposition = String(data.step_last_proposition);

    const propositionId = data.id_proposition ?? data.proposition_id ?? data?.proposition?.id;
    const proposition = data.proposition || {};
    if (propositionId != null || data.name_proposition || proposition.name) {
      this.won = true;
      this.ko = false;
      this.winResult = {
        id: propositionId != null ? String(propositionId) : "",
        name: stripHtml(data.name_proposition ?? proposition.name ?? ""),
        description: stripHtml(data.description_proposition ?? proposition.description ?? ""),
        pictureUrl: String(data.photo ?? data.picture ?? proposition.photo ?? proposition.picture ?? ""),
      };
      return data;
    }

    const completion = String(data.completion || data.status || "").toUpperCase();
    if (completion === "KO") {
      this.ko = true;
      this.won = false;
      this.winResult = null;
    } else if (data.question != null) {
      this.won = false;
      this.ko = false;
      this.winResult = null;
    }
    return data;
  }

  async start() {
    this._resetState();
    const home = await this._request("GET", "/");
    if (!home.ok) throw new Error(`Akinator home returned HTTP ${home.status}`);
    this.identifiant = localStorageIdentifier(home.text);

    const game = await this._request("POST", "/game", {
      sid: this.theme,
      cm: this.childMode ? 1 : 0,
    });
    if (!game.ok) throw new Error(`Akinator game start returned HTTP ${game.status}`);

    this.session = hiddenInput(game.text, "session");
    this.signature = hiddenInput(game.text, "signature");
    this.question = questionFromHtml(game.text);
    this.identifiant = this.identifiant || localStorageIdentifier(game.text);
    this.step = 0;
    this.progression = 0;
    this.started = Boolean(this.session && this.signature && this.question);
    if (!this.started) throw new Error("Could not parse Akinator game session");
    return this;
  }

  async answer(answer) {
    this._assertStarted();
    const value = Number(answer);
    if (![0, 1, 2, 3, 4].includes(value)) throw new Error("Invalid Akinator answer");
    const response = await this._request("POST", "/answer", this._sessionForm({
      answer: value,
      step_last_proposition: this.stepLastProposition,
    }));
    if (!response.ok) throw new Error(`Akinator answer returned HTTP ${response.status}`);
    return this._update(this._json(response.text, "/answer"));
  }

  async back() {
    this._assertStarted();
    if (this.step <= 0) throw new Error("Already at the first Akinator question");
    const response = await this._request("POST", "/cancel_answer", this._sessionForm());
    if (!response.ok) throw new Error(`Akinator back returned HTTP ${response.status}`);
    return this._update(this._json(response.text, "/cancel_answer"));
  }

  async continue() {
    this._assertStarted();
    const response = await this._request("POST", "/exclude", this._sessionForm({ forward_answer: 1 }));
    if (!response.ok) throw new Error(`Akinator continue returned HTTP ${response.status}`);
    return this._update(this._json(response.text, "/exclude"));
  }

  async submitWin() {
    this._assertStarted();
    if (!this.winResult) throw new Error("There is no Akinator proposition to confirm");
    const response = await this._request("POST", "/choice", {
      sid: this.theme,
      pid: this.winResult.id,
      identifiant: this.identifiant,
      pflag_photo: 0,
      charac_name: this.winResult.name,
      charac_desc: this.winResult.description,
      session: this.session,
      signature: this.signature,
      step: this.step,
    }, { manualRedirect: true });
    if (response.status < 200 || response.status >= 400) {
      throw new Error(`Akinator choice returned HTTP ${response.status}`);
    }
    return true;
  }
}

module.exports = {
  AkinatorClient,
  Languages,
  Themes,
  Answers,
};
