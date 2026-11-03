# たんぼっち (β4-0)

田んぼの生き物を個体で育てる箱庭シミュレーションゲーム。

## 開発環境のセットアップ

### 必要条件
- Node.js 18以上
- npm 9以上

### インストールとローカル起動
```bash
npm install
npm run dev
```

### ビルドと型チェック
```bash
npm run build
```
`dist/` ディレクトリに本番用バンドルが生成されます。

### プレビュー
```bash
npm run preview
```

## Vercel でのデプロイ設定

1. GitHub にリポジトリを作成し、プロジェクトをプッシュします。
2. [Vercel](https://vercel.com/) にログインし、「Add New...」→「Project」から対象リポジトリを選択します。
3. 設定で以下を指定します：
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`
4. 「Deploy」をクリックしてデプロイを完了します。
