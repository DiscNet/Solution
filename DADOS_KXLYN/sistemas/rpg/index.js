const CLASSES_RPG = Object.freeze({
  guerreiro: { nome: "Guerreiro", emoji: "⚔️", poder: 18, defesa: 12, descricao: "Ataque alto e boa resistência." },
  mago: { nome: "Mago", emoji: "🧙", poder: 22, defesa: 7, descricao: "Maior poder mágico e dano crítico." },
  arqueiro: { nome: "Arqueiro", emoji: "🏹", poder: 19, defesa: 9, descricao: "Ágil e eficiente em exploração." },
  paladino: { nome: "Paladino", emoji: "🛡️", poder: 16, defesa: 16, descricao: "Equilíbrio entre ataque, defesa e recuperação." },
});

const ARMAS_RPG = Object.freeze({
  espada: { nome: "Espada de Gelo", emoji: "🗡️", poder: 14, classe: "guerreiro", custo: { ferro: 8, madeira: 3, cristal: 1 } },
  machado: { nome: "Machado do Titã", emoji: "🪓", poder: 18, classe: "guerreiro", custo: { ferro: 12, madeira: 4, essencia: 2 } },
  arco: { nome: "Arco Celestial", emoji: "🏹", poder: 15, classe: "arqueiro", custo: { madeira: 10, ferro: 3, cristal: 2 } },
  cajado: { nome: "Cajado Arcano", emoji: "🪄", poder: 17, classe: "mago", custo: { madeira: 7, cristal: 5, essencia: 2 } },
  martelo: { nome: "Martelo Sagrado", emoji: "🔨", poder: 16, classe: "paladino", custo: { ferro: 9, cristal: 3, essencia: 3 } },
});

const BOSSES_RPG = Object.freeze({
  dragao: { nome: "Dragão das Chamas", emoji: "🐉", poder: 90, xp: [70, 125], coins: [650, 1400], material: "cristal" },
  rei_esqueleto: { nome: "Rei Esqueleto", emoji: "💀", poder: 110, xp: [85, 145], coins: [800, 1700], material: "essencia" },
  gigante: { nome: "Gigante de Pedra", emoji: "🗿", poder: 130, xp: [95, 165], coins: [950, 2000], material: "ferro" },
  yeti: { nome: "Yeti Congelado", emoji: "❄️", poder: 150, xp: [110, 185], coins: [1100, 2350], material: "cristal" },
  kraken: { nome: "Kraken Abissal", emoji: "🐙", poder: 180, xp: [135, 220], coins: [1400, 2900], material: "essencia" },
});

const AVENTURAS_RPG = Object.freeze([
  { nome: "Floresta Antiga", emoji: "🌲", texto: "Você encontrou ruínas escondidas entre as árvores." },
  { nome: "Vale Congelado", emoji: "❄️", texto: "Uma tempestade revelou um baú coberto de gelo." },
  { nome: "Templo Perdido", emoji: "🏛️", texto: "Símbolos antigos levaram a uma câmara secreta." },
  { nome: "Deserto Carmesim", emoji: "🏜️", texto: "Uma caravana abandonada escondia recursos." },
  { nome: "Pântano Sombrio", emoji: "🌫️", texto: "Criaturas cercaram o caminho, mas havia materiais raros." },
  { nome: "Montanha Celestial", emoji: "⛰️", texto: "No topo havia um cristal brilhante." },
]);

const CAPITULOS_RPG = Object.freeze([
  { titulo: "O chamado", texto: "Uma luz azul surgiu no céu e novos aventureiros foram escolhidos." },
  { titulo: "A floresta proibida", texto: "Pegadas desconhecidas levaram o grupo até uma passagem selada." },
  { titulo: "O despertar do rei", texto: "Um exército de esqueletos voltou a marchar durante a noite." },
  { titulo: "A chave de cristal", texto: "O artefato capaz de abrir a torre finalmente foi encontrado." },
  { titulo: "A batalha final", texto: "O caminho até o guardião do reino está aberto." },
]);

const POKEMON = Object.freeze({
  pikachu: { nome: "Pikachu", tipo: "Elétrico", raridade: "Comum", preco: 3000, evolui: "raichu", nivel: 12, sprite: 25 },
  bulbasaur: { nome: "Bulbasaur", tipo: "Planta", raridade: "Comum", preco: 2500, evolui: "venusaur", nivel: 16, sprite: 1 },
  squirtle: { nome: "Squirtle", tipo: "Água", raridade: "Comum", preco: 2500, evolui: "blastoise", nivel: 16, sprite: 7 },
  charmander: { nome: "Charmander", tipo: "Fogo", raridade: "Comum", preco: 2800, evolui: "charizard", nivel: 16, sprite: 4 },
  eevee: { nome: "Eevee", tipo: "Normal", raridade: "Comum", preco: 4500, evolui: "umbreon", nivel: 18, sprite: 133 },
  charizard: { nome: "Charizard", tipo: "Fogo/Voador", raridade: "Raro", preco: 22000, sprite: 6 },
  snorlax: { nome: "Snorlax", tipo: "Normal", raridade: "Raro", preco: 21000, sprite: 143 },
  lucario: { nome: "Lucario", tipo: "Lutador/Aço", raridade: "Raro", preco: 28000, sprite: 448 },
  gengar: { nome: "Gengar", tipo: "Fantasma/Veneno", raridade: "Raro", preco: 30000, sprite: 94 },
  greninja: { nome: "Greninja", tipo: "Água/Sombrio", raridade: "Raro", preco: 32000, sprite: 658 },
  mewtwo: { nome: "Mewtwo", tipo: "Psíquico", raridade: "Lendário", preco: 50000, sprite: 150 },
  dragonite: { nome: "Dragonite", tipo: "Dragão/Voador", raridade: "Lendário", preco: 42000, sprite: 149 },
  umbreon: { nome: "Umbreon", tipo: "Sombrio", raridade: "Evoluído", preco: 15000, sprite: 197 },
  blastoise: { nome: "Blastoise", tipo: "Água", raridade: "Evoluído", preco: 14000, sprite: 9 },
  venusaur: { nome: "Venusaur", tipo: "Planta/Veneno", raridade: "Evoluído", preco: 14000, sprite: 3 },
  raichu: { nome: "Raichu", tipo: "Elétrico", raridade: "Evoluído", preco: 15000, sprite: 26 },
});

const POKEMON_COMIDA = Object.freeze({
  berry: { nome: "Berry", emoji: "🍓", preco: 250, fome: 25 },
  superberry: { nome: "Super Berry", emoji: "🫐", preco: 500, fome: 45 },
  racaoagua: { nome: "Ração Aquática", emoji: "💧", preco: 700, fome: 60 },
  racaofogo: { nome: "Ração Flamejante", emoji: "🔥", preco: 800, fome: 60 },
  racaoplanta: { nome: "Ração Natural", emoji: "🌿", preco: 700, fome: 60 },
  racaolutador: { nome: "Ração de Combate", emoji: "🥊", preco: 1200, fome: 70 },
  sonifero: { nome: "Sonífero Deluxe", emoji: "😴", preco: 1500, fome: 80 },
  sombrio: { nome: "Essência Sombria", emoji: "🌑", preco: 1800, fome: 70 },
  mente: { nome: "Cápsula Mental", emoji: "🧠", preco: 2500, fome: 90 },
  dragao: { nome: "Banquete do Dragão", emoji: "🐉", preco: 2200, fome: 85 },
});

const PETS = Object.freeze({
  gato: { nome: "Gato", emoji: "🐱", preco: 3000, raro: false },
  cachorro: { nome: "Cachorro", emoji: "🐶", preco: 2000, raro: false },
  jabuti: { nome: "Jabuti", emoji: "🐢", preco: 1000, raro: false },
  periquito: { nome: "Periquito", emoji: "🐦", preco: 4000, raro: false },
  dragao: { nome: "Dragão", emoji: "🐲", preco: 20000, raro: false },
  dragaodourado: { nome: "Dragão Dourado", emoji: "🐉", preco: 40000, raro: true },
  fenix: { nome: "Fênix", emoji: "🔥", preco: 35000, raro: true },
  demonios: { nome: "Demônios", emoji: "😈", preco: 45000, raro: true },
  grifo: { nome: "Grifo", emoji: "🦅", preco: 38000, raro: true },
  axolote: { nome: "Axolote", emoji: "🦎", preco: 30000, raro: true },
});

const PET_COMIDAS = Object.freeze({
  racao: { nome: "Ração", emoji: "🍖", preco: 150, fome: 35, energia: 5, saude: 2, humor: 3 },
  premium: { nome: "Ração Premium", emoji: "🥩", preco: 450, fome: 60, energia: 12, saude: 8, humor: 8 },
  petisco: { nome: "Petisco", emoji: "🦴", preco: 250, fome: 20, energia: 3, saude: 1, humor: 15 },
  vitamina: { nome: "Vitamina Pet", emoji: "🧃", preco: 650, fome: 15, energia: 15, saude: 25, humor: 5 },
});

const COINS_LOJA = Object.freeze({
  cerveja: { nome: "Cerveja", emoji: "🍺", preco: 250, descricao: "Item de coleção." },
  job: { nome: "Passe Job", emoji: "💼", preco: 1800, descricao: "Bônus no próximo trabalho de coins." },
  bomba: { nome: "Bomba", emoji: "💣", preco: 3200, descricao: "Bônus na próxima tentativa de roubo." },
  arma: { nome: "Arma", emoji: "🔫", preco: 5000, descricao: "Bônus maior na próxima tentativa de roubo." },
  pocao: { nome: "Poção", emoji: "🧪", preco: 900, descricao: "Recupera saúde da cidade." },
  escudo: { nome: "Escudo", emoji: "🛡️", preco: 2200, descricao: "Bloqueia uma tentativa de roubo." },
});

const CIDADE_EMPREGOS = Object.freeze({
  entregador: { nome: "Entregador", emoji: "🛵", salario: [320, 620], energia: 12, reputacao: 1 },
  mecanico: { nome: "Mecânico", emoji: "🔧", salario: [480, 820], energia: 16, reputacao: 2 },
  paramedico: { nome: "Paramédico", emoji: "🚑", salario: [600, 980], energia: 18, reputacao: 3 },
  policial: { nome: "Policial", emoji: "👮", salario: [650, 1050], energia: 20, reputacao: 4 },
  programador: { nome: "Programador", emoji: "💻", salario: [700, 1200], energia: 14, reputacao: 2 },
  chef: { nome: "Chef", emoji: "👨‍🍳", salario: [500, 900], energia: 17, reputacao: 2 },
  piloto: { nome: "Piloto", emoji: "🏎️", salario: [850, 1450], energia: 22, reputacao: 3 },
});

const CIDADE_ITENS = Object.freeze({
  energetico: { nome: "Energético", emoji: "⚡", preco: 300, tipo: "energia", valor: 35 },
  kitmedico: { nome: "Kit Médico", emoji: "🩹", preco: 650, tipo: "saude", valor: 45 },
  sanduiche: { nome: "Sanduíche", emoji: "🥪", preco: 220, tipo: "fome", valor: 30 },
  vara: { nome: "Vara de Pesca", emoji: "🎣", preco: 1800, tipo: "equipamento", valor: 1 },
  capacete: { nome: "Capacete Reforçado", emoji: "⛑️", preco: 2400, tipo: "equipamento", valor: 1 },
  mochila: { nome: "Mochila Urbana", emoji: "🎒", preco: 1200, tipo: "equipamento", valor: 1 },
});

const CIDADE_COMIDAS = Object.freeze({
  pastel: { nome: "Pastel", emoji: "🥟", preco: 120, fome: 18, energia: 2 },
  pizza: { nome: "Pizza", emoji: "🍕", preco: 260, fome: 35, energia: 4 },
  churrasco: { nome: "Churrasco", emoji: "🥩", preco: 520, fome: 60, energia: 8 },
  salada: { nome: "Salada", emoji: "🥗", preco: 220, fome: 25, saude: 8 },
  cafe: { nome: "Café", emoji: "☕", preco: 90, fome: 5, energia: 15 },
});

const CIDADE_CASAS = Object.freeze({
  kitnet: { nome: "Kitnet", emoji: "🏠", preco: 8000, descanso: 25, aluguel: 220 },
  apartamento: { nome: "Apartamento", emoji: "🏢", preco: 18000, descanso: 38, aluguel: 520 },
  casa: { nome: "Casa", emoji: "🏡", preco: 35000, descanso: 50, aluguel: 900 },
  cobertura: { nome: "Cobertura", emoji: "🌇", preco: 75000, descanso: 65, aluguel: 1900 },
});

const CIDADE_VEICULOS = Object.freeze({
  moto: { nome: "Moto", emoji: "🏍️", preco: 9000, tanque: 40, velocidade: 68 },
  carro: { nome: "Carro", emoji: "🚗", preco: 22000, tanque: 60, velocidade: 78 },
  esportivo: { nome: "Esportivo", emoji: "🏎️", preco: 65000, tanque: 75, velocidade: 94 },
  supercarro: { nome: "Supercarro", emoji: "🚘", preco: 120000, tanque: 90, velocidade: 100 },
});

const CIDADE_EMPRESAS = Object.freeze({
  lanchonete: { nome: "Lanchonete", emoji: "🍔", preco: 25000, receita: [1200, 2300] },
  oficina: { nome: "Oficina", emoji: "🔧", preco: 42000, receita: [1900, 3400] },
  mercado: { nome: "Mercado", emoji: "🛒", preco: 65000, receita: [2800, 4800] },
  startup: { nome: "Startup", emoji: "🚀", preco: 95000, receita: [3800, 7200] },
});

const PATENTES = Object.freeze([
  [0, "Bronze I"],
  [100, "Bronze II"],
  [250, "Prata I"],
  [500, "Prata II"],
  [900, "Ouro I"],
  [1400, "Ouro II"],
  [2100, "Platina"],
  [3000, "Diamante"],
  [4500, "Mestre"],
  [6500, "Lenda"],
]);

const MARCOS = Object.freeze(PATENTES.slice(1).map(([xp]) => xp));

const numero = valor => Number(valor || 0);

function limitar(valor, min = 0, max = 100) {
  return Math.max(min, Math.min(max, numero(valor)));
}

function aleatorio(min, max) {
  const a = Math.ceil(Number(min || 0));
  const b = Math.floor(Number(max ?? min ?? 0));
  return Math.floor(Math.random() * (b - a + 1)) + a;
}

function escolher(lista = []) {
  return Array.isArray(lista) && lista.length
    ? lista[Math.floor(Math.random() * lista.length)]
    : null;
}

function sortearPonderado(lista = []) {
  const validos = lista.filter(item => Number(item?.pesoChance || item?.peso || 0) > 0);
  const total = validos.reduce((acc, item) => acc + Number(item.pesoChance || item.peso || 0), 0);
  if (!total) return escolher(lista);
  let alvo = Math.random() * total;
  for (const item of validos) {
    alvo -= Number(item.pesoChance || item.peso || 0);
    if (alvo <= 0) return item;
  }
  return validos.at(-1) || null;
}

function cidadePadrao() {
  return {
    registrada: false,
    nome: "",
    cargo: null,
    energia: 100,
    saude: 100,
    fome: 100,
    reputacao: 0,
    xp: 0,
    nivel: 1,
    saldoBanco: 0,
    salarioPendente: 0,
    inventario: {},
    casa: null,
    veiculo: null,
    empresa: null,
    combustivel: 100,
    durabilidadeVeiculo: 100,
    ultimoTrabalho: 0,
    ultimoSalario: 0,
    ultimoDescanso: 0,
    ultimoHospital: 0,
    ultimoCrime: 0,
    ultimaCorrida: 0,
    ultimaPesca: 0,
    ultimoLucroEmpresa: 0,
    peixes: [],
    parceiro: null,
    historicoBanco: [],
  };
}

function aventuraPadrao() {
  return {
    classe: null,
    vida: 100,
    energia: 100,
    materiais: { ferro: 0, madeira: 0, cristal: 0, essencia: 0 },
    armas: [],
    armaEquipada: null,
    aventuras: 0,
    vitorias: 0,
    derrotas: 0,
    capitulo: 0,
    guilda: null,
    poderExtra: 0,
    ultimaAventura: 0,
    ultimaRecuperacao: Date.now(),
    ultimoBoss: 0,
    ultimaTorre: 0,
  };
}

function normalizarCidade(usuario) {
  if (!usuario.cidade || typeof usuario.cidade !== "object") usuario.cidade = cidadePadrao();
  usuario.cidade = { ...cidadePadrao(), ...usuario.cidade };
  if (!usuario.cidade.inventario || typeof usuario.cidade.inventario !== "object") usuario.cidade.inventario = {};
  if (!Array.isArray(usuario.cidade.peixes)) usuario.cidade.peixes = [];
  if (!Array.isArray(usuario.cidade.historicoBanco)) usuario.cidade.historicoBanco = [];
  return usuario.cidade;
}

function normalizarPokemon(pokemon) {
  if (!pokemon || typeof pokemon !== "object") return pokemon;
  pokemon.fome = limitar(pokemon.fome ?? 100);
  pokemon.energia = limitar(pokemon.energia ?? 100);
  pokemon.saude = limitar(pokemon.saude ?? 100);
  pokemon.afeto = Math.max(0, numero(pokemon.afeto));
  pokemon.xp = Math.max(0, numero(pokemon.xp));
  pokemon.nivel = Math.max(1, numero(pokemon.nivel || (1 + Math.floor(pokemon.xp / 100))));
  pokemon.missoes = Math.max(0, numero(pokemon.missoes));
  pokemon.vitorias = Math.max(0, numero(pokemon.vitorias));
  if (!Array.isArray(pokemon.diario)) pokemon.diario = [];
  if (pokemon.dormindo === undefined) pokemon.dormindo = false;
  return pokemon;
}

function normalizarPet(pet) {
  if (!pet || typeof pet !== "object") return pet;
  pet.fome = limitar(pet.fome ?? 100);
  pet.energia = limitar(pet.energia ?? 100);
  pet.saude = limitar(pet.saude ?? 100);
  pet.humor = limitar(pet.humor ?? 100);
  pet.xp = Math.max(0, numero(pet.xp));
  pet.nivel = Math.max(1, numero(pet.nivel || 1));
  return pet;
}

function normalizarAventura(usuario) {
  if (!usuario.aventura || typeof usuario.aventura !== "object") usuario.aventura = aventuraPadrao();
  usuario.aventura = { ...aventuraPadrao(), ...usuario.aventura };
  if (!usuario.aventura.materiais || typeof usuario.aventura.materiais !== "object") {
    usuario.aventura.materiais = aventuraPadrao().materiais;
  }
  if (!Array.isArray(usuario.aventura.armas)) usuario.aventura.armas = [];

  const agora = Date.now();
  const ultima = Number(usuario.aventura.ultimaRecuperacao || agora);
  const recuperado = Math.floor((agora - ultima) / (3 * 60 * 1000));

  if (recuperado > 0) {
    usuario.aventura.energia = limitar(numero(usuario.aventura.energia) + recuperado);
    usuario.aventura.vida = limitar(numero(usuario.aventura.vida) + recuperado);
    usuario.aventura.ultimaRecuperacao = agora;
  }

  return usuario.aventura;
}

function garantir(ctx) {
  const grupo = ctx.dataGp?.[0];
  if (!grupo) throw new Error("Dados do grupo indisponíveis.");

  if (!grupo.economia || typeof grupo.economia !== "object") grupo.economia = { usuarios: {} };
  if (!grupo.economia.usuarios || typeof grupo.economia.usuarios !== "object") grupo.economia.usuarios = {};
  if (!grupo.rpg || typeof grupo.rpg !== "object") grupo.rpg = { usuarios: {}, guildas: {} };
  if (!grupo.rpg.usuarios || typeof grupo.rpg.usuarios !== "object") grupo.rpg.usuarios = {};
  if (!grupo.rpg.guildas || typeof grupo.rpg.guildas !== "object") grupo.rpg.guildas = {};
  if (!grupo.funcoes || typeof grupo.funcoes !== "object") grupo.funcoes = { modorpg: false, modocoins: false };

  return grupo;
}

function eco(ctx, jid = ctx.sender) {
  const grupo = garantir(ctx);
  const id = ctx.normalizar(jid);

  if (!grupo.economia.usuarios[id]) {
    grupo.economia.usuarios[id] = {
      coins: 0,
      ultimoBonusDia: null,
      chances: { minerar: 0, cassino: 0 },
      ultimoMinerar: 0,
      ultimoRoubo: 0,
      ultimoTrabalhoCoins: 0,
      ultimoCassino: 0,
      inventario: {},
      itensCoins: {},
      cidade: cidadePadrao(),
    };
  }

  const usuario = grupo.economia.usuarios[id];
  usuario.coins = Math.max(0, numero(usuario.coins));
  if (!usuario.chances || typeof usuario.chances !== "object") usuario.chances = { minerar: 0, cassino: 0 };
  if (!usuario.inventario || typeof usuario.inventario !== "object") usuario.inventario = {};
  if (!usuario.itensCoins || typeof usuario.itensCoins !== "object") usuario.itensCoins = {};
  normalizarCidade(usuario);
  return usuario;
}

function user(ctx, jid = ctx.sender) {
  const grupo = garantir(ctx);
  const id = ctx.normalizar(jid);

  if (!grupo.rpg.usuarios[id]) {
    grupo.rpg.usuarios[id] = {
      xp: 0,
      level: 1,
      patente: "Bronze I",
      bloqueado: false,
      pet: null,
      pokemon: null,
      inventarioPet: {},
      inventarioPokemon: {},
      aventura: aventuraPadrao(),
    };
  }

  const usuario = grupo.rpg.usuarios[id];
  if (!usuario.inventarioPet || typeof usuario.inventarioPet !== "object") usuario.inventarioPet = {};
  if (!usuario.inventarioPokemon || typeof usuario.inventarioPokemon !== "object") usuario.inventarioPokemon = {};
  if (usuario.pet) normalizarPet(usuario.pet);
  if (usuario.pokemon) normalizarPokemon(usuario.pokemon);
  normalizarAventura(usuario);
  usuario.level = Math.max(1, numero(usuario.level || nivelPorXp(usuario.xp)));
  usuario.patente = patente(usuario.xp);
  return usuario;
}

const salvar = ctx => ctx.setGp(ctx.dataGp);
const temRpg = ctx => Boolean(ctx.dataGp?.[0]?.funcoes?.modorpg);
const temCoins = ctx => Boolean(ctx.dataGp?.[0]?.funcoes?.modocoins);
const ambos = ctx => temRpg(ctx) && temCoins(ctx);

function patente(xp) {
  let atual = "Bronze I";
  for (const [marco, nome] of PATENTES) {
    if (numero(xp) >= marco) atual = nome;
    else break;
  }
  return atual;
}

function nivelPorXp(xp) {
  return 1 + MARCOS.filter(marco => numero(xp) >= marco).length;
}

function addXp(ctx, qtd = 1, jid = ctx.sender) {
  const usuario = user(ctx, jid);
  if (usuario.bloqueado) return { u: usuario, subiu: false, bloqueado: true, antes: usuario.patente };

  const antes = usuario.patente;
  usuario.xp = Math.max(0, numero(usuario.xp) + numero(qtd));
  usuario.level = nivelPorXp(usuario.xp);
  usuario.patente = patente(usuario.xp);
  salvar(ctx);

  return { u: usuario, subiu: antes !== usuario.patente, antes };
}

function rank(ctx, tipo = "coins") {
  const grupo = garantir(ctx);
  const origem = tipo === "coins" ? grupo.economia.usuarios : grupo.rpg.usuarios;

  return Object.entries(origem)
    .map(([jid, usuario]) => ({
      jid,
      valor: tipo === "coins" ? numero(usuario.coins) : numero(usuario.xp),
      u: usuario,
    }))
    .sort((a, b) => b.valor - a.valor);
}

function imagemPokemon(tipo) {
  const dados = POKEMON[String(tipo || "").toLowerCase()];
  return dados?.sprite
    ? "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/" + dados.sprite + ".png"
    : "";
}

function imagemPet() {
  return "";
}

function imagemRpg() {
  return "";
}

const levelImg = Object.freeze({ perfilPadrao: "", fundo: "" });
const rpgImg = Object.freeze({ padrao: "" });
const pokemonImg = Object.freeze({});
const petsImg = Object.freeze({});

function poderAventureiro(usuario) {
  const aventura = normalizarAventura(usuario);
  const classe = CLASSES_RPG[aventura.classe] || {};
  const arma = ARMAS_RPG[aventura.armaEquipada] || {};

  return Math.max(
    1,
    Math.floor(
      numero(classe.poder) +
      numero(classe.defesa) / 2 +
      numero(arma.poder) +
      numero(aventura.poderExtra) +
      numero(usuario.level) * 4
    )
  );
}

function adicionarMaterial(usuario, material, quantidade = 1) {
  const aventura = normalizarAventura(usuario);
  const id = String(material || "").toLowerCase();
  if (!Object.prototype.hasOwnProperty.call(aventura.materiais, id)) return 0;
  aventura.materiais[id] = Math.max(0, numero(aventura.materiais[id]) + numero(quantidade));
  return aventura.materiais[id];
}

function guildaDoUsuario(ctx, usuario) {
  const grupo = garantir(ctx);
  const aventura = normalizarAventura(usuario);
  return aventura.guilda ? grupo.rpg.guildas[aventura.guilda] || null : null;
}

function adicionarPontosGuilda(ctx, usuario, quantidade = 1) {
  const guilda = guildaDoUsuario(ctx, usuario);
  if (!guilda) return 0;
  guilda.pontos = Math.max(0, numero(guilda.pontos) + numero(quantidade));
  return guilda.pontos;
}

function patrimonioCidade(usuario) {
  const cidade = normalizarCidade(usuario);
  let total = numero(usuario.coins) + numero(cidade.saldoBanco);

  for (const [catalogo, item] of [
    [CIDADE_CASAS, cidade.casa],
    [CIDADE_VEICULOS, cidade.veiculo],
    [CIDADE_EMPRESAS, cidade.empresa],
  ]) {
    const id = typeof item === "string" ? item : item?.id;
    if (id && catalogo[id]) total += numero(catalogo[id].preco);
  }

  for (const [id, qtd] of Object.entries(cidade.inventario || {})) {
    total += numero(CIDADE_ITENS[id]?.preco) * numero(qtd);
  }

  return Math.floor(total);
}

module.exports = {
  CLASSES_RPG,
  ARMAS_RPG,
  BOSSES_RPG,
  AVENTURAS_RPG,
  CAPITULOS_RPG,
  POKEMON,
  POKEMON_COMIDA,
  PETS,
  PET_COMIDAS,
  COINS_LOJA,
  CIDADE_EMPREGOS,
  CIDADE_ITENS,
  CIDADE_COMIDAS,
  CIDADE_CASAS,
  CIDADE_VEICULOS,
  CIDADE_EMPRESAS,
  PATENTES,
  MARCOS,
  pokemonImg,
  petsImg,
  levelImg,
  rpgImg,
  garantir,
  eco,
  user,
  salvar,
  patente,
  imagemPet,
  imagemPokemon,
  imagemRpg,
  temRpg,
  temCoins,
  ambos,
  nivelPorXp,
  addXp,
  rank,
  normalizarCidade,
  normalizarPet,
  normalizarPokemon,
  normalizarAventura,
  aventuraPadrao,
  patrimonioCidade,
  poderAventureiro,
  adicionarMaterial,
  guildaDoUsuario,
  adicionarPontosGuilda,
  limitar,
  aleatorio,
  escolher,
  sortearPonderado,
};
