# 日常英会話 音読暗記

自分で作った会話（日本語・英文・カタカナ）を、順番どおり暗記するための Web アプリです。

## データはどこに残る？

| 内容 | 保存場所 | GitHub に載る？ |
|------|----------|-----------------|
| **会話の文章**（`data/scenarios/*.json`） | プロジェクトのファイル | ✅ **載る**（push すればバックアップになる） |
| **いいね（♥）** | ブラウザの localStorage | ❌ **載らない**（その端末・ブラウザだけ） |

Cursor は **自動で GitHub に保存してくれるわけではありません**。  
Mac 上のフォルダにファイルがある状態なので、**GitHub に push** するか、**Vercel にデプロイ**（GitHub 連携）すると、会話データを失いにくくなります。

## いま入っている会話

- `data/scenarios/01-first-friend.json` … 初めて会う友達との会話（27セリフ）
- 一覧は `data/scenarios/index.json` に登録

## 会話を追加するとき

1. `data/scenarios/` に新しい `.json` を追加（既存ファイルをコピーして中身を差し替え）
2. `data/scenarios/index.json` の `scenarios` に `{ "id": "...", "url": "..." }` を1行追加
3. GitHub に commit & push（または Vercel が GitHub 連携なら push だけで再デプロイ）

## ローカルで試す

```bash
cd "/Users/ruka/Documents/日常英会話音読暗記"
python3 -m http.server 8080
```

[http://localhost:8080](http://localhost:8080) を開く（ファイルを直接ダブルクリックだけだと読み込みが失敗することがあります）。

## GitHub + Vercel（いつものやり方）

### 1. GitHub にリポジトリを作る

[GitHub](https://github.com/new) で新規リポジトリ（例: `eikaiwa-shadowing`）を **空の状態** で作成。

### 2. 初回 push（このフォルダで）

```bash
cd "/Users/ruka/Documents/日常英会話音読暗記"
git add -A
git commit -m "feat: 音読暗記アプリの初期版"
git remote add origin https://github.com/<あなたのユーザー名>/<リポジトリ名>.git
git branch -M main
git push -u origin main
```

### 3. Vercel

1. [vercel.com](https://vercel.com) → **Add New Project**
2. 上の GitHub リポジトリを Import
3. Framework Preset は **Other** のまま（ビルドコマンド不要）
4. Deploy

以降、会話 JSON を push するたびに本番 URL が更新されます。

CLI だけで試す場合:

```bash
cd "/Users/ruka/Documents/日常英会話音読暗記"
vercel --prod
```

## 機能メモ

- 日本語だけ表示 →「答えを見る」で英文・カタカナ
- 🔊 読み上げ（ブラウザの音声）
- ♡ いいね →「いいねだけ」タブで復習
