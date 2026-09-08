// Menu: Utilidades - Produtividade
const crypto = require("crypto");
const kit = require("../../functions/utilityKit");
const { createStatusQuoted } = require("../../functions/statusCard");

const stopwatches = new Map();
const reminderTimers = new Map();

function ownerKey(msg, from) {
  return kit.senderId(msg, from);
}

function splitOptions(args) {
  return args.join(" ").split("|").map((x) => x.trim()).filter(Boolean);
}

function safeCalc(expression) {
  let expr = String(expression || "").trim();
  if (!expr || expr.length > 160) throw kit.userError("Ex.: .calc (10 + 5) * 2");
  if (!/^[0-9+\-*/%().,^\s]+$/.test(expr)) throw kit.userError("Use apenas números, parênteses e operadores + - * / % ^.");
  expr = expr.replace(/\^/g, "**").replace(/,/g, ".");
  const value = Function(`"use strict"; return (${expr});`)();
  if (typeof value !== "number" || !Number.isFinite(value)) throw kit.userError("O resultado não é um número finito.");
  return value;
}

function scheduleReminder(conn, item) {
  if (reminderTimers.has(item.id)) clearTimeout(reminderTimers.get(item.id));
  const tick = () => {
    const delay = item.dueAt - Date.now();
    if (delay > 0) {
      reminderTimers.set(item.id, setTimeout(tick, Math.min(delay, 2147483000)));
      return;
    }
    reminderTimers.delete(item.id);
    kit.updateDb((db) => {
      db.reminders = db.reminders.filter((r) => r.id !== item.id);
    }).then(() => conn.sendMessage(item.chat, {
      text: `⏰ *Lembrete*\n\n${item.text}${item.sender ? `\n\n@${item.sender.split("@")[0]}` : ""}`,
      mentions: item.sender ? [item.sender] : [],
    }).catch(() => {})).catch(() => {});
  };
  tick();
}

const commands = [
  kit.makeCommand({
    name: "calc", section: "Ferramentas", usage: "calc [expressão]",
    async execute(conn, msg, args, from) {
      try {
        const expression = kit.inputText(msg, args);
        const result = safeCalc(expression);
        await kit.reply(conn, msg, from, `🧮 *Resultado*\n\n${expression} = *${result}*`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível calcular essa expressão."); }
    },
  }),

  kit.makeCommand({
    name: "lembrete", section: "Produtividade", usage: "lembrete [tempo] [texto]",
    async execute(conn, msg, args, from) {
      try {
        const sender = ownerKey(msg, from);
        const action = String(args[0] || "").toLowerCase();
        if (["listar", "lista"].includes(action)) {
          const db = await kit.readDb();
          const list = db.reminders.filter((r) => r.sender === sender).sort((a, b) => a.dueAt - b.dueAt);
          if (!list.length) return kit.reply(conn, msg, from, "⏰ Você não tem lembretes pendentes.");
          return kit.reply(conn, msg, from, `⏰ *Seus lembretes*\n\n${list.map((r, i) => `${i + 1}. ${new Date(r.dueAt).toLocaleString("pt-BR")} — ${r.text}`).join("\n")}`);
        }
        if (["cancelar", "remover", "del"].includes(action)) {
          const index = Number(args[1]);
          if (!Number.isInteger(index) || index < 1) throw kit.userError("Use: .lembrete cancelar [número]");
          const removed = await kit.updateDb((db) => {
            const mine = db.reminders.filter((r) => r.sender === sender).sort((a, b) => a.dueAt - b.dueAt);
            const target = mine[index - 1];
            if (!target) return null;
            db.reminders = db.reminders.filter((r) => r.id !== target.id);
            return target;
          });
          if (!removed) throw kit.userError("Lembrete não encontrado.");
          if (reminderTimers.has(removed.id)) clearTimeout(reminderTimers.get(removed.id));
          reminderTimers.delete(removed.id);
          return kit.reply(conn, msg, from, "✅ Lembrete cancelado.");
        }
        const ms = kit.parseDuration(args[0]);
        const text = args.slice(1).join(" ").trim();
        if (!text) throw kit.userError("Ex.: .lembrete 10m beber água");
        if (text.length > 1000) throw kit.userError("O texto do lembrete é grande demais.");
        const item = { id: crypto.randomUUID(), sender, chat: from, text, dueAt: Date.now() + ms, createdAt: Date.now() };
        await kit.updateDb((db) => { db.reminders.push(item); });
        scheduleReminder(conn, item);
        await kit.reply(conn, msg, from, `⏰ Lembrete criado para ${new Date(item.dueAt).toLocaleString("pt-BR")}.`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível criar o lembrete."); }
    },
  }),

  kit.makeCommand({
    name: "enquete", section: "Produtividade", usage: "enquete [pergunta] | [opção] | [opção]",
    async execute(conn, msg, args, from) {
      try {
        const parts = splitOptions(args);
        if (parts.length < 3) throw kit.userError("Ex.: .enquete Melhor cor? | Azul | Preto | Branco");
        const [question, ...options] = parts;
        if (options.length > 12) throw kit.userError("Use no máximo 12 opções.");
        await conn.sendMessage(from, { poll: { name: question.slice(0, 255), values: options.map((x) => x.slice(0, 100)), selectableCount: 1 } }, { quoted: createStatusQuoted(msg) });
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível criar a enquete."); }
    },
  }),

  kit.makeCommand({
    name: "sorteio", section: "Produtividade", usage: "sorteio [opção] | [opção] | ...",
    async execute(conn, msg, args, from) {
      try {
        const options = splitOptions(args);
        if (options.length < 2) throw kit.userError("Ex.: .sorteio Ana | Bia | Caio");
        if (options.length > 100) throw kit.userError("Use no máximo 100 participantes/opções.");
        const winner = options[crypto.randomInt(options.length)];
        await kit.reply(conn, msg, from, `🎉 *Resultado do sorteio*\n\n🏆 ${winner}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível realizar o sorteio."); }
    },
  }),

  kit.makeCommand({
    name: "escolher", section: "Produtividade", usage: "escolher [opção] | [opção] | ...",
    async execute(conn, msg, args, from) {
      try {
        const options = splitOptions(args);
        if (options.length < 2) throw kit.userError("Ex.: .escolher pizza | hambúrguer | pastel");
        const choice = options[crypto.randomInt(options.length)];
        await kit.reply(conn, msg, from, `🎯 Eu escolho: *${choice}*`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível escolher uma opção."); }
    },
  }),

  kit.makeCommand({
    name: "cronometro", section: "Produtividade", usage: "cronometro [iniciar|ver|parar]",
    async execute(conn, msg, args, from) {
      try {
        const key = ownerKey(msg, from);
        const action = String(args[0] || "ver").toLowerCase();
        if (["iniciar", "start"].includes(action)) {
          stopwatches.set(key, Date.now());
          return kit.reply(conn, msg, from, "⏱️ Cronômetro iniciado.");
        }
        const started = stopwatches.get(key);
        if (!started) throw kit.userError("Você ainda não iniciou um cronômetro. Use .cronometro iniciar");
        const elapsed = Date.now() - started;
        const sec = Math.floor(elapsed / 1000) % 60;
        const min = Math.floor(elapsed / 60000) % 60;
        const hr = Math.floor(elapsed / 3600000);
        const formatted = `${String(hr).padStart(2, "0")}:${String(min).padStart(2, "0")}:${String(sec).padStart(2, "0")}`;
        if (["parar", "stop"].includes(action)) stopwatches.delete(key);
        await kit.reply(conn, msg, from, `⏱️ *${formatted}*${["parar", "stop"].includes(action) ? " — finalizado" : ""}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível usar o cronômetro."); }
    },
  }),

  kit.makeCommand({
    name: "idade", section: "Datas", usage: "idade [DD/MM/AAAA]",
    async execute(conn, msg, args, from) {
      try {
        const birth = kit.parseDate(args[0]);
        const today = new Date();
        if (birth > today) throw kit.userError("A data de nascimento não pode estar no futuro.");
        let years = today.getFullYear() - birth.getFullYear();
        const beforeBirthday = today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
        if (beforeBirthday) years--;
        await kit.reply(conn, msg, from, `🎂 Idade: *${years} ano${years === 1 ? "" : "s"}*`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível calcular a idade."); }
    },
  }),

  kit.makeCommand({
    name: "data", section: "Datas", usage: "data [DD/MM/AAAA] [DD/MM/AAAA]",
    async execute(conn, msg, args, from) {
      try {
        const a = kit.parseDate(args[0]);
        const b = kit.parseDate(args[1]);
        const days = Math.round(Math.abs(b - a) / 86400000);
        await kit.reply(conn, msg, from, `📅 Diferença: *${days} dia${days === 1 ? "" : "s"}*`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível calcular a diferença entre as datas."); }
    },
  }),

  kit.makeCommand({
    name: "anotacao", section: "Produtividade", usage: "anotacao [texto|remover N|limpar]",
    async execute(conn, msg, args, from) {
      try {
        const key = ownerKey(msg, from);
        const action = String(args[0] || "").toLowerCase();
        if (["limpar", "clear"].includes(action)) {
          await kit.updateDb((db) => { db.notes[key] = []; });
          return kit.reply(conn, msg, from, "🧹 Suas anotações foram removidas.");
        }
        if (["remover", "del", "delete"].includes(action)) {
          const index = Number(args[1]);
          if (!Number.isInteger(index) || index < 1) throw kit.userError("Use: .anotacao remover [número]");
          const removed = await kit.updateDb((db) => {
            const list = db.notes[key] || [];
            if (!list[index - 1]) return false;
            list.splice(index - 1, 1); db.notes[key] = list; return true;
          });
          if (!removed) throw kit.userError("Anotação não encontrada.");
          return kit.reply(conn, msg, from, "✅ Anotação removida.");
        }
        const text = kit.inputText(msg, args);
        if (!text) throw kit.userError("Ex.: .anotacao comprar pilhas amanhã");
        if (text.length > 1000) throw kit.userError("A anotação deve ter no máximo 1000 caracteres.");
        await kit.updateDb((db) => {
          const list = db.notes[key] || [];
          if (list.length >= 100) list.shift();
          list.push({ text, at: Date.now() }); db.notes[key] = list;
        });
        await kit.reply(conn, msg, from, "📝 Anotação salva.");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível salvar a anotação."); }
    },
  }),

  kit.makeCommand({
    name: "minhasnotas", section: "Produtividade", usage: "minhasnotas",
    async execute(conn, msg, args, from) {
      try {
        const key = ownerKey(msg, from);
        const db = await kit.readDb();
        const list = db.notes[key] || [];
        if (!list.length) return kit.reply(conn, msg, from, "📝 Você ainda não salvou anotações.");
        const start = Math.max(0, list.length - 20);
        await kit.reply(conn, msg, from, `📝 *Suas anotações*\n\n${list.slice(start).map((n, i) => `${start + i + 1}. ${n.text}`).join("\n")}`);
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível listar suas anotações."); }
    },
  }),

  kit.makeCommand({
    name: "favorito", section: "Produtividade", usage: "favorito [listar|ver N|remover N]",
    async execute(conn, msg, args, from) {
      try {
        const key = ownerKey(msg, from);
        const action = String(args[0] || "").toLowerCase();
        const db = await kit.readDb();
        const current = db.favorites[key] || [];
        if (["listar", "lista"].includes(action)) {
          if (!current.length) return kit.reply(conn, msg, from, "⭐ Você ainda não tem favoritos.");
          return kit.reply(conn, msg, from, `⭐ *Favoritos*\n\n${current.slice(-20).map((f, i) => `${Math.max(0, current.length - 20) + i + 1}. ${f.text.slice(0, 100)}`).join("\n")}`);
        }
        if (["ver", "mostrar"].includes(action)) {
          const index = Number(args[1]);
          const item = current[index - 1];
          if (!item) throw kit.userError("Favorito não encontrado.");
          return kit.reply(conn, msg, from, `⭐ *Favorito ${index}*\n\n${item.text}`);
        }
        if (["remover", "del", "delete"].includes(action)) {
          const index = Number(args[1]);
          if (!Number.isInteger(index) || index < 1) throw kit.userError("Use: .favorito remover [número]");
          const ok = await kit.updateDb((next) => {
            const list = next.favorites[key] || [];
            if (!list[index - 1]) return false;
            list.splice(index - 1, 1); next.favorites[key] = list; return true;
          });
          if (!ok) throw kit.userError("Favorito não encontrado.");
          return kit.reply(conn, msg, from, "✅ Favorito removido.");
        }
        const quoted = kit.messageText(kit.quotedMessage(msg)).trim();
        const text = quoted || kit.inputText(msg, args);
        if (!text) throw kit.userError("Responda a uma mensagem com .favorito ou informe um texto/link.");
        if (text.length > 4000) throw kit.userError("Esse conteúdo é grande demais para favoritar.");
        await kit.updateDb((next) => {
          const list = next.favorites[key] || [];
          if (list.length >= 100) list.shift();
          list.push({ text, at: Date.now(), chat: from }); next.favorites[key] = list;
        });
        await kit.reply(conn, msg, from, "⭐ Favorito salvo.");
      } catch (e) { await kit.fail(conn, msg, from, e, "Não foi possível gerenciar os favoritos."); }
    },
  }),
];

module.exports = commands;
