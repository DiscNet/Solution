// functions/rpgxp.js
const fs = require("fs");
const path = require("path");

const DB_PATH = path.join(__dirname, "..", "database", "rpg.json");
const XP_COOLDOWN_PATH = path.join(__dirname, "..", "database", "rpg_cooldown.json");

function getDB() {
  try {
    if (fs.existsSync(DB_PATH)) return JSON.parse(fs.readFileSync(DB_PATH, "utf8"));
  } catch (e) {}
  return {};
}

function saveDB(db) {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2));
}

function getCooldowns() {
  try {
    if (fs.existsSync(XP_COOLDOWN_PATH)) return JSON.parse(fs.readFileSync(XP_COOLDOWN_PATH, "utf8"));
  } catch (e) {}
  return {};
}

function saveCooldowns(cd) {
  const dir = path.dirname(XP_COOLDOWN_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(XP_COOLDOWN_PATH, JSON.stringify(cd, null, 2));
}

function getPlayer(jid) {
  const db = getDB();
  if (!db[jid]) {
    db[jid] = {
      nome: jid.split("@")[0],
      level: 1,
      xp: 0,
      hp: 110,
      maxHp: 110,
      mp: 55,
      maxMp: 55,
      atk: 7,
      def: 4,
      gold: 0, // 🔥 Começa com 0 gold
      bank: 0,
      classe: "Aventureiro",
      kills: 0,
      deaths: 0,
      inventory: [],
      equipped: { weapon: null, armor: null },
      daily: null
    };
    saveDB(db);
  }
  return db[jid];
}

function levelUp(player) {
  let leveled = false;
  while (player.xp >= player.level * 100) {
    player.xp -= player.level * 100;
    player.level++;
    player.maxHp = 100 + (player.level * 10);
    player.hp = player.maxHp;
    player.maxMp = 50 + (player.level * 5);
    player.mp = player.maxMp;
    player.atk = 5 + (player.level * 2);
    player.def = 3 + (player.level * 1);
    leveled = true;
  }
  return leveled;
}

async function rpgXpHandler(conn, msg) {
  try {
    const from = msg.key.remoteJid;
    const sender = msg.key.participant || from;
    
    if (msg.key.fromMe) return;
    
    const text = msg.message?.conversation || 
                 msg.message?.extendedTextMessage?.text || 
                 msg.message?.imageMessage?.caption || 
                 msg.message?.videoMessage?.caption || "";
    
    if (text.startsWith(".") || text.startsWith("/") || text.startsWith("!")) return;

    const cooldowns = getCooldowns();
    const player = getPlayer(sender);
    const db = getDB();

    const today = new Date().toDateString();
    const key = `${sender}_${from}`;
    
    if (cooldowns[key] === today) return;

    // 🔥 PRIMEIRA MENSAGEM DO DIA: +50 XP + 25 GOLD
    player.xp += 50;
    player.gold += 25;
    cooldowns[key] = today;
    
    const leveled = levelUp(player);
    const xpNeeded = player.level * 100;

    db[sender] = player;
    saveDB(db);
    saveCooldowns(cooldowns);

    // Sempre envia notificação
    let mensagem = "";
    
    if (leveled) {
      mensagem = `🎮 *RPG - LEVEL UP!* 🎉\n\n👤 @${sender.split("@")[0]}\n📊 *+50 XP | +25 Gold 🪙*\n⭐ *Novo Level:* ${player.level}\n❤️ *HP:* ${player.maxHp}\n💙 *MP:* ${player.maxMp}\n⚔️ *ATK:* ${player.atk}\n🛡️ *DEF:* ${player.def}`;
    } else {
      mensagem = `🎮 *RPG - +50 XP | +25 Gold 🪙*\n\n👤 @${sender.split("@")[0]}\n⭐ *Level:* ${player.level}\n📈 *XP:* ${player.xp}/${xpNeeded}\n💰 *Gold:* ${player.gold}`;
    }

    await conn.sendMessage(from, {
      text: mensagem,
      mentions: [sender]
    });

  } catch (e) {
    // Silencia
  }
}

module.exports = { rpgXpHandler };