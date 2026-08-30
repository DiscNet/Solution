// extrair_auth.js
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode-terminal');

const cores = {
  reset: "\x1b[0m", verde: "\x1b[32m", amarelo: "\x1b[33m",
  ciano: "\x1b[36m", vermelho: "\x1b[31m", branco: "\x1b[37m"
};

async function extrairAuth() {
  console.log(`${cores.ciano}🔄 Abrindo WhatsApp Web...${cores.reset}`);
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
  });
  const page = await context.newPage();
  
  await page.goto('https://web.whatsapp.com', { waitUntil: 'domcontentloaded' });
  
  console.log(`${cores.amarelo}⏳ Aguardando QR Code... Escaneie com seu WhatsApp!${cores.reset}`);
  
  // Captura o QR Code e mostra no terminal
  const qrCanvas = await page.waitForSelector('canvas[aria-label="Scan me!"]', { timeout: 60000 });
  
  // Mostra QR no terminal também
  const qrData = await page.evaluate(() => {
    const canvas = document.querySelector('canvas[aria-label="Scan me!"]');
    if (canvas) return canvas.toDataURL();
    return null;
  });
  
  if (qrData) {
    // Tenta mostrar QR no terminal (pode não funcionar dependendo da lib)
    console.log(`${cores.ciano}📲 QR Code apareceu no navegador! Escaneie.${cores.reset}`);
  }
  
  // Aguarda o WhatsApp carregar completamente
  await page.waitForSelector('div[data-testid="chat-list"]', { timeout: 120000 });
  
  console.log(`${cores.verde}✅ WhatsApp Web conectado! Extraindo credenciais...${cores.reset}`);
  
  // Extrai TODAS as chaves do localStorage
  const authData = await page.evaluate(() => {
    const keys = [
      'WABrowserId', 'WASecretBundle', 'WAToken1', 'WAToken2',
      'WALid', 'WAWebEncKey', 'WAWebDeviceId', 'WAWebDeviceId2',
      'WAMessagingCompanion', 'WAMessagingHistory', 'WAMessagingPrekeys',
      'WASession', 'WAUserPrefs', 'WAVersion', 'WAWebSession',
      'WAWebToken', 'WAWebToken2'
    ];
    const auth = {};
    keys.forEach(key => {
      const value = localStorage.getItem(key);
      if (value) auth[key] = value;
    });
    return auth;
  });
  
  // Salva as credenciais
  const authDir = path.join(__dirname, 'auth_info');
  if (!fs.existsSync(authDir)) fs.mkdirSync(authDir, { recursive: true });
  
  fs.writeFileSync(
    path.join(authDir, 'web_auth.json'),
    JSON.stringify(authData, null, 2)
  );
  
  console.log(`${cores.verde}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
  console.log(`${cores.verde}✅ Credenciais extraídas!${cores.reset}`);
  console.log(`${cores.branco}📁 Salvo em: auth_info/web_auth.json${cores.reset}`);
  console.log(`${cores.verde}━━━━━━━━━━━━━━━━━━━━━━━━━━━━${cores.reset}`);
  
  // Mostra o conteúdo
  console.log(`${cores.ciano}📋 Credenciais:${cores.reset}`);
  console.log(JSON.stringify(authData, null, 2));
  
  await browser.close();
  console.log(`${cores.magenta}🚀 Agora execute: node index.js${cores.reset}`);
}

extrairAuth().catch(err => {
  console.log(`${cores.vermelho}❌ Erro: ${err.message}${cores.reset}`);
});
