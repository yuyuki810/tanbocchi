#!/usr/bin/env node
// scripts/apply.mjs — Geminiの出力(バンドル)を、安全に一括適用する(依存なし)
//
// 使い方(リポジトリの直下で実行):
//   node scripts/apply.mjs incoming.txt            # ファイルから読む(推奨。UTF-8で保存すること)
//   node scripts/apply.mjs incoming.txt --dry-run  # 書き込まずに、結果だけ確認する
//   pbpaste | node scripts/apply.mjs -             # Macのクリップボードから読む
//
// 方針:
//   - すべて検証してから、一括で書き込む。1つでも失敗したら、何も書き換えない
//   - 出力が途中で切れていたら、何も書き換えない
//   - 許可された場所以外、保護されたファイルには触らない

import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'

// ---------- 設定 ----------
const ALLOWED_DIRS = ['src/', 'tests/', 'docs/']
const ALLOWED_FILES = ['CODEMAP.md', 'package.json', 'index.html', 'vite.config.ts', 'tsconfig.json']
const PROTECTED = ['tests/goldenMasterData.json'] // 基準データ。--allow-protected なしでは書き換え不可
const FORBIDDEN = ['scripts/apply.mjs'] // このスクリプト自身は書き換え不可

// ---------- 引数 ----------
const args = process.argv.slice(2)
const flags = new Set(args.filter((a) => a.startsWith('--')))
const input = args.find((a) => !a.startsWith('--') || a === '-')
const DRY = flags.has('--dry-run')
const ALLOW_PROTECTED = flags.has('--allow-protected')

const ROOT = process.cwd()
const errors = []
const warnings = []
const fail = (msg) => errors.push(msg)

// ---------- 入力 ----------
let raw
try {
  if (input === '-' || (!input && !process.stdin.isTTY)) raw = fs.readFileSync(0, 'utf8')
  else if (input) raw = fs.readFileSync(input, 'utf8')
  else {
    console.error('使い方: node scripts/apply.mjs incoming.txt [--dry-run]')
    process.exit(2)
  }
} catch (e) {
  console.error('入力を読めませんでした: ' + e.message)
  process.exit(2)
}
const lines = raw.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n').split('\n')

// ---------- 解析 ----------
const R = {
  manifest: /^=== MANIFEST ===$/,
  endManifest: /^=== END MANIFEST ===$/,
  file: /^=== FILE: (.+?) ===$/,
  endFile: /^=== END FILE ===$/,
  edit: /^=== EDIT: (.+?) ===$/,
  endEdit: /^=== END EDIT ===$/,
  del: /^=== DELETE: (.+?) ===$/,
  endBundle: /^=== END BUNDLE ===$/,
}
const isStart = (t) => R.manifest.test(t) || R.file.test(t) || R.edit.test(t) || R.del.test(t)

const ops = [] // { type, path, body, line }
let manifest = null
let sawEnd = false

for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim()
  let m
  if (R.endBundle.test(t)) {
    sawEnd = true
    break
  } else if (R.manifest.test(t)) {
    const list = []
    let closed = false
    for (i++; i < lines.length; i++) {
      const u = lines[i].trim()
      if (R.endManifest.test(u)) {
        closed = true
        break
      }
      if (isStart(u)) break
      if (u) list.push(u.replace(/^[-*]\s+/, ''))
    }
    if (!closed) fail(`${i + 1}行目付近: MANIFEST の終了マーカーがありません`)
    manifest = list
  } else if ((m = t.match(R.del))) {
    ops.push({ type: 'DELETE', path: m[1], body: [], line: i + 1 })
  } else if ((m = t.match(R.file)) || (m = t.match(R.edit))) {
    const type = R.file.test(t) ? 'FILE' : 'EDIT'
    const end = type === 'FILE' ? R.endFile : R.endEdit
    const start = i + 1
    const body = []
    let closed = false
    for (i++; i < lines.length; i++) {
      const u = lines[i].trim()
      if (end.test(u)) {
        closed = true
        break
      }
      if (isStart(u) || R.endBundle.test(u)) {
        i--
        break
      }
      body.push(lines[i])
    }
    if (!closed) fail(`${start}行目の ${type}: ${m[1]} に終了マーカーがありません(出力が途中で切れている可能性)`)
    ops.push({ type, path: m[1], body, line: start })
  }
}

if (!sawEnd) fail('「=== END BUNDLE ===」がありません。出力が途中で切れている可能性があります')
if (!manifest) fail('「=== MANIFEST ===」がありません')
if (ops.length === 0) fail('適用するファイルが見つかりません')

// ---------- パスの検証 ----------
function normalizePath(p) {
  const n = path.posix.normalize(p.replace(/\\/g, '/').replace(/^\.\//, ''))
  return n
}
const seen = new Set()
for (const op of ops) {
  const p = normalizePath(op.path)
  op.rel = p
  op.abs = path.resolve(ROOT, p)
  const inside = op.abs.startsWith(ROOT + path.sep)
  if (p.startsWith('/') || /^[A-Za-z]:/.test(p) || p.split('/').includes('..') || !inside) {
    fail(`${op.path}: リポジトリの外は指定できません`)
  } else if (FORBIDDEN.includes(p)) {
    fail(`${p}: このファイルは書き換えられません`)
  } else if (!ALLOWED_DIRS.some((d) => p.startsWith(d)) && !ALLOWED_FILES.includes(p)) {
    fail(`${p}: 許可されていない場所です(許可:${[...ALLOWED_DIRS, ...ALLOWED_FILES].join(', ')})`)
  } else if (PROTECTED.includes(p) && !ALLOW_PROTECTED) {
    fail(`${p}: 保護されたファイルです(基準データは書き換えません。意図した場合のみ --allow-protected)`)
  }
  seen.add(p)
}

// ---------- マニフェストとの照合 ----------
if (manifest) {
  const mset = new Set(manifest.map(normalizePath))
  for (const p of mset) if (!seen.has(p)) fail(`${p}: MANIFEST にあるのに、本体がありません(出力の欠け)`)
  for (const p of seen) if (!mset.has(p)) fail(`${p}: 本体があるのに、MANIFEST にありません`)
}

// ---------- 適用(メモリ上) ----------
function stripFence(body, label) {
  const nonEmpty = body.map((s, i) => [s, i]).filter(([s]) => s.trim() !== '')
  if (nonEmpty.length >= 2) {
    const [first, fi] = nonEmpty[0]
    const [last, li] = nonEmpty[nonEmpty.length - 1]
    if (/^`{3,}[\w-]*$/.test(first.trim()) && /^`{3,}$/.test(last.trim())) {
      warnings.push(`${label}: 本文を囲むコードフェンスを取り除きました`)
      return body.slice(fi + 1, li)
    }
  }
  return body
}

function parseHunks(op) {
  const hunks = []
  const b = op.body
  for (let i = 0; i < b.length; i++) {
    if (b[i].trim() === '<<<<<<< SEARCH') {
      const search = []
      const replace = []
      let stage = 0
      let i2 = i + 1
      for (; i2 < b.length; i2++) {
        const t = b[i2].trim()
        if (stage === 0 && t === '=======') stage = 1
        else if (stage === 1 && t === '>>>>>>> REPLACE') {
          stage = 2
          break
        } else (stage === 0 ? search : replace).push(b[i2])
      }
      if (stage !== 2) {
        fail(`${op.rel}: ${hunks.length + 1}番目の置換ブロックが閉じていません`)
        return hunks
      }
      if (search.every((s) => s.trim() === '')) {
        fail(`${op.rel}: ${hunks.length + 1}番目の置換ブロックの「置換前」が空です`)
        return hunks
      }
      hunks.push({ search, replace })
      i = i2
    }
  }
  if (hunks.length === 0) fail(`${op.rel}: EDIT に置換ブロックがありません`)
  return hunks
}

function findAll(tl, sl, cmp) {
  const hits = []
  for (let i = 0; i + sl.length <= tl.length; i++) {
    let ok = true
    for (let j = 0; j < sl.length; j++) if (!cmp(tl[i + j], sl[j])) { ok = false; break }
    if (ok) hits.push(i)
  }
  return hits
}

const files = new Map() // rel -> { abs, existed, eol, orig, text, deleted }
function load(op) {
  if (files.has(op.rel)) return files.get(op.rel)
  let st
  if (fs.existsSync(op.abs)) {
    const s = fs.readFileSync(op.abs, 'utf8')
    st = { abs: op.abs, existed: true, eol: s.includes('\r\n') ? '\r\n' : '\n', orig: s.replace(/\r\n/g, '\n'), text: null, deleted: false }
    st.text = st.orig
  } else {
    st = { abs: op.abs, existed: false, eol: '\n', orig: null, text: null, deleted: false }
  }
  files.set(op.rel, st)
  return st
}

if (errors.length === 0) {
  for (const op of ops) {
    const st = load(op)
    if (op.type === 'FILE') {
      const body = stripFence(op.body, op.rel)
      // 末尾の空行は1つの改行にそろえる
      let text = body.join('\n').replace(/\n+$/, '')
      st.text = text + '\n'
      st.deleted = false
    } else if (op.type === 'DELETE') {
      if (!st.existed && st.text === null) warnings.push(`${op.rel}: 存在しないファイルの削除は無視しました`)
      st.deleted = true
    } else if (op.type === 'EDIT') {
      if (st.text === null || st.deleted) {
        fail(`${op.rel}: 編集するファイルが存在しません`)
        continue
      }
      const hunks = parseHunks(op)
      let tl = st.text.split('\n')
      hunks.forEach((h, k) => {
        const label = `${op.rel}: ${k + 1}番目の置換`
        let hits = findAll(tl, h.search, (a, b) => a === b)
        let loose = false
        if (hits.length === 0) {
          hits = findAll(tl, h.search, (a, b) => a.trimEnd() === b.trimEnd())
          loose = hits.length > 0
        }
        if (hits.length === 0) {
          const head = h.search.find((s) => s.trim() !== '') ?? ''
          fail(`${label}: 「置換前」の文が、ファイルに見つかりません(先頭:「${head.trim().slice(0, 60)}」)`)
        } else if (hits.length > 1) {
          fail(`${label}: 「置換前」の文が${hits.length}か所に一致します(前後の行を足して、一意にしてください)`)
        } else {
          if (loose) warnings.push(`${label}: 行末の空白の違いを無視して一致させました`)
          tl = [...tl.slice(0, hits[0]), ...h.replace, ...tl.slice(hits[0] + h.search.length)]
        }
      })
      st.text = tl.join('\n')
    }
  }
}

// ---------- 結果の表示 ----------
const plan = []
if (errors.length === 0) {
  for (const [rel, st] of files) {
    if (st.deleted) {
      if (st.existed) plan.push({ rel, kind: '削除', st })
    } else if (!st.existed) plan.push({ rel, kind: '新規', st })
    else if (st.text !== st.orig) plan.push({ rel, kind: '変更', st })
    else plan.push({ rel, kind: '同一', st })
  }
}

if (errors.length > 0) {
  console.error(`\n✖ 適用できません(何も書き換えていません)\n`)
  for (const e of errors) console.error('  ・' + e)
  if (warnings.length) {
    console.error('\n警告:')
    for (const w of warnings) console.error('  ・' + w)
  }
  console.error('\n対処:Geminiに、上の内容を伝えて、バンドルを出し直してもらってください。')
  process.exit(1)
}

try {
  const dirty = execSync('git status --porcelain --untracked-files=no', { stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
  if (dirty) warnings.push('コミットしていない変更があります。戻せるように、先にコミットしておくことをおすすめします(戻す:git checkout .)')
} catch {
  /* gitがない場合は無視 */
}

const count = (s) => (s === null ? 0 : s.split('\n').length - 1)
console.log(DRY ? '\n— 確認のみ(書き込みません) —\n' : '\n— 適用結果 —\n')
for (const p of plan) {
  const detail = p.kind === '削除' ? '' : `(${count(p.st.text)}行)`
  console.log(`  ${p.kind}  ${p.rel} ${detail}`)
}
const n = (k) => plan.filter((p) => p.kind === k).length
console.log(`\n新規 ${n('新規')} / 変更 ${n('変更')} / 削除 ${n('削除')} / 同一(変化なし) ${n('同一')}`)
if (warnings.length) {
  console.log('\n警告:')
  for (const w of warnings) console.log('  ・' + w)
}

if (DRY) {
  console.log('\n書き込みは行っていません。')
  process.exit(0)
}

for (const p of plan) {
  if (p.kind === '同一') continue
  if (p.kind === '削除') {
    fs.rmSync(p.st.abs, { force: true })
    continue
  }
  fs.mkdirSync(path.dirname(p.st.abs), { recursive: true })
  const out = p.st.eol === '\r\n' ? p.st.text.replace(/\n/g, '\r\n') : p.st.text
  fs.writeFileSync(p.st.abs, out, 'utf8')
}

console.log('\n✔ 適用しました。次の順で確認してください:')
console.log('  1. 上の一覧が、Geminiの報告のファイル一覧と一致するか')
console.log('  2. npm test')
console.log('  3. npm run build')
console.log('  4. git status / git diff')