const sharp = require("sharp");

const palettes = [
  ["#081a32", "#153f67", "#91e5ff", "#c5a5ff"],
  ["#20132f", "#633260", "#ffd3ea", "#b7b6ff"],
  ["#082b2c", "#196466", "#b5fff1", "#f8d6a2"],
  ["#2b1833", "#6a3950", "#ffe1bb", "#f0a8cf"],
];

function scene(colors) {
  const [dark, light, glow, accent] = colors;
  const stars = Array.from({ length: 42 }, (_, i) => {
    const x = (83 + i * 173) % 1024;
    const y = (41 + i * i * 37) % 512;
    const radius = i % 6 === 0 ? 2.4 : 1.2;
    return `<circle cx="${x}" cy="${y}" r="${radius}" fill="${glow}" opacity="${i % 4 === 0 ? 0.85 : 0.4}"/>`;
  }).join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="512" viewBox="0 0 1024 512">
    <defs>
      <linearGradient id="sky" x2="1" y2="1"><stop stop-color="${dark}"/><stop offset=".52" stop-color="${light}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
      <radialGradient id="halo"><stop stop-color="${glow}" stop-opacity=".34"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>
      <linearGradient id="crystal" x2="1" y2="1"><stop stop-color="white"/><stop offset=".5" stop-color="${glow}"/><stop offset="1" stop-color="${accent}"/></linearGradient>
    </defs>
    <rect width="1024" height="512" fill="url(#sky)"/>
    <circle cx="256" cy="256" r="225" fill="url(#halo)"/>
    <circle cx="768" cy="256" r="225" fill="url(#halo)"/>
    ${stars}
    <path d="M-30 408 C200 320 275 340 512 256 S820 190 1054 105" fill="none" stroke="${accent}" stroke-opacity=".45" stroke-width="2"/>
    <path d="M-30 430 C205 342 280 365 512 280 S825 215 1054 130" fill="none" stroke="${glow}" stroke-opacity=".2" stroke-width="1"/>
    <circle cx="256" cy="256" r="152" fill="none" stroke="${glow}" stroke-opacity=".65" stroke-width="2"/>
    <circle cx="768" cy="256" r="152" fill="none" stroke="${glow}" stroke-opacity=".65" stroke-width="2"/>
    <circle cx="256" cy="256" r="127" fill="${dark}" fill-opacity=".54" stroke="white" stroke-opacity=".18"/>
    <circle cx="768" cy="256" r="127" fill="${dark}" fill-opacity=".54" stroke="white" stroke-opacity=".18"/>
    <path d="M256 130 L363 256 L256 382 L149 256 Z" fill="url(#crystal)" opacity=".9"/>
    <path d="M768 130 L875 256 L768 382 L661 256 Z" fill="url(#crystal)" opacity=".9"/>
    <path d="M256 130 L256 382 M149 256 L363 256 M768 130 L768 382 M661 256 L875 256" stroke="white" stroke-opacity=".65" fill="none"/>
    <path d="M512 305 C460 265 431 239 431 208 C431 173 479 157 512 195 C545 157 593 173 593 208 C593 239 564 265 512 305 Z" fill="${accent}" fill-opacity=".85" stroke="white" stroke-opacity=".85" stroke-width="3"/>
    <circle cx="512" cy="256" r="216" fill="none" stroke="white" stroke-opacity=".16" stroke-width="2"/>
  </svg>`;
}

async function createMetadinhaPair() {
  const palette = palettes[Math.floor(Math.random() * palettes.length)];
  const image = await sharp(Buffer.from(scene(palette))).png().toBuffer();
  return Promise.all([0, 512].map(left => sharp(image)
    .extract({ left, top: 0, width: 512, height: 512 })
    .png().toBuffer()));
}

module.exports = { createMetadinhaPair };
