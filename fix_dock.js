// fix_dock.js
const fs = require('fs');
const path = require('path');

const targetDir = path.basename(process.cwd()) === 'tanbocchi'
  ? process.cwd()
  : path.join(process.cwd(), 'tanbocchi');

// 1. flow.ts の修正
const flowPath = path.join(targetDir, 'src/game/flow.ts');
let flow = fs.readFileSync(flowPath, 'utf8');
flow = flow.replace(
  'if (!S.clock || S.clock.elapsedSec >= S.clock.totalSec) {',
  'if (!S.clock || S.clock.events.length === 0 || S.clock.elapsedSec >= S.clock.totalSec) {'
);
fs.writeFileSync(flowPath, flow, 'utf8');
console.log('Fixed: src/game/flow.ts');

// 2. ui.ts の修正
const uiPath = path.join(targetDir, 'src/view/ui.ts');
let ui = fs.readFileSync(uiPath, 'utf8');
ui = ui.replace(
  '} else if (!S.clock || (S.clock.elapsedSec === 0 && S.clock.paused)) {',
  '} else if (!S.clock || S.clock.events.length === 0 || S.clock.elapsedSec >= S.clock.totalSec) {'
);
fs.writeFileSync(uiPath, ui, 'utf8');
console.log('Fixed: src/view/ui.ts');

console.log('All dock fixes applied successfully!');