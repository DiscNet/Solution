const LOGO = [
  '', '', '', '',
  '              ██████╗ ██████╗ ██╗███╗   ███╗███╗   ███╗',
  '             ██╔════╝ ██╔══██╗██║████╗ ████║████╗ ████║',
  '             ██║  ███╗██████╔╝██║██╔████╔██║██╔████╔██║',
  '             ██║   ██║██╔══██╗██║██║╚██╔╝██║██║╚██╔╝██║',
  '             ╚██████╔╝██║  ██║██║██║ ╚═╝ ██║██║ ╚═╝ ██║',
  '              ╚═════╝ ╚═╝  ╚═╝╚═╝╚═╝     ╚═╝╚═╝     ╚═╝',
  '     ', ''
].join('\n');
const SEPARATOR = '   ' + '█'.repeat(64);

function clean(value) {
  return String(value ?? '')
    .replace(/\x1b(?:\[[0-?]*[ -/]*[@-~]|\][^\x07]*(?:\x07|\x1b\\))/g, '')
    .replace(/[\x00-\x1f\x7f-\x9f]/g, ' ').trim().slice(0, 180);
}
function field(label, value) {
  const text = clean(value);
  return label + (text ? ' ' + text : '');
}
function startup({ bot = '', owner = '', number = '', commands = '' } = {}) {
  return [LOGO, field(' ! Bot:', bot), field(' ! Dono:', owner),
    field(' ! número:', number), field(" ! CMD'S:", commands), '', '', SEPARATOR, '', ''].join('\n') + '\n';
}
function command({ name = '', user = '', group = '' } = {}) {
  return ['     + Comando usado!',
    field('    ~ Comando:', name), field('    ~ Usuário:', user), field('      ~ Grupo:', group), '', ''].join('\n') + '\n';
}

module.exports = { LOGO, SEPARATOR, clean, startup, command };
