const ui = require("../../functions/ui");

const dimensions = {
  comprimento: {
    units: {
      mm: 1e-3, cm: 1e-2, m: 1, km: 1000,
      in: 0.0254, ft: 0.3048, yd: 0.9144, mi: 1609.344
    }
  },
  massa: {
    units: {
      mg: 1e-6, g: 1e-3, kg: 1, t: 1000,
      oz: 0.028349523125, lb: 0.45359237
    }
  },
  volume: {
    units: {
      ml: 0.001, l: 1, m3: 1000,
      tsp: 0.00492892159375, tbsp: 0.01478676478125,
      cup: 0.2365882365, gal: 3.785411784
    }
  },
  velocidade: {
    units: {
      mps: 1, kmh: 1 / 3.6, mph: 0.44704, knot: 0.5144444444444445
    }
  },
  tempo: {
    units: {
      ms: 0.001, s: 1, min: 60, h: 3600, dia: 86400,
      semana: 604800, mes: 2629746, ano: 31556952
    }
  },
  dados: {
    units: {
      byte: 1, kb: 1000, mb: 1e6, gb: 1e9, tb: 1e12,
      kib: 1024, mib: 1048576, gib: 1073741824
    }
  }
};

const aliases = {
  metro: "m", metros: "m",
  quilometro: "km", quilometros: "km", kilometro: "km", kilometros: "km",
  grama: "g", gramas: "g", quilo: "kg", quilos: "kg",
  litro: "l", litros: "l", mililitro: "ml", mililitros: "ml",
  segundo: "s", segundos: "s", minuto: "min", minutos: "min",
  hora: "h", horas: "h", bytes: "byte"
};

const temperatureAliases = {
  c: "c", cel: "c", celsius: "c",
  f: "f", fahr: "f", fahrenheit: "f",
  k: "k", kelvin: "k"
};

function normalizeUnit(value) {
  const key = String(value || "")
    .trim()
    .toLowerCase()
    .replace(/°/g, "")
    .replace(/²/g, "2");
  return aliases[key] || temperatureAliases[key] || key;
}

function parseNumber(value) {
  const raw = String(value ?? "").trim().replace(/,/g, ".");
  if (!/^[-+]?(?:\d+(?:\.\d+)?|\.\d+)(?:e[-+]?\d+)?$/i.test(raw)) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

function findDimension(from, to) {
  return Object.entries(dimensions)
    .find(([, def]) => def.units[from] !== undefined && def.units[to] !== undefined) || null;
}

function convertTemperature(value, from, to) {
  let celsius;
  if (from === "c") celsius = value;
  else if (from === "f") celsius = (value - 32) * (5 / 9);
  else if (from === "k") celsius = value - 273.15;
  else throw new Error("UNIDADE_TEMPERATURA");

  if (to === "c") return celsius;
  if (to === "f") return celsius * (9 / 5) + 32;
  if (to === "k") return celsius + 273.15;
  throw new Error("UNIDADE_TEMPERATURA");
}

function convert(value, from, to, dimensionName = null) {
  const source = normalizeUnit(from);
  const target = normalizeUnit(to);

  if (["c", "f", "k"].includes(source)) {
    if (!["c", "f", "k"].includes(target)) throw new Error("UNIDADES_INCOMPATIVEIS");
    return convertTemperature(value, source, target);
  }

  const entry = dimensionName
    ? [dimensionName, dimensions[dimensionName]]
    : findDimension(source, target);

  if (!entry || !entry[1] ||
      entry[1].units[source] === undefined ||
      entry[1].units[target] === undefined) {
    throw new Error("UNIDADES_INCOMPATIVEIS");
  }

  return (value * entry[1].units[source]) / entry[1].units[target];
}

function formatNumber(value) {
  if (!Number.isFinite(value)) return String(value);
  const abs = Math.abs(value);
  if ((abs !== 0 && abs < 1e-6) || abs >= 1e12) return value.toExponential(8);
  return new Intl.NumberFormat("pt-BR", { maximumSignificantDigits: 12 }).format(value);
}

async function reply(conn, msg, from, text) {
  return ui.reply(conn, msg, text, { from });
}

const commands = [
  {
    name: "conversor",
    aliases: ["converter", "conv"],
    menuCategory: "Utilidades",
    menuSection: "Conversões",
    usage: "conversor <valor> <origem> <destino>",
    description: "Converte medidas comuns com um único comando",
    async execute(conn, msg, args, from) {
      const value = parseNumber(args[0]);
      const source = normalizeUnit(args[1]);
      const target = normalizeUnit(args[2]);

      if (value === null || !source || !target) {
        return reply(
          conn, msg, from,
          "❌ Uso: .conversor <valor> <origem> <destino>\n" +
          "Ex.: .conversor 10 km m\n" +
          "Ex.: .conversor 32 f c"
        );
      }

      try {
        const isTemperature = ["c", "f", "k"].includes(source) && ["c", "f", "k"].includes(target);
        const found = isTemperature ? ["temperatura"] : findDimension(source, target);

        if (!found) {
          return reply(conn, msg, from, "❌ Unidades desconhecidas ou incompatíveis. Use .unidades.");
        }

        const result = isTemperature
          ? convertTemperature(value, source, target)
          : convert(value, source, target, found[0]);

        return reply(
          conn, msg, from,
          `🔄 ${formatNumber(value)} ${source} = ${formatNumber(result)} ${target}\n` +
          `📐 Categoria: ${isTemperature ? "temperatura" : found[0]}`
        );
      } catch {
        return reply(conn, msg, from, "❌ Não consegui converter essas unidades. Use .unidades.");
      }
    }
  },
  {
    name: "unidades",
    aliases: ["listaunidades"],
    menuCategory: "Utilidades",
    menuSection: "Conversões",
    usage: "unidades",
    description: "Mostra as unidades aceitas pelo conversor",
    async execute(conn, msg, args, from) {
      const lines = Object.entries(dimensions)
        .map(([name, def]) => `• ${name}: ${Object.keys(def.units).join(", ")}`);

      lines.push("• temperatura: c, f, k");

      return reply(
        conn, msg, from,
        `📐 *CONVERSOR RÁPIDO*\n\n${lines.join("\n")}\n\n` +
        "Ex.: .conversor 5 km m\n" +
        "Ex.: .conversor 100 f c"
      );
    }
  }
];

module.exports = {
  commands,
  dimensions,
  convert,
  convertTemperature,
  normalizeUnit,
  parseNumber,
  formatNumber
};
