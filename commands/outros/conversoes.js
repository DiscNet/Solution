const ui = require("../../functions/ui");

const dimensions = {
  comprimento: {
    base: "m",
    units: { nm: 1e-9, um: 1e-6, mm: 1e-3, cm: 1e-2, dm: 1e-1, m: 1, dam: 10, hm: 100, km: 1000, in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344, nmi: 1852, au: 149597870700 }
  },
  massa: {
    base: "kg",
    units: { mg: 1e-6, cg: 1e-5, dg: 1e-4, g: 1e-3, dag: 1e-2, hg: 1e-1, kg: 1, t: 1000, oz: 0.028349523125, lb: 0.45359237, st: 6.35029318, gr: 0.00006479891 }
  },
  area: {
    base: "m2",
    units: { mm2: 1e-6, cm2: 1e-4, dm2: 1e-2, m2: 1, dam2: 100, hm2: 10000, km2: 1e6, in2: 0.00064516, ft2: 0.09290304, yd2: 0.83612736, acre: 4046.8564224, ha: 10000 }
  },
  volume: {
    base: "l",
    units: { ml: 0.001, cl: 0.01, dl: 0.1, l: 1, m3: 1000, cm3: 0.001, mm3: 0.000001, tsp: 0.00492892159375, tbsp: 0.01478676478125, floz: 0.0295735295625, cup: 0.2365882365, pt: 0.473176473, qt: 0.946352946, gal: 3.785411784 }
  },
  velocidade: {
    base: "mps",
    units: { mps: 1, kmh: 1 / 3.6, mph: 0.44704, fps: 0.3048, knot: 0.5144444444444445, cms: 0.01, mmin: 1 / 60 }
  },
  tempo: {
    base: "s",
    units: { ms: 0.001, s: 1, min: 60, h: 3600, dia: 86400, semana: 604800, quinzena: 1209600, mes: 2629746, ano: 31556952 }
  },
  dados: {
    base: "byte",
    units: { bit: 0.125, byte: 1, kb: 125, mb: 125000, gb: 125000000, tb: 125000000000, pb: 125000000000000, kib: 1024, mib: 1048576, gib: 1073741824, tib: 1099511627776 }
  },
  energia: {
    base: "j",
    units: { j: 1, kj: 1000, mj: 1000000, wh: 3600, kwh: 3600000, cal: 4.184, kcal: 4184, btu: 1055.05585262, ev: 1.602176634e-19 }
  },
  pressao: {
    base: "pa",
    units: { pa: 1, kpa: 1000, mpa: 1000000, bar: 100000, mbar: 100, atm: 101325, psi: 6894.757293168, torr: 133.32236842105263, mmhg: 133.322387415 }
  },
  angulo: {
    base: "rad",
    units: { deg: Math.PI / 180, rad: 1, grad: Math.PI / 200, turn: Math.PI * 2, arcmin: Math.PI / 10800, arcsec: Math.PI / 648000 }
  }
};

const aliases = {
  metro: "m", metros: "m", kilometro: "km", quilometro: "km", quilometros: "km",
  grama: "g", gramas: "g", quilo: "kg", quilos: "kg", tonelada: "t", toneladas: "t",
  litro: "l", litros: "l", mililitro: "ml", mililitros: "ml",
  segundo: "s", segundos: "s", minuto: "min", minutos: "min", hora: "h", horas: "h",
  bytes: "byte", bits: "bit", graus: "deg", grau: "deg", radianos: "rad", radiano: "rad"
};

function normalizeUnit(value) {
  const key = String(value || "").trim().toLowerCase().replace(/²/g, "2");
  return aliases[key] || key;
}

function parseNumber(value) {
  const raw = String(value ?? "").trim().replace(/,/g, ".");
  if (!/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?$/i.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function findDimension(from, to) {
  return Object.entries(dimensions).find(([, def]) => def.units[from] !== undefined && def.units[to] !== undefined) || null;
}

function convert(value, from, to, dimensionName = null) {
  const source = normalizeUnit(from);
  const target = normalizeUnit(to);
  const entry = dimensionName ? [dimensionName, dimensions[dimensionName]] : findDimension(source, target);
  if (!entry || !entry[1] || entry[1].units[source] === undefined || entry[1].units[target] === undefined) {
    throw new Error("UNIDADES_INCOMPATIVEIS");
  }
  const [, def] = entry;
  return (value * def.units[source]) / def.units[target];
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if ((abs !== 0 && abs < 1e-6) || abs >= 1e12) return value.toExponential(8).replace(/\.0+e/, "e");
  return new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 12 }).format(value);
}

async function reply(conn, msg, from, text) {
  return ui.reply(conn, msg, text, { from });
}

function makeGeneratedCommand(dimension, from, to) {
  return {
    name: `conv-${dimension}-${from}-${to}`,
    aliases: [],
    hidden: true,
    menuCategory: "Utilidades",
    menuSection: "Conversões",
    usage: `conv-${dimension}-${from}-${to} <valor>`,
    description: `Converte ${from} para ${to}`,
    async execute(conn, msg, args, fromJid) {
      const value = parseNumber(args[0]);
      if (value === null) return reply(conn, msg, fromJid, `❌ Uso: .conv-${dimension}-${from}-${to} <valor>`);
      const result = convert(value, from, to, dimension);
      return reply(conn, msg, fromJid, `🔄 ${formatNumber(value)} ${from} = ${formatNumber(result)} ${to}`);
    }
  };
}

const commands = [];
for (const [dimension, def] of Object.entries(dimensions)) {
  const units = Object.keys(def.units);
  for (const from of units) {
    for (const to of units) {
      if (from !== to) commands.push(makeGeneratedCommand(dimension, from, to));
    }
  }
}

commands.unshift({
  name: "conversor",
  aliases: ["converter", "conv"],
  menuCategory: "Utilidades",
  menuSection: "Conversões",
  usage: "conversor <valor> <origem> <destino>",
  description: "Uso: .conversor 10 km m",
  async execute(conn, msg, args, from) {
    const value = parseNumber(args[0]);
    const source = normalizeUnit(args[1]);
    const target = normalizeUnit(args[2]);
    if (value === null || !source || !target) return reply(conn, msg, from, "❌ Uso: .conversor <valor> <origem> <destino>\nEx.: .conversor 10 km m");
    const found = findDimension(source, target);
    if (!found) return reply(conn, msg, from, "❌ Unidades desconhecidas ou incompatíveis. Use .unidades para consultar as opções.");
    const result = convert(value, source, target, found[0]);
    return reply(conn, msg, from, `🔄 ${formatNumber(value)} ${source} = ${formatNumber(result)} ${target}\n📐 Categoria: ${found[0]}`);
  }
});

commands.unshift({
  name: "unidades",
  aliases: ["listaunidades", "conversoes"],
  menuCategory: "Utilidades",
  menuSection: "Conversões",
  usage: "unidades [categoria]",
  description: "Uso: .unidades [categoria]",
  async execute(conn, msg, args, from) {
    const wanted = String(args[0] || "").toLowerCase();
    if (wanted && !dimensions[wanted]) return reply(conn, msg, from, `❌ Categoria inválida. Use: ${Object.keys(dimensions).join(", ")}`);
    const entries = wanted ? [[wanted, dimensions[wanted]]] : Object.entries(dimensions);
    const lines = entries.map(([name, def]) => `• ${name}: ${Object.keys(def.units).join(", ")}`);
    return reply(conn, msg, from, `📐 *UNIDADES DISPONÍVEIS*\n\n${lines.join("\n")}`);
  }
});

commands.unshift({
  name: "totalconversoes",
  aliases: ["contarconversoes"],
  menuCategory: "Utilidades",
  menuSection: "Conversões",
  usage: "totalconversoes",
  description: "Mostra quantas conversões diretas estão disponíveis",
  async execute(conn, msg, args, from) {
    const generated = commands.filter(c => c.hidden).length;
    return reply(conn, msg, from, `🔢 Conversões diretas disponíveis: ${generated}\n📚 Categorias: ${Object.keys(dimensions).length}`);
  }
});

module.exports = { commands, dimensions, convert, normalizeUnit, parseNumber, formatNumber };
