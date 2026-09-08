// Menu: Utilidades - Internet/Consultas
const dns = require("dns").promises;
const net = require("net");
const { performance } = require("perf_hooks");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");

function weatherLabel(code) {
  if (code === 0) return "céu limpo";
  if ([1, 2, 3].includes(code)) return "parcialmente nublado";
  if ([45, 48].includes(code)) return "neblina";
  if ([51, 53, 55, 56, 57].includes(code)) return "garoa";
  if ([61, 63, 65, 66, 67].includes(code)) return "chuva";
  if ([71, 73, 75, 77].includes(code)) return "neve";
  if ([80, 81, 82].includes(code)) return "pancadas de chuva";
  if ([85, 86].includes(code)) return "pancadas de neve";
  if ([95, 96, 99].includes(code)) return "trovoadas";
  return "condição variável";
}

async function geocode(http, city) {
  const { data } = await http.get("https://geocoding-api.open-meteo.com/v1/search", {
    params: { name: city, count: 1, language: "pt", format: "json" }, timeout: 12000,
  });
  const place = data?.results?.[0];
  if (!place) throw kit.userError("Cidade não encontrada.");
  return place;
}

async function followHead(http, input, max = 5) {
  let current = await kit.assertPublicUrl(input);
  let status = 0;
  for (let i = 0; i <= max; i++) {
    const response = await http.request({ method: "HEAD", url: current.toString(), maxRedirects: 0, validateStatus: () => true, timeout: 10000 });
    status = response.status;
    const location = response.headers?.location;
    if (status >= 300 && status < 400 && location) {
      current = await kit.assertPublicUrl(new URL(location, current).toString());
      continue;
    }
    return { url: current, status, headers: response.headers || {} };
  }
  throw kit.userError("O link possui redirecionamentos demais.");
}

const commands = [
  kit.makeCommand({
    name: "moeda", section: "Consultas", usage: "moeda [valor] [de] [para]",
    async execute(conn, msg, args, from, http) {
      try {
        const amount = Number(String(args[0] || "").replace(",", "."));
        const base = String(args[1] || "BRL").toUpperCase();
        const target = String(args[2] || "USD").toUpperCase();
        if (!Number.isFinite(amount) || amount <= 0) throw kit.userError("Ex.: .moeda 100 BRL USD");
        if (!/^[A-Z]{3}$/.test(base) || !/^[A-Z]{3}$/.test(target)) throw kit.userError("Use códigos de moeda como BRL, USD ou EUR.");
        const { data } = await http.get("https://api.frankfurter.app/latest", { params: { amount, from: base, to: target }, timeout: 12000 });
        const value = data?.rates?.[target];
        if (!Number.isFinite(value)) throw kit.userError("Essa conversão de moeda não está disponível.");
        await kit.reply(conn, msg, from, `💱 *Conversão*\n\n${amount} ${base} = ${value} ${target}\n📅 Referência: ${data.date || "atual"}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível consultar a cotação."); }
    },
  }),

  kit.makeCommand({
    name: "clima", section: "Consultas", usage: "clima [cidade]",
    async execute(conn, msg, args, from, http) {
      try {
        const city = args.join(" ").trim();
        if (!city) throw kit.userError("Ex.: .clima São Paulo");
        const place = await geocode(http, city);
        const { data } = await http.get("https://api.open-meteo.com/v1/forecast", {
          params: { latitude: place.latitude, longitude: place.longitude, current: "temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m", timezone: "auto" }, timeout: 12000,
        });
        const c = data?.current;
        if (!c) throw new Error("clima vazio");
        const where = [place.name, place.admin1, place.country].filter(Boolean).join(", ");
        await kit.reply(conn, msg, from, `🌤️ *Clima — ${where}*\n\n🌡️ ${c.temperature_2m}°C\n🤔 Sensação: ${c.apparent_temperature}°C\n💧 Umidade: ${c.relative_humidity_2m}%\n💨 Vento: ${c.wind_speed_10m} km/h\n☁️ ${weatherLabel(c.weather_code)}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível consultar o clima."); }
    },
  }),

  kit.makeCommand({
    name: "encurtar", section: "Internet", usage: "encurtar [url]",
    async execute(conn, msg, args, from, http) {
      try {
        const raw = args[0] || kit.inputText(msg, []);
        if (!raw) throw kit.userError("Informe o link que deseja encurtar.");
        const url = await kit.assertPublicUrl(raw);
        const { data } = await http.get("https://is.gd/create.php", { params: { format: "simple", url: url.toString() }, timeout: 12000 });
        const short = String(data || "").trim();
        if (!/^https?:\/\//i.test(short)) throw new Error("encurtador indisponível");
        await kit.reply(conn, msg, from, `🔗 *Link encurtado*\n\n${short}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível encurtar o link."); }
    },
  }),

  kit.makeCommand({
    name: "expandirurl", section: "Internet", usage: "expandirurl [url]",
    async execute(conn, msg, args, from, http) {
      try {
        const raw = args[0] || kit.inputText(msg, []);
        if (!raw) throw kit.userError("Informe um link encurtado.");
        const result = await followHead(http, raw);
        await kit.reply(conn, msg, from, `🔎 *Destino do link*\n\n${result.url.toString()}\nHTTP ${result.status}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível expandir esse link."); }
    },
  }),

  kit.makeCommand({
    name: "printsite", section: "Internet", usage: "printsite [url]",
    async execute(conn, msg, args, from, http) {
      try {
        const raw = args[0] || kit.inputText(msg, []);
        if (!raw) throw kit.userError("Informe um site, por exemplo: .printsite example.com");
        const url = await kit.assertPublicUrl(raw);
        const capture = `https://image.thum.io/get/width/1200/noanimate/${url.toString()}`;
        const { data } = await http.get(capture, { responseType: "arraybuffer", timeout: 35000, maxContentLength: 12 * 1024 * 1024 });
        const buffer = Buffer.from(data);
        if (!buffer.length) throw new Error("imagem vazia");
        await conn.sendMessage(from, { image: buffer, caption: `🖥️ ${url.hostname}` }, { quoted: createStatusQuoted(msg) });
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível capturar esse site."); }
    },
  }),

  kit.makeCommand({
    name: "statussite", section: "Internet", usage: "statussite [url]",
    async execute(conn, msg, args, from, http) {
      try {
        const raw = args[0] || kit.inputText(msg, []);
        if (!raw) throw kit.userError("Informe um site para verificar.");
        const start = performance.now();
        const result = await followHead(http, raw);
        const ms = Math.round(performance.now() - start);
        const ok = result.status >= 200 && result.status < 400;
        await kit.reply(conn, msg, from, `${ok ? "✅" : "⚠️"} *Status do site*\n\n🌐 ${result.url.toString()}\n📡 HTTP ${result.status}\n⏱️ ${ms} ms`);
      } catch (e) { await kit.fail(conn, msg, from, e, "O site não respondeu ou não pôde ser verificado."); }
    },
  }),

  kit.makeCommand({
    name: "dns", section: "Internet", usage: "dns [domínio]",
    async execute(conn, msg, args, from) {
      try {
        const domain = kit.validDomain(args[0]);
        const results = await Promise.allSettled([dns.resolve4(domain), dns.resolve6(domain), dns.resolveMx(domain), dns.resolveTxt(domain), dns.resolveNs(domain)]);
        const get = (i) => results[i].status === "fulfilled" ? results[i].value : [];
        const a = get(0), aaaa = get(1), mx = get(2), txt = get(3), ns = get(4);
        const lines = [
          `🌐 *DNS — ${domain}*`,
          `\nA: ${a.length ? a.join(", ") : "—"}`,
          `AAAA: ${aaaa.length ? aaaa.slice(0, 4).join(", ") : "—"}`,
          `MX: ${mx.length ? mx.map((x) => `${x.priority}:${x.exchange}`).join(", ") : "—"}`,
          `NS: ${ns.length ? ns.join(", ") : "—"}`,
          `TXT: ${txt.length ? txt.slice(0, 3).map((x) => x.join("")).join(" | ") : "—"}`,
        ];
        await kit.reply(conn, msg, from, lines.join("\n").slice(0, 10000));
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível consultar o DNS."); }
    },
  }),

  kit.makeCommand({
    name: "whois", section: "Internet", usage: "whois [domínio]",
    async execute(conn, msg, args, from, http) {
      try {
        const domain = kit.validDomain(args[0]);
        const { data } = await http.get(`https://rdap.org/domain/${encodeURIComponent(domain)}`, { timeout: 15000 });
        const events = Object.fromEntries((data?.events || []).map((e) => [e.eventAction, e.eventDate]));
        const ns = (data?.nameservers || []).map((n) => n.ldhName).filter(Boolean).slice(0, 6);
        await kit.reply(conn, msg, from, `🌍 *Domínio — ${domain}*\n\n🆔 ${data?.handle || "—"}\n📌 Status: ${(data?.status || []).join(", ") || "—"}\n📅 Registro: ${events.registration || "—"}\n⌛ Expira: ${events.expiration || "—"}\n🧭 NS: ${ns.join(", ") || "—"}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível consultar esse domínio."); }
    },
  }),

  kit.makeCommand({
    name: "ip", section: "Internet", usage: "ip [endereço]",
    async execute(conn, msg, args, from, http) {
      try {
        const ip = String(args[0] || "").trim();
        if (!net.isIP(ip)) throw kit.userError("Informe um IPv4 ou IPv6 válido.");
        if (kit.isPrivateIp(ip)) throw kit.userError("Consultas de IP privado/local não são permitidas.");
        const { data } = await http.get(`https://ipwho.is/${encodeURIComponent(ip)}`, { timeout: 12000 });
        if (data?.success === false) throw kit.userError("Não encontrei informações para esse IP.");
        await kit.reply(conn, msg, from, `📡 *IP ${ip}*\n\n🌎 ${[data.city, data.region, data.country].filter(Boolean).join(", ") || "—"}\n🏢 ISP: ${data.connection?.isp || "—"}\n🧭 ASN: ${data.connection?.asn || "—"}\n🕒 Fuso: ${data.timezone?.id || "—"}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível consultar o IP."); }
    },
  }),

  kit.makeCommand({
    name: "horario", section: "Consultas", usage: "horario [cidade]",
    async execute(conn, msg, args, from, http) {
      try {
        const city = args.join(" ").trim();
        if (!city) throw kit.userError("Ex.: .horario Tóquio");
        const place = await geocode(http, city);
        const timeZone = place.timezone;
        if (!timeZone) throw new Error("fuso ausente");
        const formatted = new Intl.DateTimeFormat("pt-BR", { timeZone, dateStyle: "full", timeStyle: "long" }).format(new Date());
        await kit.reply(conn, msg, from, `🕒 *${place.name}, ${place.country || ""}*\n\n${formatted}\nFuso: ${timeZone}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível consultar o horário."); }
    },
  }),

  kit.makeCommand({
    name: "feriado", section: "Consultas", usage: "feriado [país] [ano]",
    async execute(conn, msg, args, from, http) {
      try {
        const country = String(args[0] || "BR").toUpperCase();
        const year = Number(args[1] || new Date().getFullYear());
        if (!/^[A-Z]{2}$/.test(country) || !Number.isInteger(year) || year < 2000 || year > 2100) throw kit.userError("Ex.: .feriado BR 2026");
        const { data } = await http.get(`https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`, { timeout: 12000 });
        if (!Array.isArray(data)) throw new Error("lista inválida");
        const today = new Date(); today.setHours(0, 0, 0, 0);
        let list = data.filter((h) => new Date(`${h.date}T00:00:00`) >= today);
        if (!list.length) list = data;
        list = list.slice(0, 12);
        const lines = list.map((h) => `• ${h.date.split("-").reverse().join("/")} — ${h.localName || h.name}`);
        await kit.reply(conn, msg, from, `📅 *Feriados ${country}/${year}*\n\n${lines.join("\n") || "Nenhum feriado encontrado."}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível consultar os feriados."); }
    },
  }),
];

module.exports = commands;
