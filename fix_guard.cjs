// fix_guard.cjs
const fs = require('fs');

// 1. scene.ts の paint() に安全ガードを追加
let scene = fs.readFileSync('src/view/scene.ts', 'utf8');
if (!scene.includes("if (typeof document === 'undefined') return;")) {
  scene = scene.replace(
    'export function paint(): void {',
    'export function paint(): void {\n  if (typeof document === \'undefined\') return;'
  );
  fs.writeFileSync('src/view/scene.ts', scene, 'utf8');
}
console.log('Fixed: src/view/scene.ts');

// 2. ui.ts の toast() に安全ガードを追加
let ui = fs.readFileSync('src/view/ui.ts', 'utf8');
if (!ui.includes("if (typeof document === 'undefined') return;")) {
  ui = ui.replace(
    'export function toast(m: string): void {',
    'export function toast(m: string): void {\n  if (typeof document === \'undefined\') return;'
  );
  fs.writeFileSync('src/view/ui.ts', ui, 'utf8');
}
console.log('Fixed: src/view/ui.ts');

console.log('Guard fixes applied successfully!');