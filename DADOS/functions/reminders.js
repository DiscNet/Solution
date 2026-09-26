const fs = require("fs");
const path = require("path");

const remindersFile = path.join(__dirname, "../database/reminders.json");

function loadReminders() {
  if (!fs.existsSync(remindersFile)) return [];
  const data = fs.readFileSync(remindersFile, "utf8");
  try {
    return JSON.parse(data);
  } catch {
    return [];
  }
}

function saveReminders(reminders) {
  fs.writeFileSync(remindersFile, JSON.stringify(reminders, null, 2));
}

function startReminderChecker(conn) {
  setInterval(async () => {
    const reminders = loadReminders();
    const now = new Date();

    let updated = false;

    for (const r of reminders) {
      const reminderTime = new Date(r.date);
      if (reminderTime <= now) {
        try {
          await conn.sendMessage(r.user, { text: `⏰ Lembrete: ${r.message}` });
        } catch (err) {
          console.error("Erro ao enviar lembrete:", err);
        }
        // Remove lembrete disparado
        reminders.splice(reminders.indexOf(r), 1);
        updated = true;
      }
    }

    if (updated) saveReminders(reminders);

  }, 30 * 1000); // checa a cada 30s
}

module.exports = { startReminderChecker };