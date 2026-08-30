// functions/patentes.js
const fs = require("fs");
const path = require("path");

const patentesPath = path.join(__dirname, "..", "database", "rpgPatentes.json");

function carregarPatentes() {
  if (!fs.existsSync(patentesPath)) {
    const defaultPatentes = {
      "patentes": {
        "recruta": {
          "level": 1,
          "xpNecessario": 0,
          "emoji": "🪖",
          "descricao": "O início da sua jornada.",
          "bonus": { "vida": 0, "dano": 0, "defesa": 0 }
        },
        "soldado": {
          "level": 5,
          "xpNecessario": 120,
          "emoji": "🎖️",
          "descricao": "Primeiro passo rumo à grandeza.",
          "bonus": { "vida": 10, "dano": 3, "defesa": 2 }
        },
        "guerreiro": {
          "level": 10,
          "xpNecessario": 400,
          "emoji": "⚔️",
          "descricao": "A força de um verdadeiro combatente.",
          "bonus": { "vida": 20, "dano": 6, "defesa": 4 }
        },
        "cavaleiro": {
          "level": 20,
          "xpNecessario": 1000,
          "emoji": "🐴",
          "descricao": "Honra e lealdade acima de tudo.",
          "bonus": { "vida": 35, "dano": 10, "defesa": 8 }
        },
        "capitão": {
          "level": 35,
          "xpNecessario": 2500,
          "emoji": "⭐",
          "descricao": "Liderança e estratégia em batalha.",
          "bonus": { "vida": 50, "dano": 15, "defesa": 12 }
        },
        "comandante": {
          "level": 50,
          "xpNecessario": 5000,
          "emoji": "🌟",
          "descricao": "O comando das tropas está em suas mãos.",
          "bonus": { "vida": 70, "dano": 20, "defesa": 16 }
        },
        "general": {
          "level": 70,
          "xpNecessario": 10000,
          "emoji": "🏅",
          "descricao": "Uma lenda viva nos campos de batalha.",
          "bonus": { "vida": 100, "dano": 28, "defesa": 22 }
        },
        "heroi": {
          "level": 90,
          "xpNecessario": 18000,
          "emoji": "🦸",
          "descricao": "Herói lendário, admirado por todos.",
          "bonus": { "vida": 140, "dano": 38, "defesa": 30 }
        },
        "lenda": {
          "level": 110,
          "xpNecessario": 30000,
          "emoji": "👑",
          "descricao": "Uma lenda que será lembrada para sempre.",
          "bonus": { "vida": 190, "dano": 50, "defesa": 40 }
        },
        "imortal": {
          "level": 150,
          "xpNecessario": 50000,
          "emoji": "♾️",
          "descricao": "Além do limite humano, você é imortal.",
          "bonus": { "vida": 250, "dano": 65, "defesa": 55 }
        }
      }
    };
    const dbDir = path.join(__dirname, "..", "database");
    if (!fs.existsSync(dbDir)) fs.mkdirSync(dbDir, { recursive: true });
    fs.writeFileSync(patentesPath, JSON.stringify(defaultPatentes, null, 2));
    return defaultPatentes;
  }
  const data = fs.readFileSync(patentesPath, "utf8");
  return JSON.parse(data);
}

// Adiciona XP de patente e verifica se subiu de patente
function adicionarXpPatente(ficha, xpGanho) {
  const data = carregarPatentes();
  const patentes = data.patentes;
  
  // Adiciona XP
  ficha.xpPatente += xpGanho;
  
  // Verifica se pode subir de patente
  const keys = Object.keys(patentes);
  let patenteAtual = ficha.patente.toLowerCase();
  let indiceAtual = keys.indexOf(patenteAtual);
  
  // Se a patente atual não for encontrada, começa do início
  if (indiceAtual === -1) {
    indiceAtual = 0;
  }
  
  let promovido = false;
  let novaPatente = ficha.patente;
  
  // Verifica as próximas patentes
  for (let i = indiceAtual + 1; i < keys.length; i++) {
    const key = keys[i];
    const patente = patentes[key];
    
    if (ficha.xpPatente >= patente.xpNecessario && ficha.level >= patente.level) {
      novaPatente = key.charAt(0).toUpperCase() + key.slice(1);
      promovido = true;
      indiceAtual = i;
    } else {
      break;
    }
  }
  
  if (promovido) {
    ficha.patente = novaPatente;
    // Aplica bônus da nova patente
    const patenteData = patentes[keys[indiceAtual]];
    if (patenteData && patenteData.bonus) {
      ficha.vidaMax += patenteData.bonus.vida || 0;
      ficha.dano += patenteData.bonus.dano || 0;
      ficha.defesa += patenteData.bonus.defesa || 0;
      ficha.vida = ficha.vidaMax;
    }
  }
  
  return { ficha, promovido, novaPatente };
}

// Verifica o progresso da patente atual para a próxima
function getProgressoPatente(ficha) {
  const data = carregarPatentes();
  const patentes = data.patentes;
  
  const keys = Object.keys(patentes);
  const patenteAtual = ficha.patente.toLowerCase();
  const indiceAtual = keys.indexOf(patenteAtual);
  
  // Se for a última patente ou não encontrou
  if (indiceAtual === -1 || indiceAtual === keys.length - 1) {
    return {
      atual: patenteAtual,
      proxima: null,
      xpAtual: ficha.xpPatente,
      xpNecessario: null,
      progresso: 100
    };
  }
  
  const proximaKey = keys[indiceAtual + 1];
  const proximaPatente = patentes[proximaKey];
  
  return {
    atual: patenteAtual,
    proxima: proximaKey,
    xpAtual: ficha.xpPatente,
    xpNecessario: proximaPatente.xpNecessario,
    progresso: Math.min((ficha.xpPatente / proximaPatente.xpNecessario) * 100, 100)
  };
}

module.exports = {
  carregarPatentes,
  adicionarXpPatente,
  getProgressoPatente
};