// commands/addmanutencao.js
const config = require("../../config/config");
const fs = require('fs');
const path = require('path');

// Caminho do arquivo de configuração de manutenção
const MANUTENCAO_PATH = path.join(__dirname, '..', 'config', 'manutencao.json');

// Função para carregar a lista de comandos em manutenção
function carregarManutencao() {
  try {
    if (fs.existsSync(MANUTENCAO_PATH)) {
      const data = JSON.parse(fs.readFileSync(MANUTENCAO_PATH, 'utf8'));
      return data.comandos || [];
    }
  } catch (e) {
    console.error("Erro ao carregar manutencao:", e);
  }
  return [];
}

// Função para salvar a lista de comandos em manutenção
function salvarManutencao(comandos) {
  try {
    const dir = path.dirname(MANUTENCAO_PATH);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(MANUTENCAO_PATH, JSON.stringify({ comandos }, null, 2));
    return true;
  } catch (e) {
    console.error("Erro ao salvar manutencao:", e);
    return false;
  }
}

// Função para verificar se é dono
function isUserDono(senderJid) {
  const DONO_LID = config.ownerLid || null;
  const DONO_NUMERO = config.ownerNumber || (DONO_LID ? DONO_LID.split('@')[0] : "556384673123");
  
  const senderNumber = senderJid.split('@')[0];
  
  // Verificar por LID
  if (DONO_LID && senderJid === DONO_LID) {
    return true;
  }
  
  // Verificar por número
  if (senderNumber === DONO_NUMERO) {
    return true;
  }
  
  return false;
}

module.exports = {
  name: "addmanutencao",
  description: "𝑨𝒅𝒊𝒄𝒊𝒐𝒏𝒂 𝒐𝒖 𝒓𝒆𝒎𝒐𝒗𝒆 𝒄𝒐𝒎𝒂𝒏𝒅𝒐𝒔 𝒅𝒂 𝒎𝒂𝒏𝒖𝒕𝒆𝒏𝒄̧𝒂̃𝒐 (𝑫𝒐𝒏𝒐)",
  async execute(conn, msg, args, from, axiosInstance) {
    try {
      const prefix = config.prefix || ".";
      const senderJid = msg.key.participant || msg.key.remoteJid;
      
      // Verificar se é o dono
      if (!isUserDono(senderJid)) {
        await conn.sendMessage(from, { 
          text: "❌ *Apenas o dono pode usar este comando!*" 
        }, { quoted: msg });
        return;
      }
      
      // Se não tiver argumentos, mostra ajuda
      if (!args[0]) {
        const comandosAtuais = carregarManutencao();
        const listaAtual = comandosAtuais.length > 0 
          ? comandosAtuais.map(cmd => `🔧 ${prefix}${cmd}`).join('\n')
          : "📭 Nenhum comando em manutenção";
        
        await conn.sendMessage(from, { 
          text: `╭══════════════════════════════╮
     🔧 *𝑮𝑬𝑹𝑬𝑵𝑪𝑰𝑨𝑹 𝑴𝑨𝑵𝑼𝑻𝑬𝑵𝑪̧𝑨̃𝑶* 🔧
╰══════════════════════════════╯
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 *Comandos em manutenção:*
${listaAtual}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📌 *Como usar:*

${prefix}addmanutencao add alugar-bot
${prefix}addmanutencao remove alugar-bot
${prefix}addmanutencao list
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━` 
        }, { quoted: msg });
        return;
      }
      
      const acao = args[0].toLowerCase();
      const comando = args[1];
      
      // Carregar comandos atuais
      let comandos = carregarManutencao();
      
      // ADICIONAR COMANDO
      if (acao === 'add' && comando) {
        const comandoLimpo = comando.toLowerCase().replace(/^\./, '');
        
        if (!comandos.includes(comandoLimpo)) {
          comandos.push(comandoLimpo);
          if (salvarManutencao(comandos)) {
            await conn.sendMessage(from, { 
              text: `✅ *Comando "${comandoLimpo}" adicionado à manutenção!*\n\n🔧 Agora usuários comuns não poderão usar este comando.` 
            }, { quoted: msg });
          } else {
            await conn.sendMessage(from, { 
              text: `❌ *Erro ao salvar!* Tente novamente.` 
            }, { quoted: msg });
          }
        } else {
          await conn.sendMessage(from, { 
            text: `⚠️ *Comando "${comandoLimpo}" já está em manutenção!*` 
          }, { quoted: msg });
        }
      } 
      // REMOVER COMANDO
      else if (acao === 'remove' && comando) {
        const comandoLimpo = comando.toLowerCase().replace(/^\./, '');
        const index = comandos.indexOf(comandoLimpo);
        
        if (index !== -1) {
          comandos.splice(index, 1);
          if (salvarManutencao(comandos)) {
            await conn.sendMessage(from, { 
              text: `✅ *Comando "${comandoLimpo}" removido da manutenção!*\n\n🔧 Agora todos podem usar este comando normalmente.` 
            }, { quoted: msg });
          } else {
            await conn.sendMessage(from, { 
              text: `❌ *Erro ao salvar!* Tente novamente.` 
            }, { quoted: msg });
          }
        } else {
          await conn.sendMessage(from, { 
            text: `⚠️ *Comando "${comandoLimpo}" não está em manutenção!*` 
          }, { quoted: msg });
        }
      }
      // LISTAR COMANDOS
      else if (acao === 'list') {
        const lista = comandos.length > 0 
          ? comandos.map(cmd => `🔧 ${prefix}${cmd}`).join('\n')
          : "📭 Nenhum comando em manutenção";
        
        await conn.sendMessage(from, { 
          text: `📋 *Comandos em manutenção:*\n━━━━━━━━━━━━━━━━━━━━━━\n${lista}\n━━━━━━━━━━━━━━━━━━━━━━\n📌 Total: ${comandos.length} comandos` 
        }, { quoted: msg });
      }
      else {
        await conn.sendMessage(from, { 
          text: `❌ *Ação inválida!*\n\n📌 Ações disponíveis: add, remove, list` 
        }, { quoted: msg });
      }
      
      await conn.sendMessage(from, { react: { text: "✅", key: msg.key } });
      
    } catch (error) {
      console.error("Erro no addmanutencao:", error);
      await conn.sendMessage(from, { 
        text: "❌ *Erro ao gerenciar manutenção!* Tente novamente." 
      }, { quoted: msg });
    }
  }
};