// Menu: Dono - Comandos | Comando: catalogocmd
const { factory } = require("../../functions/adminHelpers");
const menuCatalog = require("../../functions/menuCatalog");

module.exports = factory({
  name: "catalogocmd",
  aliases: ["cmdcatalogo"],
  menuCategory: "Dono",
  menuSection: "Comandos",
  usage: "catalogocmd",
  description: "Uso: .catalogocmd",
  permissions: { owner: true },
}, async () => {
  const { records, errors, collisions } = menuCatalog.diagnostics();
  const visible = records.filter((record) => record.command?.hidden !== true);
  const generated = records.length - visible.length;
  const byCategory = new Map();

  for (const record of visible) {
    const category = record.command?.menuCategory || "Sem categoria";
    byCategory.set(category, (byCategory.get(category) || 0) + 1);
  }

  const categories = [...byCategory.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "pt-BR"))
    .map(([category, total]) => `• ${category}: ${total}`)
    .join("\n");

  return [
    `📚 *CATÁLOGO DE COMANDOS*`,
    ``,
    `• Total canônico: ${records.length}`,
    `• Visíveis nos menus: ${visible.length}`,
    `• Gerados/ocultos: ${generated}`,
    `• Erros de carregamento: ${errors.length}`,
    `• Colisões: ${collisions.length}`,
    ``,
    `*Por categoria*`,
    categories || "• Nenhuma categoria encontrada",
  ].join("\n");
});
