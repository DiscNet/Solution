const config = require("../../../config/config");

const numero = valor => Number(valor || 0);

const dinheiro = valor =>
  numero(valor).toLocaleString("pt-BR") + " N-Coins";

function tempo(segundos) {
  const total = Math.max(
    0,
    Math.ceil(Number(segundos || 0))
  );

  const horas = Math.floor(total / 3600);
  const minutos = Math.floor((total % 3600) / 60);
  const resto = total % 60;

  return [
    horas ? horas + "h" : "",
    minutos ? minutos + "m" : "",
    resto || (!horas && !minutos) ? resto + "s" : "",
  ]
    .filter(Boolean)
    .join(" ");
}

function botName() {
  return (
    String(config.botName || "Bot")
      .replace(/[\x00-\x1F\x7F]/g, "")
      .trim() || "Bot"
  );
}

function compacto(
  _ctx,
  emoji = "🧊",
  titulo = "RPG",
  linhas = []
) {
  const conteudo = (
    Array.isArray(linhas) ? linhas : []
  )
    .filter(Boolean)
    .map(item => {
      if (typeof item === "string") {
        return "> *『 • 』— " + item + "*";
      }

      const icone = item?.emoji || "•";
      const texto = String(item?.texto || "").trim();

      return texto
        ? "> *『 " + icone + " 』— " + texto + "*"
        : "";
    })
    .filter(Boolean)
    .join("\n");

  return (
    "- " +
    emoji +
    " `" +
    String(titulo || "RPG").toUpperCase() +
    "`" +
    (conteudo ? "\n\n" + conteudo : "") +
    "\n\n> " +
    botName()
  );
}

async function enviarComImagem(
  ctx,
  imagem,
  legenda,
  mencoes = []
) {
  const url = String(imagem || "").trim();

  if (!url) {
    return ctx.reply(legenda, mencoes);
  }

  try {
    return await ctx.tokito.sendMessage(
      ctx.from,
      {
        image: { url },
        caption: legenda,
        mentions: mencoes,
        contextInfo: ctx.canalInfo(mencoes),
      },
      { quoted: ctx.selo }
    );
  } catch {
    return ctx.reply(legenda, mencoes);
  }
}

module.exports = {
  compacto,
  dinheiro,
  tempo,
  enviarComImagem,
};
