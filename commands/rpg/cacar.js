// commands/rpg/cacar.js
const config = require("../../config/config");
const fs = require("fs");
const path = require("path");
const rpgSystem = require("../../functions/rpgSystem");

const dbPath = path.join(__dirname, "..", "..", "database", "rpg.json");
const itemsPath = path.join(__dirname, "..", "..", "database", "rpgItems.json");

// Carrega o banco de dados
function carregarDb() {
  if (!fs.existsSync(dbPath)) {
    return { usuarios: {} };
  }
  const data = fs.readFileSync(dbPath, "utf8");
  return JSON.parse(data);
}

// Carrega os itens
function carregarItems() {
  if (!fs.existsSync(itemsPath)) {
    return { animais: {}, monstros: {}, itens: {} };
  }
  const data = fs.readFileSync(itemsPath, "utf8");
  return JSON.parse(data);
}

// Salva o banco de dados
function salvarDb(data) {
  const dbDir = path.join(__dirname, "..", "..", "database");
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true });
  }
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));
}

// Função para sortear um item aleatório de um array
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

module.exports = {
  permissions: { group: true },
  name: "caçar",
  aliases: ["cacar", "hunt", "caça"],
  description: "ᴄᴀᴄ̧ᴀ ᴀɴɪᴍᴀɪs ᴇ ᴍᴏɴsᴛʀᴏs ᴘᴀʀᴀ ɢᴀɴʜᴀʀ ʀᴇᴄᴏᴍᴘᴇɴsᴀs",
  async execute(conn, msg, args, from) {
    try {
      const bot = config.botName || "ʟᴜᴋᴀᴍᴏᴅᴢᴢ";
      const prefix = config.prefix || ".";

      let pushName = "Usuário";
      try { pushName = msg.pushName || "LukaModzz"; } catch (e) { pushName = "LukaModzz"; }

      // 🔥 VERIFICA SE O RPG ESTÁ ATIVO NO GRUPO
      if (from.endsWith("@g.us") && !rpgSystem.isRpgAtivo(from)) {
        return await conn.sendMessage(from, {
          text: `❌ *sɪsᴛᴇᴍᴀ ʀᴘɢ ᴅᴇsᴀᴛɪᴠᴀᴅᴏ!*\n\n⚔️ ᴘᴇᴄᴀ ᴀ ᴜᴍ ᴀᴅᴍɪɴɪsᴛʀᴀᴅᴏʀ ᴘᴀʀᴀ ᴀᴛɪᴠᴀʀ ᴏ sɪsᴛᴇᴍᴀ ᴄᴏᴍ:\n${prefix}rpgsystem on`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      // Pega o LID do usuário
      let lid = msg.key.participant || msg.key.remoteJid || from;

      if (from.endsWith("@g.us") && msg.key.participant) {
        lid = msg.key.participant;
      }

      // Carrega os dados
      const db = carregarDb();
      const itemsData = carregarItems();

      // Verifica se está registrado
      if (!db.usuarios[lid]) {
        return await conn.sendMessage(from, {
          text: `❌ ᴠᴏᴄᴇ ᴀɪɴᴅᴀ ɴᴀᴏ ᴇsᴛᴀ́ ʀᴇɢɪsᴛʀᴀᴅᴏ!\n\n📌 ᴜsᴇ ${prefix}registro para criar seu personagem.`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      const ficha = db.usuarios[lid];

      // 🔥 VERIFICA COOLDOWN (10 MINUTOS)
      const agora = Date.now();
      const cooldown = 10 * 60 * 1000; // 10 minutos

      if (ficha.ultimaCaca && (agora - ficha.ultimaCaca) < cooldown) {
        const tempoRestante = Math.ceil((cooldown - (agora - ficha.ultimaCaca)) / 1000);
        const minutos = Math.floor(tempoRestante / 60);
        const segundos = tempoRestante % 60;

        return await conn.sendMessage(from, {
          text: `🏹 *ᴀɢᴜᴀʀᴅᴇ!*\n\nᴠᴏᴄᴇ ᴊᴀ́ ᴄᴀᴄ̧ᴏᴜ ʀᴇᴄᴇɴᴛᴇᴍᴇɴᴛᴇ.\n\n⏳ ᴛᴇᴍᴘᴏ ʀᴇsᴛᴀɴᴛᴇ: ${minutos}ᴍ ${segundos}s`,
          contextInfo: {
            forwardingScore: 1,
            isForwarded: true,
            forwardedNewsletterMessageInfo: {
              newsletterJid: "120363426698503859@newsletter",
              newsletterName: `${bot}`,
              serverMessageId: 116
            }
          }
        }, { quoted: msg });
      }

      // 🔥 PREPARA A CAÇA
      const todosAlvos = { ...itemsData.animais, ...itemsData.monstros };
      const alvosNomes = Object.keys(todosAlvos);
      const alvoNome = randomItem(alvosNomes);
      const alvo = todosAlvos[alvoNome];

      // Verifica se o alvo é monstro ou animal
      const ehMonstro = itemsData.monstros[alvoNome] !== undefined;

      // 🔥 50% DE CHANCE DE SUCESSO
      const sucesso = Math.random() < 0.5;
      let mensagem = "";
      let levelUp = false;
      let xpGanho = 0;
      let goldGanho = 0;
      let vidaPerdida = 0;
      let drops = [];
      let podeTentarNovamente = false;

      if (sucesso) {
        // 🔥 SUCESSO: MATOU O ALVO
        const qtd = Math.random() < 0.08 ? 2 : 1; // 8% de chance de matar 2

        // XP: 3 a 32
        xpGanho = Math.floor(Math.random() * 30) + 3;

        // Gold: baseado no alvo
        goldGanho = alvo.gold * qtd;

        // Drops: orelha de goblin (se for goblin)
        if (alvo.drop && alvo.drop === "orelha de goblin") {
          const qtdOrelhas = Math.random() < 0.5 ? 1 : 2; // 50% chance de 1 ou 2
          for (let i = 0; i < qtdOrelhas; i++) {
            drops.push("orelha de goblin");
          }
        }

        // Perde um pouco de vida (5-15% da vida máxima)
        vidaPerdida = Math.floor(ficha.vidaMax * (Math.random() * 0.10 + 0.05));
        if (vidaPerdida > ficha.vida) vidaPerdida = ficha.vida;
        ficha.vida -= vidaPerdida;

        // Adiciona XP
        ficha.xp += xpGanho;

        // Adiciona Gold
        ficha.gold += goldGanho;

        // Adiciona drops ao inventário
        for (const drop of drops) {
          ficha.itens.push(drop);
        }

        // Verifica level up
        const xpNecessario = ficha.level * 100;
        while (ficha.xp >= xpNecessario) {
          ficha.xp -= xpNecessario;
          ficha.level += 1;
          ficha.vidaMax += 20;
          ficha.vida = ficha.vidaMax;
          ficha.manaMax += 10;
          ficha.mana = ficha.manaMax;
          ficha.dano += 5;
          ficha.defesa += 2;
          ficha.agilidade += 2;
          ficha.critico += 1;
          levelUp = true;
        }

        // 🔥 MONTA MENSAGEM DE SUCESSO
        mensagem = `🏹 *ᴄᴀᴄ̧ᴀ ʀᴇᴀʟɪᴢᴀᴅᴀ ᴄᴏᴍ sᴜᴄᴇssᴏ!*

━━━━━━━━━━━━━━━━━━━━
🎯 *ᴀʟᴠᴏ:* ${alvoNome} ${ehMonstro ? "👹" : "🐾"}
🗡️ *ǫᴛᴅ ᴀʙᴀᴛɪᴅᴏ:* ${qtd}
📈 *xᴘ ɢᴀɴʜᴏ:* +${xpGanho}
💰 *ɢᴏʟᴅ ɢᴀɴʜᴏ:* +${goldGanho}`;

        if (drops.length > 0) {
          mensagem += `\n📦 *ᴅʀᴏᴘs:* ${drops.join(", ")}`;
        }

        mensagem += `\n\n━━━━━━━━━━━━━━━━━━━━
❤️ *ᴠɪᴅᴀ ᴘᴇʀᴅɪᴅᴀ:* -${vidaPerdida}
💚 *ᴠɪᴅᴀ ᴀᴛᴜᴀʟ:* ${ficha.vida}/${ficha.vidaMax}`;

        if (levelUp) {
          mensagem += `\n\n🎉 *ᴘᴀʀᴀʙᴇ́ɴs! ᴠᴏᴄᴇ sᴜʙɪᴜ ᴘᴀʀᴀ ᴏ ʟᴇᴠᴇʟ ${ficha.level}!*`;
        }

      } else {
        // 🔥 FALHA: NÃO MATOU
        // Perde um pouco de vida (8-20% da vida máxima)
        vidaPerdida = Math.floor(ficha.vidaMax * (Math.random() * 0.12 + 0.08));
        if (vidaPerdida > ficha.vida) vidaPerdida = ficha.vida;
        ficha.vida -= vidaPerdida;

        // 3% de chance de poder tentar novamente
        podeTentarNovamente = Math.random() < 0.03;

        // 🔥 MONTA MENSAGEM DE FALHA
        mensagem = `❌ *ᴀ ᴄᴀᴄ̧ᴀ ғᴏɪ ᴜᴍ ғʀᴀᴄᴀssᴏ!*

━━━━━━━━━━━━━━━━━━━━
🎯 *ᴀʟᴠᴏ:* ${alvoNome}
💨 ᴏ ᴀʟᴠᴏ ᴇsᴄᴀᴘᴏᴜ ᴏᴜ ᴠᴏᴄᴇ ᴇʀʀᴏᴜ ᴏ ɢᴏʟᴘᴇ!

❤️ *ᴠɪᴅᴀ ᴘᴇʀᴅɪᴅᴀ:* -${vidaPerdida}
💚 *ᴠɪᴅᴀ ᴀᴛᴜᴀʟ:* ${ficha.vida}/${ficha.vidaMax}`;

        if (podeTentarNovamente) {
          mensagem += `\n\n🔄 *ᴠᴏᴄᴇ ᴘᴏᴅᴇ ᴛᴇɴᴛᴀʀ ᴄᴀᴄ̧ᴀʀ ɴᴏᴠᴀᴍᴇɴᴛᴇ ᴀɢᴏʀᴀ!*`;
        }
      }

      // Registra a última caça
      ficha.ultimaCaca = agora;

      // Se pode tentar novamente, reseta o cooldown
      if (podeTentarNovamente) {
        ficha.ultimaCaca = null;
      }

      // Salva no banco de dados
      salvarDb(db);

      mensagem += `\n\n⏳ ᴘʀᴏ́xɪᴍᴀ ᴄᴀᴄ̧ᴀ ᴇᴍ 10 ᴍɪɴᴜᴛᴏs.`;

      await conn.sendMessage(from, {
        text: mensagem,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: `${bot}`,
            serverMessageId: 116
          }
        }
      }, { quoted: msg });

    } catch (error) {
      console.error("❌ Erro caçar:", error);
      await conn.sendMessage(from, {
        text: `❌ *ᴇʀʀᴏ ᴀᴏ ᴄᴀᴄ̧ᴀʀ!*\n\n📌 ${error.message}`,
        contextInfo: {
          forwardingScore: 1,
          isForwarded: true,
          forwardedNewsletterMessageInfo: {
            newsletterJid: "120363426698503859@newsletter",
            newsletterName: `${bot}`,
            serverMessageId: 116
          }
        }
      }, { quoted: msg });
    }
  }
};