// Identificação e uso de cada comando: tabela menuMetadata no final deste arquivo.
const engine = require("../../functions/rpgEngine");

function sc(text) {
  const map = {
    a:"ᴀ", b:"ʙ", c:"ᴄ", d:"ᴅ", e:"ᴇ", f:"ғ", g:"ɢ", h:"ʜ", i:"ɪ", j:"ᴊ",
    k:"ᴋ", l:"ʟ", m:"ᴍ", n:"ɴ", o:"ᴏ", p:"ᴘ", q:"ǫ", r:"ʀ", t:"ᴛ", u:"ᴜ",
    v:"ᴠ", w:"ᴡ", y:"ʏ", z:"ᴢ"
  };
  return String(text).replace(/[A-Za-z]/g, (ch) => map[ch.toLowerCase()] || ch.toLowerCase());
}

const info = [
  ["rpgguia","guia completo do sistema rpg","guide"],
  ["rpgcomandos","lista os comandos do rpg por categoria","commands"],
  ["rpgstats","mostra estatisticas completas do personagem","stats"],
  ["atributos","mostra vida mana dano defesa e atributos","attributes"],
  ["inventario","mostra todos os itens carregados","inventory"],
  ["equipamentos","mostra os equipamentos ativos","equipment"],
  ["habilidades","mostra habilidades aprendidas","skills"],
  ["missoes","mostra missoes ativas","quests"],
  ["conquistas","mostra conquistas desbloqueadas","achievements"],
  ["colecao","mostra colecao de itens e pets","collection"],
  ["titulos","mostra titulos desbloqueados","titles"],
  ["buffs","mostra efeitos temporarios ativos","buffs"],
  ["cooldowns","mostra tempos de espera do rpg","cooldowns"],
  ["classeinfo","explica a classe atual","classinfo"],
  ["patenteinfo","mostra detalhes da patente","rankinfo"],
  ["iteminfo","mostra informacoes de um item","iteminfo"],
  ["petinfo","mostra informacoes do pet equipado","petinfo"],
  ["mapa","mostra o mapa de exploracao","map"],
  ["biomas","lista biomas e requisitos","biomes"],
  ["monstros","lista monstros conhecidos","monsters"],
  ["bosses","lista chefes do mundo","bosses"],
  ["receitas","lista receitas de fabricacao","recipes"],
  ["raridades","explica as raridades de itens","rarities"],
  ["economia","explica gold banco e mercado","economy"],
  ["regrasrpg","mostra as regras do sistema","rules"]
].map(([name, description, topic]) => ({ name, category: "informacao", kind: "info", topic, description: sc(description), permissions: { group: true } }));

const economy = [
  ["diario","recompensa diaria","daily",{}],
  ["trabalhar","trabalha por gold e experiencia","gather",{reward:[80,180],xp:[20,50],item:"sucata",cooldown:1800000}],
  ["pescar","pesca recursos e peixes","gather",{reward:[30,90],xp:[15,35],item:"peixe",cooldown:900000}],
  ["forragear","procura recursos naturais","gather",{reward:[25,70],xp:[12,30],item:"erva",cooldown:600000}],
  ["escavar","escava materiais do solo","gather",{reward:[35,100],xp:[18,40],item:"argila",cooldown:900000}],
  ["lenhar","coleta madeira","gather",{reward:[30,85],xp:[15,35],item:"madeira",cooldown:600000}],
  ["coletar","coleta um material aleatorio","collect",{}],
  ["venderitem","vende itens da mochila","sell",{}],
  ["compraritem","compra itens do catalogo","buy",{}],
  ["usaritem","usa um item consumivel","use",{}],
  ["equipar","equipa arma armadura ou acessorio","equip",{}],
  ["desequipar","remove um equipamento ativo","unequip",{}],
  ["pagar","transfere gold para outro jogador","pay",{}],
  ["depositar","guarda gold no banco","deposit",{}],
  ["sacar","retira gold do banco","withdraw",{}],
  ["banco","mostra o saldo bancario","bank",{}],
  ["trocaritem","transfere um item para outro jogador","tradeitem",{}],
  ["mercadorpg","mostra anuncios do mercado","market",{}],
  ["anunciaritem","coloca um item a venda","listmarket",{}],
  ["comprarmercado","compra um anuncio do mercado","buymarket",{}],
  ["cancelarvenda","cancela um anuncio proprio","cancelmarket",{}],
  ["craft","fabrica itens usando receitas","craft",{}],
  ["desmontar","desmonta um item em materiais","dismantle",{}],
  ["reparar","repara um equipamento","repair",{}],
  ["reforjar","melhora um equipamento usando gold","reforge",{}]
].map(([name, description, kind, meta]) => ({ name, category: "economia", kind, ...meta, description: sc(description), permissions: { group: true } }));

const progression = [
  ["treinar","treina e recebe experiencia","train",{}],
  ["meditar","recupera mana e foco","restore",{resource:"mana",amount:35,cooldown:600000}],
  ["descansar","recupera vida e energia","rest",{}],
  ["curar","recupera parte da vida","restore",{resource:"vida",amount:40,cooldown:600000}],
  ["recuperarmana","recupera mana com custo de gold","manaheal",{}],
  ["uparforca","aumenta o dano do personagem","upgrade",{stat:"dano",cost:250,amount:2}],
  ["upardefesa","aumenta a defesa do personagem","upgrade",{stat:"defesa",cost:250,amount:2}],
  ["uparagilidade","aumenta a agilidade","upgrade",{stat:"agilidade",cost:250,amount:2}],
  ["uparcritico","aumenta a chance critica","upgrade",{stat:"critico",cost:350,amount:1}],
  ["uparvida","aumenta a vida maxima","upgrade",{stat:"vidaMax",cost:300,amount:8}],
  ["upamana","aumenta a mana maxima","upgrade",{stat:"manaMax",cost:300,amount:6}],
  ["classe","mostra classes disponiveis","classes",{}],
  ["trocarclasse","troca a classe do personagem","changeclass",{}],
  ["especializacao","escolhe uma especializacao","specialization",{}],
  ["aprender","aprende uma habilidade","learn",{}],
  ["evoluir","usa essencia para evoluir atributos","evolve",{}],
  ["prestigio","reinicia nivel avancado ganhando prestigio","prestige",{}],
  ["titulo","mostra o titulo ativo","title",{}],
  ["equipartitulo","equipa um titulo desbloqueado","equiptitle",{}],
  ["renome","altera o nome do personagem no rpg","rename",{}]
].map(([name, description, kind, meta]) => ({ name, category: "progressao", kind, ...meta, description: sc(description), permissions: { group: true } }));

const adventure = [
  ["explorar","explora a regiao atual","explore",{zone:"arredores",level:1,item:"sucata",reward:[30,100],xp:[20,55]}],
  ["viajar","viaja para outro bioma","travel",{}],
  ["floresta","explora a floresta","explore",{zone:"floresta",level:1,item:"madeira",reward:[35,110],xp:[25,60]}],
  ["caverna","explora cavernas profundas","explore",{zone:"caverna",level:3,item:"ferro",reward:[50,140],xp:[35,75]}],
  ["ruinas","investiga ruinas antigas","explore",{zone:"ruinas",level:5,item:"fragmento",reward:[70,170],xp:[45,90]}],
  ["pantano","explora o pantano","explore",{zone:"pantano",level:7,item:"erva-rara",reward:[75,190],xp:[50,100]}],
  ["deserto","atravessa o deserto","explore",{zone:"deserto",level:9,item:"cristal",reward:[90,220],xp:[60,115]}],
  ["montanha","sobe a montanha","explore",{zone:"montanha",level:11,item:"prata",reward:[100,240],xp:[70,130]}],
  ["praia","explora a costa","explore",{zone:"praia",level:4,item:"concha",reward:[45,130],xp:[30,75]}],
  ["vulcao","explora a area vulcanica","explore",{zone:"vulcao",level:18,item:"obsidiana",reward:[160,350],xp:[120,220]}],
  ["geleira","explora a geleira","explore",{zone:"geleira",level:15,item:"gelo-eterno",reward:[140,310],xp:[105,195]}],
  ["templo","explora um templo antigo","explore",{zone:"templo",level:13,item:"runa",reward:[125,280],xp:[90,170]}],
  ["masmorra","entra em uma masmorra","dungeon",{}],
  ["expedicao","parte em uma expedicao longa","expedition",{}],
  ["patrulhar","patrulha a regiao atual","patrol",{}],
  ["investigar","investiga pistas e eventos","investigate",{}],
  ["procurartesouro","procura bau escondido","treasure",{}],
  ["abrirbau","abre um bau do inventario","openchest",{}],
  ["acampar","monta acampamento para recuperar recursos","camp",{}],
  ["cozinhar","cozinha alimentos coletados","cook",{}],
  ["rastrear","rastreia criaturas raras","track",{}],
  ["colherervas","colhe ervas medicinais","gather",{reward:[20,60],xp:[15,30],item:"erva",cooldown:480000}],
  ["extraircristal","extrai cristais de energia","gather",{reward:[60,150],xp:[35,70],item:"cristal",cooldown:900000}],
  ["cacaelite","caca um inimigo de elite","elite",{}],
  ["evento","mostra o evento atual do rpg","eventinfo",{}]
].map(([name, description, kind, meta]) => ({ name, category: "aventura", kind, ...meta, description: sc(description), permissions: { group: true } }));

const combat = [
  ["batalhar","inicia uma batalha contra um monstro","battle"], ["duelo","aceita ou inicia um duelo com jogador","duel"],
  ["atacar","ataca o inimigo da batalha atual","attack"], ["defender","assume postura defensiva na batalha","defend"],
  ["esquivar","tenta evitar o proximo golpe","dodge"], ["habilidade","usa uma habilidade aprendida","skill"],
  ["fugir","tenta sair da batalha atual","flee"], ["boss","mostra ou invoca o chefe do grupo","bossinfo"],
  ["atacarboss","ataca o chefe ativo do grupo","bossattack"], ["raid","mostra a raid ativa","raidinfo"],
  ["entrarraid","entra na raid do grupo","joinraid"], ["atacarraid","ataca o inimigo da raid","raidattack"],
  ["arena","mostra o ranking de pvp","arena"], ["desafiar","desafia outro jogador para duelo","challenge"],
  ["pvpstatus","mostra vitorias e derrotas no pvp","pvpstats"], ["alvo","mostra o desafio ou alvo atual","target"],
  ["combateinfo","mostra o combate atual detalhado","combatinfo"], ["reviver","recupera o personagem quando derrotado","revive"],
  ["pocao","usa uma pocao rapidamente","potion"], ["proteger","gasta mana para aumentar a defesa","protect"]
].map(([name, description, kind]) => ({ name, category: "combate", kind, description: sc(description), permissions: { group: true } }));

const social = [
  ["guilda","mostra informacoes da guilda","guild"], ["criarguilda","cria uma nova guilda","createguild"],
  ["entrarguilda","entra em uma guilda existente","joinguild"], ["sairguilda","sai da guilda atual","leaveguild"],
  ["guildamembros","lista membros da guilda","guildmembers"], ["guildarank","mostra ranking das guildas","guildrank"],
  ["doarguilda","doa gold para a guilda","guilddonate"], ["missao","lista missoes disponiveis","questlist"],
  ["aceitarmissao","aceita uma missao","questaccept"], ["abandonarmissao","abandona a missao ativa","questabandon"],
  ["entregarmissao","entrega uma missao concluida","questturnin"], ["recompensas","mostra recompensas recentes","rewards"],
  ["amizaderpg","adiciona outro jogador como aliado","friend"], ["grupoaventura","mostra seu grupo de aventura","party"],
  ["convocar","convida um jogador para o grupo","inviteparty"]
].map(([name, description, kind]) => ({ name, category: "social", kind, description: sc(description), permissions: { group: true } }));

const admin = [
  ["rpgadmin","mostra o painel administrativo do rpg","admininfo",{group:true,admin:true}],
  ["rpgset","altera configuracoes do rpg no grupo","adminset",{group:true,admin:true}],
  ["rpgadditem","adiciona item a um jogador","adminadditem",{owner:true}],
  ["rpgremoveitem","remove item de um jogador","adminremoveitem",{owner:true}],
  ["rpgreset","reseta o personagem de um jogador","adminreset",{owner:true}],
  ["rpgban","bloqueia um jogador no sistema rpg","adminban",{owner:true}],
  ["rpgunban","remove bloqueio de jogador do rpg","adminunban",{owner:true}],
  ["rpgevento","cria ou encerra evento global do rpg","adminevent",{owner:true}]
].map(([name, description, kind, permissions]) => ({ name, category: "administracao", kind, description: sc(description), permissions }));

const definitions = [...info, ...economy, ...progression, ...adventure, ...combat, ...social, ...admin];
if (definitions.length !== 138) throw new Error(`RPG expansion expected 138 commands, got ${definitions.length}`);
const legacyCatalog = engine.LEGACY_COMMANDS.map((name) => ({
  name,
  category: "classicos",
  description: sc("comando classico do rpg")
}));
const catalog = Object.freeze([
  ...legacyCatalog,
  ...definitions.map((item) => ({ name: item.name, category: item.category, description: item.description }))
]);
if (catalog.length !== 150) throw new Error(`RPG complete catalog expected 150 commands, got ${catalog.length}`);

module.exports = definitions.map((definition) => ({
  name: definition.name,
  aliases: [],
  description: definition.description,
  permissions: definition.permissions,
  rpgCategory: definition.category,
  async execute(conn, msg, args, from, axiosInstance, requestedName) {
    if (definition.name === "rpgcomandos") return require("../../functions/menuRenderer").createMenu("rpgcomandos", "RPG").execute(conn, msg, args, from);
    return engine.execute(definition, { conn, msg, args, from, axiosInstance, requestedName, catalog });
  }
}));


const menuMetadata = {
  "rpgguia": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "guia completo do sistema rpg"
  },
  "rpgcomandos": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "lista os comandos do rpg por categoria"
  },
  "rpgstats": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra estatisticas completas do personagem"
  },
  "atributos": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra vida mana dano defesa e atributos"
  },
  "inventario": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra todos os itens carregados"
  },
  "equipamentos": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra os equipamentos ativos"
  },
  "habilidades": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra habilidades aprendidas"
  },
  "missoes": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra missoes ativas"
  },
  "conquistas": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra conquistas desbloqueadas"
  },
  "colecao": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra colecao de itens e pets"
  },
  "titulos": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra titulos desbloqueados"
  },
  "buffs": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra efeitos temporarios ativos"
  },
  "cooldowns": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra tempos de espera do rpg"
  },
  "classeinfo": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "explica a classe atual"
  },
  "patenteinfo": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra detalhes da patente"
  },
  "iteminfo": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "usage": "iteminfo item",
    "description": "Uso: .iteminfo item"
  },
  "petinfo": {
    "menuCategory": "RPG",
    "menuSection": "Pets",
    "description": "mostra informacoes do pet equipado"
  },
  "mapa": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra o mapa de exploracao"
  },
  "biomas": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "lista biomas e requisitos"
  },
  "monstros": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "lista monstros conhecidos"
  },
  "bosses": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "lista chefes do mundo"
  },
  "receitas": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "lista receitas de fabricacao"
  },
  "raridades": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "explica as raridades de itens"
  },
  "economia": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "explica gold banco e mercado"
  },
  "regrasrpg": {
    "menuCategory": "RPG",
    "menuSection": "Informações",
    "description": "mostra as regras do sistema"
  },
  "diario": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "description": "recompensa diaria"
  },
  "trabalhar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "description": "trabalha por gold e experiencia"
  },
  "pescar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "description": "pesca recursos e peixes"
  },
  "forragear": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "description": "procura recursos naturais"
  },
  "escavar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "description": "escava materiais do solo"
  },
  "lenhar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "description": "coleta madeira"
  },
  "coletar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "description": "coleta um material aleatorio"
  },
  "venderitem": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "venderitem item [quantidade]",
    "description": "Uso: .venderitem item [quantidade]"
  },
  "compraritem": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "compraritem item [quantidade]",
    "description": "Uso: .compraritem item [quantidade]"
  },
  "usaritem": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "usaritem item",
    "description": "Uso: .usaritem item"
  },
  "equipar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "equipar item",
    "description": "Uso: .equipar item"
  },
  "desequipar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "desequipar arma|armadura|acessorio",
    "description": "Uso: .desequipar arma|armadura|acessorio"
  },
  "pagar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "pagar @usuario valor",
    "description": "Uso: .pagar @usuario valor"
  },
  "depositar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "depositar valor",
    "description": "Uso: .depositar valor"
  },
  "sacar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "sacar valor",
    "description": "Uso: .sacar valor"
  },
  "banco": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "description": "mostra o saldo bancario"
  },
  "trocaritem": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "trocaritem @usuario item quantidade",
    "description": "Uso: .trocaritem @usuario item quantidade"
  },
  "mercadorpg": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "description": "mostra anuncios do mercado"
  },
  "anunciaritem": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "anunciaritem item quantidade preço",
    "description": "Uso: .anunciaritem item quantidade preço"
  },
  "comprarmercado": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "comprarmercado id",
    "description": "Uso: .comprarmercado id"
  },
  "cancelarvenda": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "cancelarvenda id",
    "description": "Uso: .cancelarvenda id"
  },
  "craft": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "craft receita",
    "description": "Uso: .craft receita"
  },
  "desmontar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "desmontar item",
    "description": "Uso: .desmontar item"
  },
  "reparar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "reparar [slot]",
    "description": "Uso: .reparar [slot]"
  },
  "reforjar": {
    "menuCategory": "RPG",
    "menuSection": "Economia e itens",
    "usage": "reforjar [slot]",
    "description": "Uso: .reforjar [slot]"
  },
  "treinar": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "treina e recebe experiencia"
  },
  "meditar": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "recupera mana e foco"
  },
  "descansar": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "recupera vida e energia"
  },
  "curar": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "recupera parte da vida"
  },
  "recuperarmana": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "recupera mana com custo de gold"
  },
  "uparforca": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "aumenta o dano do personagem"
  },
  "upardefesa": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "aumenta a defesa do personagem"
  },
  "uparagilidade": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "aumenta a agilidade"
  },
  "uparcritico": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "aumenta a chance critica"
  },
  "uparvida": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "aumenta a vida maxima"
  },
  "upamana": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "aumenta a mana maxima"
  },
  "classe": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "mostra classes disponiveis"
  },
  "trocarclasse": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "troca a classe do personagem"
  },
  "especializacao": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "escolhe uma especializacao"
  },
  "aprender": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "usage": "aprender habilidade",
    "description": "Uso: .aprender habilidade"
  },
  "evoluir": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "usa essencia para evoluir atributos"
  },
  "prestigio": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "reinicia nivel avancado ganhando prestigio"
  },
  "titulo": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "mostra o titulo ativo"
  },
  "equipartitulo": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "equipa um titulo desbloqueado"
  },
  "renome": {
    "menuCategory": "RPG",
    "menuSection": "Progressão",
    "description": "altera o nome do personagem no rpg"
  },
  "explorar": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "explora a regiao atual"
  },
  "viajar": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "usage": "viajar bioma",
    "description": "Uso: .viajar bioma"
  },
  "floresta": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "explora a floresta"
  },
  "caverna": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "explora cavernas profundas"
  },
  "ruinas": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "investiga ruinas antigas"
  },
  "pantano": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "explora o pantano"
  },
  "deserto": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "atravessa o deserto"
  },
  "montanha": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "sobe a montanha"
  },
  "praia": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "explora a costa"
  },
  "vulcao": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "explora a area vulcanica"
  },
  "geleira": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "explora a geleira"
  },
  "templo": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "explora um templo antigo"
  },
  "masmorra": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "entra em uma masmorra"
  },
  "expedicao": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "parte em uma expedicao longa"
  },
  "patrulhar": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "patrulha a regiao atual"
  },
  "investigar": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "investiga pistas e eventos"
  },
  "procurartesouro": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "procura bau escondido"
  },
  "abrirbau": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "abre um bau do inventario"
  },
  "acampar": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "monta acampamento para recuperar recursos"
  },
  "cozinhar": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "cozinha alimentos coletados"
  },
  "rastrear": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "rastreia criaturas raras"
  },
  "colherervas": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "colhe ervas medicinais"
  },
  "extraircristal": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "extrai cristais de energia"
  },
  "cacaelite": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "caca um inimigo de elite"
  },
  "evento": {
    "menuCategory": "RPG",
    "menuSection": "Exploração",
    "description": "mostra o evento atual do rpg"
  },
  "batalhar": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "inicia uma batalha contra um monstro"
  },
  "duelo": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "usage": "duelo @usuario",
    "description": "Uso: .duelo @usuario"
  },
  "atacar": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "ataca o inimigo da batalha atual"
  },
  "defender": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "assume postura defensiva na batalha"
  },
  "esquivar": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "tenta evitar o proximo golpe"
  },
  "habilidade": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "usage": "habilidade [nome]",
    "description": "Uso: .habilidade [nome]"
  },
  "fugir": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "tenta sair da batalha atual"
  },
  "boss": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "mostra ou invoca o chefe do grupo"
  },
  "atacarboss": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "ataca o chefe ativo do grupo"
  },
  "raid": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "mostra a raid ativa"
  },
  "entrarraid": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "entra na raid do grupo"
  },
  "atacarraid": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "ataca o inimigo da raid"
  },
  "arena": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "mostra o ranking de pvp"
  },
  "desafiar": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "usage": "desafiar @usuario",
    "description": "Uso: .desafiar @usuario"
  },
  "pvpstatus": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "mostra vitorias e derrotas no pvp"
  },
  "alvo": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "mostra o desafio ou alvo atual"
  },
  "combateinfo": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "mostra o combate atual detalhado"
  },
  "reviver": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "recupera o personagem quando derrotado"
  },
  "pocao": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "usa uma pocao rapidamente"
  },
  "proteger": {
    "menuCategory": "RPG",
    "menuSection": "Combate",
    "description": "gasta mana para aumentar a defesa"
  },
  "guilda": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "description": "mostra informacoes da guilda"
  },
  "criarguilda": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "usage": "criarguilda nome",
    "description": "Uso: .criarguilda nome"
  },
  "entrarguilda": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "usage": "entrarguilda nome",
    "description": "Uso: .entrarguilda nome"
  },
  "sairguilda": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "description": "sai da guilda atual"
  },
  "guildamembros": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "description": "lista membros da guilda"
  },
  "guildarank": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "description": "mostra ranking das guildas"
  },
  "doarguilda": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "usage": "doarguilda valor",
    "description": "Uso: .doarguilda valor"
  },
  "missao": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "description": "lista missoes disponiveis"
  },
  "aceitarmissao": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "usage": "aceitarmissao id",
    "description": "Uso: .aceitarmissao id"
  },
  "abandonarmissao": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "description": "abandona a missao ativa"
  },
  "entregarmissao": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "description": "entrega uma missao concluida"
  },
  "recompensas": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "description": "mostra recompensas recentes"
  },
  "amizaderpg": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "usage": "amizaderpg @usuario",
    "description": "Uso: .amizaderpg @usuario"
  },
  "grupoaventura": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "description": "mostra seu grupo de aventura"
  },
  "convocar": {
    "menuCategory": "RPG",
    "menuSection": "Guildas e missões",
    "usage": "convocar @usuario",
    "description": "Uso: .convocar @usuario"
  },
  "rpgadmin": {
    "menuCategory": "RPG",
    "menuSection": "Administração",
    "description": "mostra o painel administrativo do rpg"
  },
  "rpgset": {
    "menuCategory": "RPG",
    "menuSection": "Administração",
    "usage": "rpgset pvp|gold|xp valor",
    "description": "Uso: .rpgset pvp|gold|xp valor"
  },
  "rpgadditem": {
    "menuCategory": "RPG",
    "menuSection": "Administração",
    "usage": "rpgadditem @usuario item quantidade",
    "description": "Uso: .rpgadditem @usuario item quantidade"
  },
  "rpgremoveitem": {
    "menuCategory": "RPG",
    "menuSection": "Administração",
    "usage": "rpgremoveitem @usuario item quantidade",
    "description": "Uso: .rpgremoveitem @usuario item quantidade"
  },
  "rpgreset": {
    "menuCategory": "RPG",
    "menuSection": "Administração",
    "usage": "rpgreset @usuario confirmar",
    "description": "Uso: .rpgreset @usuario confirmar"
  },
  "rpgban": {
    "menuCategory": "RPG",
    "menuSection": "Administração",
    "usage": "rpgban @usuario",
    "description": "Uso: .rpgban @usuario"
  },
  "rpgunban": {
    "menuCategory": "RPG",
    "menuSection": "Administração",
    "usage": "rpgunban @usuario",
    "description": "Uso: .rpgunban @usuario"
  },
  "rpgevento": {
    "menuCategory": "RPG",
    "menuSection": "Administração",
    "usage": "rpgevento nome|off",
    "description": "Uso: .rpgevento nome|off"
  }
};
for (const command of module.exports) Object.assign(command, menuMetadata[command.name]);
