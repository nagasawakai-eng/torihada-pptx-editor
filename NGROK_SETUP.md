# ngrok 固定URL 設定手順（一度だけ必要）

## この設定が必要な理由
現在のCloudflare Quick Tunnelは起動するたびにURLが変わります。
ngrokの無料プランでは「固定ドメイン」が1つ無料で使えます。
この設定を行うと、Google Sitesのページを更新せずに毎回同じURLで公開できます。

---

## 手順

### 1. ngrokアカウントを作成
https://dashboard.ngrok.com/signup にアクセスして無料アカウントを作成してください。

### 2. 認証トークンを設定
ngrokダッシュボードの「Your Authtoken」ページ：
https://dashboard.ngrok.com/get-started/your-authtoken

コピーしたトークンをコマンドプロンプトで実行：
```
C:\Users\長澤開\AppData\Local\Microsoft\WinGet\Packages\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\ngrok.exe config add-authtoken YOUR_TOKEN_HERE
```

### 3. 無料の固定ドメインを取得
https://dashboard.ngrok.com/domains

「New Domain」をクリックすると、無料の固定ドメイン（例：`random-word-1234.ngrok-free.app`）が発行されます。

### 4. 設定ファイルに固定ドメインを追加
`%LOCALAPPDATA%\ngrok\ngrok.yml` をメモ帳で開き、以下を追加：
```yaml
static_domain: YOUR-DOMAIN.ngrok-free.app
```

保存後、サーバーを再起動すると固定URLが使われます。

### 5. Google Sitesのembedを一度だけ更新
固定URLで起動したら、Google Sitesのページ編集画面で：
- 埋め込みウィジェットをクリック
- 「編集」をクリック
- URLを `https://YOUR-DOMAIN.ngrok-free.app/view` に変更
- 保存・公開

---

## 現在の状況

サーバー起動時に `tunnel_url.txt` に現在のURLが書き込まれます。
ngrokが設定されていない間は、Cloudflare Quick Tunnelが自動的に使われます。
