// Menu: Menus - Navegação
const { createMenu } = require("../../functions/menuRenderer");
const { createStatusQuoted } = require("../../functions/statusCard");
const { sendInteractiveMessage } = require("gifted-btns");
const config = require("../../config/config");

const IMAGE_URL = "https://ik.imagekit.io/f6qfdj7c6p/Grimm%20V2%20(1).jpg";
const OFFICIAL_GROUP = "https://chat.whatsapp.com/DgzrFZtkitBHZvNNYbuEKr?s=cl&p=a&ilr=4";

const baseMenu = createMenu("menu", null, []);

function contextInfo() {
  return {
    forwardingScore: 1,
    isForwarded: true,
    forwardedNewsletterMessageInfo: {
      newsletterJid: "120363426698503859@newsletter",
      newsletterName: config.botName || "GrimmJow",
      serverMessageId: 116,
    },
  };
}

function menuHeader(prefix) {
  const owner = config.ownerName || "GrimmJow";
  const bot = config.botName || "GrimmJow";
  return `╭┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╮\n├̬⌑ؔ͟ ⎾🧊⏌͟ˉ̵͟͞𝙱𝚘𝚝: ${bot}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙳𝚎𝚟: ${owner}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙷𝚘𝚛𝚊: ${new Date().toLocaleTimeString("pt-BR")}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙿𝚛𝚎𝚏𝚒𝚡𝚘: ${prefix}\n├̬⌑ؔ͟   ⎾🧊⏌͟ˉ̵͟͞𝙼𝚎𝚗𝚞: Principal\n╰┄─✿─┉ᝳ─̵֟͟͡─᳘֯─҃❀─᳘҃֯͞─̱֟͛─ᝳ͡┉─✿─┄╯`;
}

function row(prefix, id, title, description, header) {
  const item = {
    id: `${prefix}${id}`,
    title,
    description,
  };
  if (header) item.header = header;
  return item;
}

async function sendMainCatalog(conn, msg, from) {
  const prefix = config.prefix || ".";
  const makeRow = (id, title, description, header) =>
    row(prefix, id, title, description, header);

  await sendInteractiveMessage(
    conn,
    from,
    {
      text: `\n${menuHeader(prefix)}\n`,
      footer: `${config.botName || "GrimmJow"} • ᴇsᴄᴏʟʜᴀ ᴜᴍ ᴍᴇɴᴜ`,
      image: { url: IMAGE_URL },
      aimode: true,
      contextInfo: contextInfo(),
      interactiveButtons: [
        {
          name: "single_select",
          buttonParamsJson: JSON.stringify({
            title: "『🧊』𝐂𝐀𝐓𝐀́𝐋𝐎𝐆𝐎『🧊』",
            sections: [
              {
                title: "🔥 DESTAQUES • GRIMMJOW",
                highlight_label: "DESTAQUE",
                rows: [
                  makeRow(
                    "menurpg",
                    "⚔️ 𝗠𝗘𝗡𝗨 𝗥𝗣𝗚",
                    "Personagem, pets, batalhas, itens e progressão",
                    "DESTAQUE",
                  ),
                  makeRow(
                    "menuoutros",
                    "🧰 𝗠𝗘𝗡𝗨 𝗨𝗧𝗜𝗟𝗜𝗗𝗔𝗗𝗘𝗦",
                    "Ferramentas, consultas e produtividade",
                    "ÚTIL",
                  ),
                ],
              },
              {
                title: "🧊 CATÁLOGO PRINCIPAL",
                highlight_label: "GRIMMJOW",
                rows: [
                  makeRow(
                    "menugeral",
                    "🪐 𝗠𝗘𝗡𝗨 𝗚𝗘𝗥𝗔𝗟",
                    "Todos os comandos organizados por seção",
                    "GRIMMJOW",
                  ),
                  makeRow(
                    "menuadm",
                    "🛡️ 𝗠𝗘𝗡𝗨 𝗔𝗗𝗠",
                    "Administração e moderação de grupos",
                    "ADM",
                  ),
                  makeRow(
                    "menudono",
                    "👑 𝗠𝗘𝗡𝗨 𝗗𝗢𝗡𝗢",
                    "Comandos e ferramentas exclusivas do dono",
                    "DONO",
                  ),
                  makeRow(
                    "menusticker",
                    "🎨 𝗠𝗘𝗡𝗨 𝗦𝗧𝗜𝗖𝗞𝗘𝗥",
                    "Figurinhas e ferramentas relacionadas",
                    "STICKER",
                  ),
                  makeRow(
                    "menudws",
                    "🎧 𝗠𝗘𝗡𝗨 𝗗𝗢𝗪𝗡𝗟𝗢𝗔𝗗𝗦",
                    "Músicas, vídeos, mídias e arquivos",
                    "MÍDIA",
                  ),
                  makeRow(
                    "menualterar",
                    "🧪 𝗠𝗘𝗡𝗨 𝗔𝗟𝗧𝗘𝗥𝗔𝗗𝗢𝗥𝗘𝗦",
                    "Conversão e alteração de mídias",
                    "MÍDIA",
                  ),
                  makeRow(
                    "menubn",
                    "🎮 𝗠𝗘𝗡𝗨 𝗕𝗥𝗜𝗡𝗖𝗔𝗗𝗘𝗜𝗥𝗔𝗦",
                    "Jogos, Akinator e comandos de diversão",
                    "JOGOS",
                  ),
                ],
              },
              {
                title: "💎 EXTRAS",
                rows: [
                  makeRow(
                    "ping",
                    "🏓 𝐏𝐈𝐍𝐆",
                    "Desempenho e informações reais do bot",
                    "STATUS",
                  ),
                  makeRow(
                    "info comando",
                    "🔎 𝐀𝐉𝐔𝐃𝐀 𝐃𝐄 𝐂𝐎𝐌𝐀𝐍𝐃𝐎",
                    "Mostra como usar um comando específico",
                    "AJUDA",
                  ),
                  makeRow(
                    "alugarbot",
                    "💎 𝐀𝐋𝐔𝐆𝐀𝐑 𝐁𝐎𝐓",
                    "Informações sobre o aluguel do bot",
                    "EXTRA",
                  ),
                ],
              },
            ],
          }),
        },
        {
          name: "cta_url",
          buttonParamsJson: JSON.stringify({
            display_text: "『〩』𝐆𝐫𝐮𝐩𝐨 𝐎𝐟𝐢𝐜𝐢𝐚𝐥『〩』",
            url: OFFICIAL_GROUP,
            merchant_url: OFFICIAL_GROUP,
          }),
        },
      ],
    },
    { quoted: createStatusQuoted(msg) },
  );

  await conn.sendMessage(from, { react: { text: "🧊", key: msg.key } });
}

module.exports = {
  ...baseMenu,
  async execute(conn, msg, args = [], from) {
    if (args.length) return baseMenu.execute(conn, msg, args, from);
    try {
      return await sendMainCatalog(conn, msg, from);
    } catch (error) {
      console.error("Erro no menu principal:", error);
      return baseMenu.execute(conn, msg, args, from);
    }
  },
};
