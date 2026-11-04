// fix_ui.cjs
const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'src/view/ui.ts');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `    SHOP.map(
      (i) =>
        '<div class="shop"><div><b>' +
        i.n +
        '</b><br><span class="mu">' +
        i.d +
        '</span></div><button data-b="' +
        i.k +
        '" ' +
        (S.own[i.k] || S.money < i.p ? 'disabled' : '') +
        '>' +
        (S.own[i.k] ? '解放済み' : i.p + '円') +
        '</button></div>'
    ).join('') +`;

const replaceStr = `    SHOP.map(
      (i) => {
        const cost = typeof i.p === 'function' ? i.p(S) : i.p;
        return (
          '<div class="shop"><div><b>' +
          i.n +
          '</b><br><span class="mu">' +
          i.d +
          '</span></div><button data-b="' +
          i.k +
          '" ' +
          (S.own[i.k] || S.money < cost ? 'disabled' : '') +
          '>' +
          (S.own[i.k] ? '解放済み' : cost + '円') +
          '</button></div>'
        );
      }
    ).join('') +`;

if (content.includes(targetStr)) {
  content = content.replace(targetStr, replaceStr);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('src/view/ui.ts fixed successfully!');
} else {
  console.log('Target string not found or already fixed.');
}