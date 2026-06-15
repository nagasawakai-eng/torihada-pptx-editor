require('dotenv').config(); // .env ファイルを読み込む
const express = require('express');
const AdmZip = require('adm-zip');
const path = require('path');
const fs = require('fs');
const http = require('http');
const crypto = require('crypto');

const app = express();
app.set('trust proxy', 1);
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true }));

// ─── Google Sites / iframe 埋め込み対応 ───
app.use((req, res, next) => {
  res.setHeader('Content-Security-Policy', "frame-ancestors *");
  res.removeHeader('X-Frame-Options');
  next();
});

// ─── トークンベース認証 ───
const AUTH_CONFIG_PATH = path.join(__dirname, 'auth.config.json');

function generateToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function loadOrCreateTokens() {
  // Railway等で環境変数が設定されている場合はそちらを優先
  if (process.env.ADMIN_TOKEN) {
    return {
      admin:  process.env.ADMIN_TOKEN,
      editor: process.env.EDITOR_TOKEN || generateToken(),
      viewer: process.env.VIEWER_TOKEN || generateToken(),
    };
  }
  // ローカル: ファイルから読み込み or 新規生成
  let cfg = {};
  try {
    if (fs.existsSync(AUTH_CONFIG_PATH)) {
      cfg = JSON.parse(fs.readFileSync(AUTH_CONFIG_PATH, 'utf8'));
    }
  } catch(e) {}
  if (!cfg.admin)  cfg.admin  = generateToken();
  if (!cfg.editor) cfg.editor = generateToken();
  if (!cfg.viewer) cfg.viewer = generateToken();
  fs.writeFileSync(AUTH_CONFIG_PATH, JSON.stringify(cfg, null, 2));
  return cfg;
}

const TOKENS = loadOrCreateTokens();

function getRole(token) {
  if (!token) return null;
  if (token === TOKENS.admin)  return 'admin';
  if (token === TOKENS.editor) return 'editor';
  if (token === TOKENS.viewer) return 'viewer';
  return null;
}

function extractToken(req) {
  const auth = req.headers['authorization'];
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return req.query.token || null;
}

function requireRole(...roles) {
  return (req, res, next) => {
    const token = extractToken(req);
    const role = getRole(token);
    if (!role || (roles.length > 0 && !roles.includes(role))) {
      if (req.path.startsWith('/api/')) {
        return res.status(403).json({ error: '権限がありません' });
      }
      return res.status(403).send(accessDeniedHtml());
    }
    req.role = role;
    next();
  };
}

function requireEditor(req, res, next) {
  return requireRole('editor', 'admin')(req, res, next);
}

function accessDeniedHtml() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>アクセス拒否 - TORIHADA</title>
<style>
  * { box-sizing:border-box; margin:0; padding:0; }
  body { display:flex; align-items:center; justify-content:center; min-height:100vh;
         background:#f7f8fa; font-family:-apple-system,'Hiragino Sans',sans-serif; }
  .card { text-align:center; padding:48px 40px; background:white; border-radius:16px;
          box-shadow:0 4px 24px rgba(0,0,0,0.1); max-width:360px; }
  h1 { font-size:17px; color:#1a202c; margin-bottom:10px; font-weight:700; }
  p  { font-size:13px; color:#718096; line-height:1.6; }
</style>
</head>
<body>
<div class="card">
  <div style="font-size:52px;margin-bottom:16px;">🔒</div>
  <h1>招待リンクが必要です</h1>
  <p>このページにアクセスするには<br>管理者から共有リンクを受け取ってください</p>
</div>
</body>
</html>`;
}

// ─── ルートアクセス制御 ───
// HTMLページはクライアント側でトークン検証するためサーバー側は制限なし
// （URLクリーンアップ後のリロードでも正常動作するよう）
// API エンドポイントは各ルートで個別に requireRole / requireEditor で保護
app.use((req, res, next) => {
  next();
});

// ─── バージョン情報（デプロイ検知用） ───
const SERVER_START_TIME = Date.now();
app.get('/api/version', (req, res) => {
  res.json({ version: SERVER_START_TIME });
});

// ─── 現在のロール取得 API ───
app.get('/api/me', (req, res) => {
  const token = extractToken(req);
  const role = getRole(token);
  res.json({ role: role || null });
});

// ─── シェアリンク管理 API（管理者のみ） ───
app.get('/api/tokens', requireRole('admin'), (req, res) => {
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  const base  = `${proto}://${host}`;
  res.json({
    admin:  { url: `${base}/?token=${TOKENS.admin}`,  role: 'admin'  },
    editor: { url: `${base}/?token=${TOKENS.editor}`, role: 'editor' },
    viewer: { url: `${base}/?token=${TOKENS.viewer}`,  role: 'viewer' },
  });
});

app.post('/api/tokens/regenerate', requireRole('admin'), (req, res) => {
  const { role } = req.body;
  if (!['editor', 'viewer'].includes(role)) {
    return res.status(400).json({ error: '無効なロールです' });
  }
  TOKENS[role] = generateToken();
  if (!process.env.ADMIN_TOKEN) {
    try { fs.writeFileSync(AUTH_CONFIG_PATH, JSON.stringify(TOKENS, null, 2)); } catch(e) {}
  }
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  const base  = `${proto}://${host}`;
  res.json({ token: TOKENS[role], url: `${base}/?token=${TOKENS[role]}` });
});

app.use(express.static(path.join(__dirname, 'public')));

const PREVIEW_DIR = process.env.PREVIEW_DIR || path.join(__dirname, 'preview');

// ─── 週設定 ───
const WEEKS_CONFIG_PATH = path.join(__dirname, 'weeks.config.json');

function loadWeeksConfig() {
  try {
    if (fs.existsSync(WEEKS_CONFIG_PATH)) {
      return JSON.parse(fs.readFileSync(WEEKS_CONFIG_PATH, 'utf8'));
    }
  } catch(e) {}
  return { weeks: [{ id: 'week1', label: '第1週', file: 'TORIHADA_第1週_研修資料_v2.pptx' }] };
}

function resolveWeekPaths(weekId) {
  const config = loadWeeksConfig();
  const week = config.weeks.find(w => w.id === weekId);
  if (!week) return null;
  const pptxPath = week.file ? path.join(__dirname, week.file) : null;
  const exists   = pptxPath ? fs.existsSync(pptxPath) : false;
  return {
    week,
    pptxPath,
    exists,
    previewDir:    path.join(__dirname, 'preview', weekId),
    backupPath:    pptxPath ? pptxPath.replace(/\.pptx$/i, '_backup.pptx') : null,
    changelogPath: path.join(__dirname, weekId === 'week1' ? 'change_log.json' : `change_log_${weekId}.json`),
  };
}

function getWeekId(req) {
  return req.query.weekId || (req.body && req.body.weekId) || 'week1';
}

// ─── 週一覧 API ───
app.get('/api/weeks', (req, res) => {
  const config = loadWeeksConfig();
  const weeks = config.weeks.map(w => {
    const pptxPath   = w.file ? path.join(__dirname, w.file) : null;
    const previewDir = path.join(__dirname, 'preview', w.id);
    const hasFile    = pptxPath ? fs.existsSync(pptxPath) : false;
    let previewCount = 0;
    try { previewCount = fs.readdirSync(previewDir).filter(f => /\.(png|jpg)$/i.test(f)).length; } catch(e) {}
    return { ...w, hasFile, previewCount };
  });
  res.json({ success: true, weeks });
});

// ─── 週ラベル変更（管理者のみ） ───
app.patch('/api/weeks/:weekId', requireRole('admin'), (req, res) => {
  const { weekId } = req.params;
  const { label } = req.body;
  if (!label || !label.trim()) return res.status(400).json({ error: 'ラベルが空です' });
  const config = loadWeeksConfig();
  const week = config.weeks.find(w => w.id === weekId);
  if (!week) return res.status(404).json({ error: '週が見つかりません' });
  week.label = label.trim();
  fs.writeFileSync(WEEKS_CONFIG_PATH, JSON.stringify(config, null, 2));
  res.json({ success: true, week });
});

// ─── 週の追加（管理者のみ） ───
app.post('/api/weeks', requireRole('admin'), (req, res) => {
  const config = loadWeeksConfig();
  const existing = config.weeks.map(w => w.id);
  // 連番でIDを生成
  let n = config.weeks.length + 1;
  while (existing.includes(`week${n}`)) n++;
  const newWeek = { id: `week${n}`, label: `第${n}週`, file: null };
  config.weeks.push(newWeek);
  fs.writeFileSync(WEEKS_CONFIG_PATH, JSON.stringify(config, null, 2));
  res.json({ success: true, week: newWeek });
});

// ─── 週の削除（管理者のみ） ───
app.delete('/api/weeks/:weekId', requireRole('admin'), (req, res) => {
  const { weekId } = req.params;
  if (weekId === 'week1') return res.status(400).json({ error: '第1週は削除できません' });
  const config = loadWeeksConfig();
  const idx = config.weeks.findIndex(w => w.id === weekId);
  if (idx === -1) return res.status(404).json({ error: '週が見つかりません' });
  config.weeks.splice(idx, 1);
  fs.writeFileSync(WEEKS_CONFIG_PATH, JSON.stringify(config, null, 2));
  res.json({ success: true });
});

// ─── PPTXファイルアップロード（管理者のみ） ───
app.post('/api/weeks/:weekId/upload',
  requireRole('admin'),
  express.raw({ type: 'application/vnd.openxmlformats-officedocument.presentationml.presentation', limit: '200mb' }),
  (req, res) => {
    const { weekId } = req.params;
    const config = loadWeeksConfig();
    const week = config.weeks.find(w => w.id === weekId);
    if (!week) return res.status(404).json({ error: '週が見つかりません' });
    const filename = `TORIHADA_${week.label}_研修資料.pptx`;
    const destPath = path.join(__dirname, filename);
    try {
      fs.writeFileSync(destPath, req.body);
      // weeks.config.json を更新
      week.file = filename;
      fs.writeFileSync(WEEKS_CONFIG_PATH, JSON.stringify(config, null, 2));
      res.json({ success: true, file: filename });
    } catch(e) {
      res.status(500).json({ error: e.message });
    }
  }
);

// ─── プレビュー生成（管理者のみ） ───
app.post('/api/weeks/:weekId/generate-preview', requireEditor, (req, res) => {
  const { weekId } = req.params;
  const ctx = resolveWeekPaths(weekId);
  if (!ctx || !ctx.pptxPath || !ctx.exists) {
    return res.status(404).json({ error: 'PPTXファイルがありません' });
  }
  const soffice = process.platform === 'win32'
    ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
    : 'soffice';
  const { execFile } = require('child_process');
  const os = require('os');
  const tmpDir = path.join(os.tmpdir(), `preview_gen_${weekId}`);
  fs.mkdirSync(tmpDir, { recursive: true });
  const pptxName = path.basename(ctx.pptxPath);
  const pdfName  = pptxName.replace(/\.pptx$/i, '.pdf');
  const pdfPath  = path.join(tmpDir, pdfName);

  execFile(soffice, ['--headless', '--convert-to', 'pdf', '--outdir', tmpDir, ctx.pptxPath],
    { timeout: 120000 }, (err) => {
      if (err) return res.status(500).json({ error: 'PDF変換失敗: ' + err.message });
      if (!fs.existsSync(pdfPath)) return res.status(500).json({ error: 'PDFが生成されませんでした' });
      fs.mkdirSync(ctx.previewDir, { recursive: true });
      // 古いプレビューを削除
      try { fs.readdirSync(ctx.previewDir).forEach(f => fs.unlinkSync(path.join(ctx.previewDir, f))); } catch(e) {}
      const outPrefix = path.join(ctx.previewDir, 'slide');
      execFile('pdftoppm', ['-png', '-r', '150', pdfPath, outPrefix],
        { timeout: 180000 }, (err2) => {
          try { fs.rmSync(tmpDir, { recursive: true }); } catch(e) {}
          if (err2) return res.status(500).json({ error: '画像変換失敗: ' + err2.message });
          // ファイル名を slide_01.png 形式にリネーム
          try {
            const files = fs.readdirSync(ctx.previewDir).sort();
            files.forEach(f => {
              const m = f.match(/slide-(\d+)\.png$/i);
              if (m) {
                const n = parseInt(m[1]);
                const newName = `slide_${String(n).padStart(2, '0')}.png`;
                fs.renameSync(path.join(ctx.previewDir, f), path.join(ctx.previewDir, newName));
              }
            });
          } catch(e) {}
          res.json({ success: true });
        });
    });
});

// ─── HTMLスライドビューワー（認証不要・Google Sites対応） ───
app.get('/view', (req, res) => {
  // Cloudflare経由でもhttps://で絶対URLを生成
  const proto = req.headers['x-forwarded-proto'] || req.protocol;
  const host  = req.headers['x-forwarded-host']  || req.get('host');
  const baseUrl = `${proto}://${host}`;
  // プレビュー画像一覧を取得
  let previewFiles = [];
  try {
    previewFiles = fs.readdirSync(PREVIEW_DIR)
      .filter(f => /^slide_\d+\.png$/.test(f))
      .sort((a, b) => {
        const na = parseInt(a.match(/\d+/)[0]);
        const nb = parseInt(b.match(/\d+/)[0]);
        return na - nb;
      });
  } catch(e) {}

  // スライドタイトルをPPTXから取得
  let slideTitles = {};
  try {
    const slides = parsePptx(PPTX_PATH);
    slides.forEach(s => {
      const titleShape = s.shapes.find(sh => sh.isTitle);
      if (titleShape && titleShape.paragraphs.length > 0) {
        const text = titleShape.paragraphs[0].runs.map(r => r.text).join('').trim();
        if (text) slideTitles[s.slideNum] = text;
      }
    });
  } catch(e) {}

  const totalSlides = previewFiles.length;

  const navItems = previewFiles.map((file, i) => {
    const n = parseInt(file.match(/\d+/)[0]);
    const title = slideTitles[n] || `スライド ${n}`;
    return `<li><a href="#slide${n}" class="nav-link" title="${title}"><span class="nav-num">${n}</span><span class="nav-title">${title}</span></a></li>`;
  }).join('');

  // JS fetch で遅延読み込み（軽量HTML + iframe内でも動作）
  const slideItems = previewFiles.map((file, i) => {
    const n = parseInt(file.match(/\d+/)[0]);
    const title = slideTitles[n] || `スライド ${n}`;
    return `
    <div class="slide-card" id="slide${n}">
      <div class="slide-header">
        <span class="slide-badge">SLIDE ${n} / ${totalSlides}</span>
        <span class="slide-title-text">${title}</span>
      </div>
      <div class="slide-img-wrap">
        <img src="/preview/${file}" alt="${title}" class="slide-img">
      </div>
    </div>`;
  }).join('');

  res.send(`<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>TORIHADA 研修資料</title>
<style>
* { box-sizing: border-box; margin: 0; padding: 0; }
:root {
  --pink: #FF4DB8;
  --dark: #264653;
  --pink-light: #FFB3E0;
  --bg: #f7f8fc;
}
html, body { height: 100%; }
body {
  font-family: 'Hiragino Kaku Gothic ProN', 'Meiryo', sans-serif;
  background: var(--bg);
  color: var(--dark);
  display: flex;
  flex-direction: column;
  height: 100vh;
  overflow: hidden;
}

/* ヘッダー */
.top-bar {
  background: var(--dark);
  color: white;
  padding: 0 24px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-shrink: 0;
  box-shadow: 0 2px 12px rgba(0,0,0,0.2);
}
.top-bar-left { display: flex; align-items: center; gap: 12px; }
.logo-badge {
  background: var(--pink);
  color: white;
  font-size: 12px; font-weight: 800;
  padding: 4px 12px; border-radius: 20px;
  letter-spacing: 0.08em;
}
.top-title { font-size: 14px; font-weight: 700; letter-spacing: 0.04em; }
.top-count { font-size: 12px; color: var(--pink-light); }

/* レイアウト */
.layout {
  display: flex;
  flex: 1;
  overflow: hidden;
}

/* サイドバー（Google Sites iframe内では非表示） */
.sidebar {
  display: none;
}
.sidebar-head {
  padding: 12px 16px;
  font-size: 10px;
  font-weight: 700;
  color: #9aa3b0;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  background: #f7f8fc;
  border-bottom: 1px solid #e8ecf0;
  flex-shrink: 0;
}
.nav-list {
  list-style: none;
  overflow-y: auto;
  flex: 1;
}
.nav-link {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 9px 14px;
  text-decoration: none;
  color: var(--dark);
  border-bottom: 1px solid #f5f7fa;
  transition: background 0.15s;
  font-size: 12px;
}
.nav-link:hover { background: #fff0f8; }
.nav-num {
  width: 24px; height: 24px;
  background: #edf0f5;
  border-radius: 6px;
  display: flex; align-items: center; justify-content: center;
  font-size: 10px; font-weight: 700; color: #4a5568;
  flex-shrink: 0;
}
.nav-title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #555;
}

/* メインコンテンツ */
.main-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
  display: flex;
  flex-direction: column;
  gap: 24px;
}

/* スライドカード */
.slide-card {
  background: white;
  border-radius: 14px;
  box-shadow: 0 2px 16px rgba(38,70,83,0.08);
  overflow: hidden;
  scroll-margin-top: 16px;
  transition: box-shadow 0.2s;
}
.slide-card:hover { box-shadow: 0 4px 24px rgba(38,70,83,0.14); }
.slide-header {
  background: var(--dark);
  color: white;
  padding: 12px 20px;
  display: flex;
  align-items: center;
  gap: 12px;
}
.slide-badge {
  background: var(--pink);
  color: white;
  font-size: 10px; font-weight: 800;
  padding: 3px 10px; border-radius: 20px;
  letter-spacing: 0.06em;
  flex-shrink: 0;
}
.slide-title-text {
  font-size: 13px; font-weight: 600;
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
}
.slide-img-wrap {
  padding: 0;
  background: #f0f2f5;
}
.slide-img-wrap img {
  width: 100%;
  display: block;
  border: none;
}

/* スクロールバー */
::-webkit-scrollbar { width: 6px; }
::-webkit-scrollbar-track { background: #f0f2f5; }
::-webkit-scrollbar-thumb { background: #c8d0db; border-radius: 3px; }
::-webkit-scrollbar-thumb:hover { background: var(--pink); }
</style>
</head>
<body>

<div class="top-bar">
  <div class="top-bar-left">
    <span class="logo-badge">🐦 TORIHADA</span>
    <span class="top-title">第1週 研修資料</span>
  </div>
  <span class="top-count">全 ${totalSlides} スライド</span>
</div>

<div class="layout">
  <nav class="sidebar">
    <div class="sidebar-head">スライド一覧</div>
    <ul class="nav-list">${navItems}</ul>
  </nav>

  <main class="main-content">
    ${slideItems}
  </main>
</div>

<script>
// アクティブナビ
const observer = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      const id = e.target.id;
      document.querySelectorAll('.nav-link').forEach(a => {
        a.style.background = '';
        a.querySelector('.nav-num').style.background = '';
        a.querySelector('.nav-num').style.color = '';
      });
      const active = document.querySelector('.nav-link[href="#' + id + '"]');
      if (active) {
        active.style.background = '#fff0f8';
        active.querySelector('.nav-num').style.background = '#FF4DB8';
        active.querySelector('.nav-num').style.color = 'white';
      }
    }
  });
}, { threshold: 0.3 });

document.querySelectorAll('.slide-card').forEach(c => observer.observe(c));

// 画像は loading="lazy" で自動遅延読み込み（ブラウザネイティブ）
</script>

</body>
</html>`);
});

// スライドプレビュー画像を配信（週別 → 旧パスの順でフォールバック）
function sendPreview(res, ...candidates) {
  for (const p of candidates) {
    if (p && fs.existsSync(p)) {
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      return res.sendFile(p);
    }
  }
  res.status(404).send('not found');
}

app.get('/preview/:weekId/:filename', (req, res) => {
  const { weekId, filename } = req.params;
  sendPreview(res,
    path.join(__dirname, 'preview', weekId, filename),          // 新パス: preview/week1/slide_01.png
    path.join(__dirname, 'preview', filename),                   // 旧パス: preview/slide_01.png (既存ファイル)
    path.join(PREVIEW_DIR || path.join(__dirname,'preview'), filename) // env var指定パス
  );
});

app.get('/preview/:filename', (req, res) => {
  const { filename } = req.params;
  sendPreview(res,
    path.join(__dirname, 'preview', 'week1', filename),          // 新パス
    path.join(__dirname, 'preview', filename),                   // 旧パス
    path.join(PREVIEW_DIR || path.join(__dirname,'preview'), filename)
  );
});

// デフォルト(week1)パス — /view と PDF等の一部で使用
const PPTX_PATH   = process.env.PPTX_PATH   || path.join(__dirname, 'TORIHADA_第1週_研修資料_v2.pptx');
const BACKUP_PATH = PPTX_PATH.replace(/\.pptx$/i, '_backup.pptx');

// PPTXからスライドテキストを解析
function parsePptx(filePath) {
  const zip = new AdmZip(filePath);
  const slides = [];

  const entries = zip.getEntries()
    .filter(e => e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/))
    .sort((a, b) => {
      const na = parseInt(a.entryName.match(/\d+/)[0]);
      const nb = parseInt(b.entryName.match(/\d+/)[0]);
      return na - nb;
    });

  for (const entry of entries) {
    const xml = entry.getData().toString('utf8');
    const slideNum = parseInt(entry.entryName.match(/slide(\d+)\.xml/)[1]);
    const shapes = extractShapes(xml);
    slides.push({ slideNum, entryName: entry.entryName, shapes });
  }

  return slides;
}

// XMLからテキスト形状を抽出
function extractShapes(xml) {
  const shapes = [];
  const spRegex = /<p:sp[\s>][\s\S]*?<\/p:sp>/g;
  let spMatch;
  let shapeIdx = 0;

  while ((spMatch = spRegex.exec(xml)) !== null) {
    const spXml = spMatch[0];

    // タイトルかどうか判定
    const isTitle = /<p:ph[^>]*type="title"/.test(spXml) || /<p:ph[^>]*type="ctrTitle"/.test(spXml);

    // テキストボックス名を取得
    const nameMatch = spXml.match(/<p:cNvPr[^>]*name="([^"]+)"/);
    const name = nameMatch ? nameMatch[1] : `Shape ${shapeIdx + 1}`;

    // 段落を抽出
    const paragraphs = [];
    const pRegex = /<a:p[\s>][\s\S]*?<\/a:p>/g;
    let pMatch;
    let paraIdx = 0;

    while ((pMatch = pRegex.exec(spXml)) !== null) {
      const pXml = pMatch[0];
      const runs = [];
      const rRegex = /<a:r[\s>][\s\S]*?<\/a:r>/g;
      let rMatch;
      let runIdx = 0;

      while ((rMatch = rRegex.exec(pXml)) !== null) {
        const rXml = rMatch[0];
        const tMatch = rXml.match(/<a:t>([\s\S]*?)<\/a:t>/);
        if (tMatch) {
          runs.push({ runIdx, text: tMatch[1] });
        }
        runIdx++;
      }

      if (runs.length > 0) {
        paragraphs.push({ paraIdx, runs });
      }
      paraIdx++;
    }

    if (paragraphs.length > 0) {
      shapes.push({ shapeIdx, name, isTitle, paragraphs });
    }
    shapeIdx++;
  }

  return shapes;
}

// テキストをXMLに適用
function applyEdits(filePath, edits) {
  const zip = new AdmZip(filePath);

  for (const edit of edits) {
    const entry = zip.getEntry(edit.entryName);
    if (!entry) continue;

    let xml = entry.getData().toString('utf8');

    // 各形状の各段落の各ランを更新
    let shapeIdx = 0;
    xml = xml.replace(/<p:sp[\s>][\s\S]*?<\/p:sp>/g, (spXml) => {
      const shapeEdit = edit.shapes.find(s => s.shapeIdx === shapeIdx);
      shapeIdx++;
      if (!shapeEdit) return spXml;

      let paraIdx = 0;
      return spXml.replace(/<a:p[\s>][\s\S]*?<\/a:p>/g, (pXml) => {
        const paraEdit = shapeEdit.paragraphs.find(p => p.paraIdx === paraIdx);
        paraIdx++;
        if (!paraEdit) return pXml;

        let runIdx = 0;
        return pXml.replace(/<a:r[\s>][\s\S]*?<\/a:r>/g, (rXml) => {
          const runEdit = paraEdit.runs.find(r => r.runIdx === runIdx);
          runIdx++;
          if (!runEdit) return rXml;

          return rXml.replace(/<a:t>([\s\S]*?)<\/a:t>/, `<a:t>${escapeXml(runEdit.text)}</a:t>`);
        });
      });
    });

    zip.updateFile(edit.entryName, Buffer.from(xml, 'utf8'));
  }

  return zip.toBuffer();
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ────── 視覚レイアウトエディター ──────

// スライドXMLから全要素の位置・サイズを抽出
function extractElementPositions(xml) {
  const els = [];
  function getXfrm(src) {
    const o = src.match(/<a:off x="(-?\d+)" y="(-?\d+)"/);
    const e = src.match(/<a:ext cx="(\d+)" cy="(\d+)"/);
    if (!o || !e) return null;
    return { x: +o[1], y: +o[2], cx: +e[1], cy: +e[2] };
  }
  // テキストシェイプ
  let si = 0;
  for (const m of xml.matchAll(/<p:sp[\s>][\s\S]*?<\/p:sp>/g)) {
    const pos = getXfrm(m[0]);
    if (pos) {
      const nm = m[0].match(/<p:cNvPr[^>]*name="([^"]+)"/);
      const txt = [...m[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
        .map(t => t[1]).join('').replace(/\s+/g, ' ').trim().substring(0, 28);
      els.push({ idx: si, type: 'shape', name: nm ? nm[1] : `テキスト${si+1}`, text: txt, ...pos });
    }
    si++;
  }
  // ピクチャー
  let pi = 0;
  for (const m of xml.matchAll(/<p:pic[\s>][\s\S]*?<\/p:pic>/g)) {
    const pos = getXfrm(m[0]);
    if (pos) {
      const nm = m[0].match(/<p:cNvPr[^>]*name="([^"]+)"/);
      els.push({ idx: pi, type: 'picture', name: nm ? nm[1] : `画像${pi+1}`, text: '🖼 画像', ...pos });
    }
    pi++;
  }
  return els;
}

// 要素の位置をXMLに反映
function patchElementPositions(filePath, entryName, updates) {
  const zip = new AdmZip(filePath);
  const entry = zip.getEntry(entryName);
  if (!entry) throw new Error(`Entry not found: ${entryName}`);
  let xml = entry.getData().toString('utf8');

  function patchEl(elXml, upd) {
    return elXml
      .replace(/<a:off x="-?\d+" y="-?\d+"/, `<a:off x="${upd.x}" y="${upd.y}"`)
      .replace(/<a:ext cx="\d+" cy="\d+"/, `<a:ext cx="${upd.cx}" cy="${upd.cy}"`);
  }
  const shapeUpds = updates.filter(u => u.type === 'shape');
  let si = 0;
  xml = xml.replace(/<p:sp[\s>][\s\S]*?<\/p:sp>/g, m => {
    const idx = si++;  // ← find の外で1回だけインクリメント（バグ修正）
    const u = shapeUpds.find(u => u.idx === idx);
    return u ? patchEl(m, u) : m;
  });
  const picUpds = updates.filter(u => u.type === 'picture');
  let pi = 0;
  xml = xml.replace(/<p:pic[\s>][\s\S]*?<\/p:pic>/g, m => {
    const idx = pi++;  // ← find の外で1回だけインクリメント（バグ修正）
    const u = picUpds.find(u => u.idx === idx);
    return u ? patchEl(m, u) : m;
  });
  zip.updateFile(entryName, Buffer.from(xml, 'utf8'));
  return zip.toBuffer();
}

// API: 要素ポジション取得
app.get('/api/slide-positions/:slideNum', (req, res) => {
  const ctx = resolveWeekPaths(getWeekId(req)) || resolveWeekPaths('week1');
  if (!ctx || !ctx.pptxPath || !ctx.exists) return res.status(404).json({ success: false, error: 'PPTXファイルがありません' });
  try {
    const slideNum = parseInt(req.params.slideNum);
    const entryName = `ppt/slides/slide${slideNum}.xml`;
    const zip = new AdmZip(ctx.pptxPath);
    const entry = zip.getEntry(entryName);
    if (!entry) return res.status(404).json({ success: false, error: 'slide not found' });
    const xml = entry.getData().toString('utf8');
    const elements = extractElementPositions(xml);
    res.json({ success: true, entryName, elements });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: 要素ポジション更新
app.post('/api/update-positions', requireEditor, (req, res) => {
  const ctx = resolveWeekPaths(getWeekId(req)) || resolveWeekPaths('week1');
  if (!ctx || !ctx.pptxPath || !ctx.exists) return res.status(404).json({ success: false, error: 'PPTXファイルがありません' });
  try {
    const { entryName, updates } = req.body;
    if (!updates || !Array.isArray(updates)) return res.status(400).json({ success: false, error: 'updates が不正です' });

    // ── デバッグ: 受信した更新内容をログ出力 ──
    const movedEls = updates.filter(u => {
      // ドラッグで変更された可能性のある要素のみ表示（移動が多いもの）
      return true;
    });
    console.log(`[update-positions] ${entryName} / updates count: ${updates.length}`);
    updates.slice(0, 5).forEach(u => {
      console.log(`  ${u.type}[${u.idx}] "${u.name}" x=${u.x} y=${u.y} cx=${u.cx} cy=${u.cy}`);
    });

    if (!fs.existsSync(ctx.backupPath)) fs.copyFileSync(ctx.pptxPath, ctx.backupPath);
    const buf = patchElementPositions(ctx.pptxPath, entryName, updates);
    fs.writeFileSync(ctx.pptxPath, buf);

    // ── デバッグ: 書き込み後の実際の位置を確認 ──
    try {
      const AdmZip2 = require('adm-zip');
      const zip2 = new AdmZip2(ctx.pptxPath);
      const entry2 = zip2.getEntry(entryName);
      if (entry2) {
        const xmlAfter = entry2.getData().toString('utf8');
        const elsAfter = extractElementPositions(xmlAfter);
        console.log(`[update-positions] 書き込み後の要素数: ${elsAfter.length}`);
        // 更新が要求されたものの実際の値を確認
        const changed = updates.filter(u => {
          const original = elsAfter.find(e => e.type === u.type && e.idx === u.idx);
          return original && (original.x !== u.x || original.y !== u.y);
        });
        if (changed.length > 0) {
          console.log(`[update-positions] ⚠️ ${changed.length}件の更新が適用されていません`);
          changed.forEach(u => {
            const actual = elsAfter.find(e => e.type === u.type && e.idx === u.idx);
            console.log(`  ${u.type}[${u.idx}] 要求=${u.x},${u.y} 実際=${actual?.x},${actual?.y}`);
          });
        } else {
          console.log(`[update-positions] ✅ 全更新が正常に適用されました`);
        }
      }
    } catch(verifyErr) {
      console.log(`[update-positions] 確認エラー: ${verifyErr.message}`);
    }

    res.json({ success: true });
  } catch(e) {
    console.error('[update-positions] エラー:', e);
    res.status(500).json({ success: false, error: e.message });
  }
});

// ────── 変更履歴 ──────
app.get('/api/changelog', (req, res) => {
  const ctx = resolveWeekPaths(getWeekId(req)) || resolveWeekPaths('week1');
  try {
    const log = fs.existsSync(ctx.changelogPath)
      ? JSON.parse(fs.readFileSync(ctx.changelogPath, 'utf8'))
      : [];
    res.json({ success: true, log });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/changelog', requireEditor, (req, res) => {
  const ctx = resolveWeekPaths(getWeekId(req)) || resolveWeekPaths('week1');
  try {
    const { slide, category, description } = req.body;
    const log = fs.existsSync(ctx.changelogPath)
      ? JSON.parse(fs.readFileSync(ctx.changelogPath, 'utf8'))
      : [];
    const now = new Date();
    const entry = {
      id: Date.now(),
      date: now.toLocaleDateString('ja-JP'),
      time: now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      slide, category, description
    };
    log.unshift(entry);
    fs.writeFileSync(ctx.changelogPath, JSON.stringify(log, null, 2), 'utf8');
    res.json({ success: true, entry });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/api/changelog/:id', requireEditor, (req, res) => {
  const ctx = resolveWeekPaths(getWeekId(req)) || resolveWeekPaths('week1');
  try {
    const id = parseInt(req.params.id);
    let log = fs.existsSync(ctx.changelogPath)
      ? JSON.parse(fs.readFileSync(ctx.changelogPath, 'utf8'))
      : [];
    log = log.filter(e => e.id !== id);
    fs.writeFileSync(ctx.changelogPath, JSON.stringify(log, null, 2), 'utf8');
    res.json({ success: true });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

// API: ナレーションスクリプト取得
app.get('/api/scripts', (req, res) => {
  try {
    const scripts = JSON.parse(fs.readFileSync(path.join(__dirname, 'scripts.json'), 'utf8'));
    res.json({ success: true, scripts });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: ナレーションスクリプト保存
app.post('/api/scripts', (req, res) => {
  try {
    const { scripts } = req.body;
    fs.writeFileSync(path.join(__dirname, 'scripts.json'), JSON.stringify(scripts, null, 2), 'utf8');
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: スライド一覧取得
app.get('/api/slides', (req, res) => {
  const ctx = resolveWeekPaths(getWeekId(req)) || resolveWeekPaths('week1');
  if (!ctx || !ctx.pptxPath || !ctx.exists) {
    return res.json({ success: false, error: 'PPTXファイルがありません', slides: [] });
  }
  try {
    const slides = parsePptx(ctx.pptxPath);
    res.json({ success: true, slides });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// GitHubへ自動コミット＆プッシュ
function pushToGithub(filePath, commitMessage) {
  const token = process.env.GITHUB_TOKEN;
  if (!token) return; // トークン未設定なら何もしない
  const { execFile } = require('child_process');
  const relPath = path.relative(__dirname, filePath);
  const env = {
    ...process.env,
    GIT_AUTHOR_NAME: 'TORIHADA Editor',
    GIT_AUTHOR_EMAIL: 'editor@torihada.co.jp',
    GIT_COMMITTER_NAME: 'TORIHADA Editor',
    GIT_COMMITTER_EMAIL: 'editor@torihada.co.jp',
  };
  // remote に token を埋め込む
  const remoteUrl = `https://${token}@github.com/nagasawakai-eng/torihada-pptx-editor.git`;
  execFile('git', ['remote', 'set-url', 'origin', remoteUrl], { cwd: __dirname, env }, () => {
    execFile('git', ['add', relPath], { cwd: __dirname, env }, (err) => {
      if (err) return console.error('git add error:', err.message);
      execFile('git', ['commit', '-m', commitMessage, '--allow-empty'], { cwd: __dirname, env }, (err2) => {
        if (err2) return console.error('git commit error:', err2.message);
        execFile('git', ['push', 'origin', 'master'], { cwd: __dirname, env }, (err3) => {
          if (err3) console.error('git push error:', err3.message);
          else console.log('✅ GitHubにプッシュしました:', commitMessage);
        });
      });
    });
  });
}

// API: 変更を保存
app.post('/api/save', requireEditor, (req, res) => {
  const ctx = resolveWeekPaths(getWeekId(req)) || resolveWeekPaths('week1');
  if (!ctx || !ctx.pptxPath || !ctx.exists) return res.status(404).json({ success: false, error: 'PPTXファイルがありません' });
  try {
    const { edits } = req.body;
    if (!fs.existsSync(ctx.backupPath)) fs.copyFileSync(ctx.pptxPath, ctx.backupPath);
    const newPptxBuffer = applyEdits(ctx.pptxPath, edits);
    fs.writeFileSync(ctx.pptxPath, newPptxBuffer);
    // GitHubへ自動プッシュ（バックグラウンド）
    const weekLabel = ctx.week?.label || getWeekId(req);
    pushToGithub(ctx.pptxPath, `${weekLabel} テキスト更新（エディターから保存）`);
    res.json({ success: true, message: '保存しました' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: バックアップから復元
app.post('/api/restore', requireEditor, (req, res) => {
  const ctx = resolveWeekPaths(getWeekId(req)) || resolveWeekPaths('week1');
  if (!ctx || !ctx.pptxPath) return res.status(404).json({ success: false, error: 'PPTXファイルがありません' });
  try {
    if (!fs.existsSync(ctx.backupPath)) {
      return res.status(404).json({ success: false, error: 'バックアップがありません' });
    }
    fs.copyFileSync(ctx.backupPath, ctx.pptxPath);
    res.json({ success: true, message: '元の状態に復元しました' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ====== FishAudio プロキシ ======
const FISHAUDIO_CONFIG_PATH = path.join(__dirname, 'fishaudio.config.json');

function getFishAudioKey() {
  // 1. 環境変数を優先
  if (process.env.FISHAUDIO_API_KEY) return process.env.FISHAUDIO_API_KEY;
  // 2. 設定ファイルから読み込み
  try {
    if (fs.existsSync(FISHAUDIO_CONFIG_PATH)) {
      const cfg = JSON.parse(fs.readFileSync(FISHAUDIO_CONFIG_PATH, 'utf8'));
      if (cfg.apiKey) return cfg.apiKey;
    }
  } catch(e) {}
  return '';
}

// 日本語ボイス一覧取得
app.get('/api/fishaudio/voices', async (req, res) => {
  const apiKey = getFishAudioKey();
  if (!apiKey) return res.status(500).json({ error: 'FISHAUDIO_API_KEY が設定されていません' });
  try {
    const r = await fetch('https://api.fish.audio/model?page_size=20&language=ja', {
      headers: { 'Authorization': `Bearer ${apiKey}` }
    });
    const data = await r.json();
    const voices = (data.items || []).map(v => ({ id: v._id, name: v.title }));
    res.json({ success: true, voices });
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// テキスト→音声生成
app.post('/api/fishaudio/tts', async (req, res) => {
  const apiKey = getFishAudioKey();
  if (!apiKey) return res.status(500).json({ error: 'FISHAUDIO_API_KEY が設定されていません' });
  const { text: rawText, voiceId, speed = 1.0 } = req.body;
  if (!rawText) return res.status(400).json({ error: 'text は必須です' });

  // 読み替えテーブル（英単語→日本語ヨミ）
  const readingMap = {
    'TORIHADA': 'とりはだ',
    'Torihada': 'とりはだ',
    'torihada': 'とりはだ',
  };
  let text = rawText;
  for (const [word, reading] of Object.entries(readingMap)) {
    text = text.split(word).join(reading);
  }

  try {
    const body = JSON.stringify({
      text,
      reference_id: voiceId || null,
      format: 'mp3',
      mp3_bitrate: 128,
      normalize: true,
      latency: 'normal',
    });
    const r = await fetch('https://api.fish.audio/v1/tts', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body
    });
    if (!r.ok) {
      const err = await r.text();
      return res.status(r.status).json({ error: err });
    }
    res.set('Content-Type', 'audio/mpeg');
    const buf = await r.arrayBuffer();
    res.send(Buffer.from(buf));
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// ====== MP4エクスポート ======

const exportJobs = new Map();

function ffmpegRun(args) {
  return new Promise((resolve, reject) => {
    const proc = spawn('ffmpeg', args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stderr = '';
    proc.stderr.on('data', d => { stderr += d.toString(); });
    proc.on('close', code => {
      if (code === 0) resolve();
      else reject(new Error(`FFmpeg failed (code ${code}): ${stderr.slice(-400)}`));
    });
    proc.on('error', e => reject(new Error(`FFmpeg起動失敗: ${e.message}`)));
  });
}

async function runExportJob(job, weekId, voiceId, speed) {
  const apiKey = getFishAudioKey();

  let scripts = {};
  try { scripts = JSON.parse(fs.readFileSync(path.join(__dirname, 'scripts.json'), 'utf8')); } catch(e) {}

  // プレビューPNG一覧
  const weekPreviewDir = path.join(__dirname, 'preview', weekId);
  const rootPreviewDir = path.join(__dirname, 'preview');
  const useDir = fs.existsSync(weekPreviewDir) ? weekPreviewDir : rootPreviewDir;
  const slideFiles = fs.readdirSync(useDir)
    .filter(f => /^slide_\d+\.png$/i.test(f))
    .sort();
  if (!slideFiles.length) throw new Error('スライドPNGが見つかりません');

  job.total = slideFiles.length;
  const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'pptx-export-'));
  const segments = [];

  const readingMap = { 'TORIHADA': 'とりはだ', 'Torihada': 'とりはだ', 'torihada': 'とりはだ' };

  try {
    for (let i = 0; i < slideFiles.length; i++) {
      const slideFile = slideFiles[i];
      const slideNum = parseInt(slideFile.match(/\d+/)[0], 10);
      const rawScript = scripts[String(slideNum)] || '';
      const slidePng = path.join(useDir, slideFile);
      const segFile = path.join(tmpDir, `seg_${String(i).padStart(3, '0')}.mp4`);

      job.progress = i;
      job.message = `スライド ${slideNum} を処理中... (${i + 1}/${slideFiles.length})`;

      if (rawScript && apiKey) {
        let text = rawScript;
        for (const [w, r] of Object.entries(readingMap)) text = text.split(w).join(r);

        const audioFile = path.join(tmpDir, `audio_${i}.mp3`);
        try {
          const ttsRes = await fetch('https://api.fish.audio/v1/tts', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text, reference_id: voiceId || null, format: 'mp3',
              mp3_bitrate: 128, normalize: true, latency: 'normal',
            })
          });
          if (!ttsRes.ok) throw new Error(`TTS HTTP ${ttsRes.status}`);
          fs.writeFileSync(audioFile, Buffer.from(await ttsRes.arrayBuffer()));

          await ffmpegRun([
            '-loop', '1', '-i', slidePng,
            '-i', audioFile,
            '-c:v', 'libx264', '-tune', 'stillimage',
            '-c:a', 'aac', '-b:a', '128k',
            '-pix_fmt', 'yuv420p', '-shortest',
            '-y', segFile
          ]);
        } catch(ttsErr) {
          console.warn(`[export] TTS失敗 slide ${slideNum}: ${ttsErr.message} → 無音3秒`);
          await ffmpegRun([
            '-loop', '1', '-i', slidePng,
            '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
            '-c:v', 'libx264', '-tune', 'stillimage',
            '-c:a', 'aac', '-b:a', '64k',
            '-pix_fmt', 'yuv420p', '-t', '3',
            '-y', segFile
          ]);
        }
      } else {
        await ffmpegRun([
          '-loop', '1', '-i', slidePng,
          '-f', 'lavfi', '-i', 'anullsrc=r=44100:cl=stereo',
          '-c:v', 'libx264', '-tune', 'stillimage',
          '-c:a', 'aac', '-b:a', '64k',
          '-pix_fmt', 'yuv420p', '-t', '3',
          '-y', segFile
        ]);
      }
      segments.push(segFile);
    }

    job.message = 'ファイルを結合中...';
    const concatFile = path.join(tmpDir, 'concat.txt');
    fs.writeFileSync(concatFile, segments.map(s => `file '${s}'`).join('\n'));
    const outputFile = path.join(tmpDir, 'output.mp4');
    await ffmpegRun([
      '-f', 'concat', '-safe', '0', '-i', concatFile,
      '-c', 'copy', '-y', outputFile
    ]);

    job.outputFile = outputFile;
    job.tmpDir = tmpDir;
    job.status = 'done';
    job.progress = slideFiles.length;
    job.message = '完成！';
  } catch(e) {
    try { fs.rmSync(tmpDir, { recursive: true, force: true }); } catch(_) {}
    throw e;
  }
}

// エクスポート開始
app.post('/api/export-video/start', async (req, res) => {
  const { weekId = 'week1', voiceId = '', speed = 0.93 } = req.body;
  const jobId = crypto.randomBytes(8).toString('hex');
  const job = { id: jobId, status: 'running', progress: 0, total: 0, message: '準備中...', outputFile: null, tmpDir: null };
  exportJobs.set(jobId, job);
  runExportJob(job, weekId, voiceId, speed).catch(e => {
    job.status = 'error';
    job.message = e.message;
  });
  res.json({ success: true, jobId });
});

// 進捗確認（SSE）
app.get('/api/export-video/progress/:jobId', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'ジョブが見つかりません' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const send = (d) => res.write(`data: ${JSON.stringify(d)}\n\n`);
  const timer = setInterval(() => {
    send({ status: job.status, progress: job.progress, total: job.total, message: job.message });
    if (job.status === 'done' || job.status === 'error') {
      clearInterval(timer);
      res.end();
    }
  }, 800);
  req.on('close', () => clearInterval(timer));
});

// MP4ダウンロード
app.get('/api/export-video/download/:jobId', (req, res) => {
  const job = exportJobs.get(req.params.jobId);
  if (!job || job.status !== 'done' || !job.outputFile) {
    return res.status(404).json({ error: 'エクスポートが準備できていません' });
  }
  const filename = `${job.weekId || 'video'}_study.mp4`;
  res.setHeader('Content-Type', 'video/mp4');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  const stream = fs.createReadStream(job.outputFile);
  stream.pipe(res);
  res.on('finish', () => {
    try { fs.rmSync(job.tmpDir, { recursive: true, force: true }); } catch(_) {}
    exportJobs.delete(job.id);
  });
  stream.on('error', () => res.status(500).end());
});

// ====== イラスト推奨・挿入システム ======

const ILLUST_CATALOG_PATH = path.join(__dirname, 'illustrations.catalog.json');
const ILLUST_CACHE_DIR    = path.join(__dirname, 'public', 'illust-cache');

// キャッシュディレクトリ作成
if (!fs.existsSync(ILLUST_CACHE_DIR)) fs.mkdirSync(ILLUST_CACHE_DIR, { recursive: true });

// イラスト画像キャッシュプロキシ（初回DL→以降ローカル配信）
app.get('/illust-cache/:id.png', async (req, res) => {
  const id = req.params.id.replace(/[^0-9]/g, '');
  if (!id) return res.status(400).end();

  const localPath = path.join(ILLUST_CACHE_DIR, `${id}.png`);

  // キャッシュ済みなら即配信
  if (fs.existsSync(localPath)) {
    return res.set('Content-Type', 'image/png')
              .set('Cache-Control', 'public, max-age=604800')
              .sendFile(localPath);
  }

  // 未キャッシュ → Loose Drawingから取得してキャッシュ
  try {
    const url = `https://loosedrawing.com/assets/media/illustrations/png/${id}.png`;
    const r = await fetch(url);
    if (!r.ok) return res.status(404).end();
    const buf = Buffer.from(await r.arrayBuffer());
    fs.writeFileSync(localPath, buf);
    res.set('Content-Type', 'image/png')
       .set('Cache-Control', 'public, max-age=604800')
       .send(buf);
  } catch(e) {
    res.status(502).end();
  }
});

// 起動時プリキャッシュ: 推奨カタログ上位45件のみ（オンデマンドキャッシュに切り替え済み）
function preCacheIllustrations() {
  const catalog = loadIllustCatalog();
  // 全1800件のプリキャッシュは不要。推奨候補上位45件のみキャッシュ
  const top45 = catalog.slice(0, 45);
  let idx = 0;
  function next() {
    if (idx >= top45.length) { console.log('✅ イラスト初期キャッシュ完了 (top45)'); return; }
    const ill = top45[idx++];
    const localPath = path.join(ILLUST_CACHE_DIR, `${ill.id}.png`);
    if (fs.existsSync(localPath)) { next(); return; }
    fetch(`https://loosedrawing.com/assets/media/illustrations/png/${ill.id}.png`)
      .then(r => r.ok ? r.arrayBuffer() : null)
      .then(buf => { if (buf) fs.writeFileSync(localPath, Buffer.from(buf)); })
      .catch(() => {})
      .finally(() => setTimeout(next, 300));
  }
  setTimeout(next, 5000); // サーバー起動5秒後に開始
}
preCacheIllustrations();

function loadIllustCatalog() {
  try {
    return JSON.parse(fs.readFileSync(ILLUST_CATALOG_PATH, 'utf8')).illustrations;
  } catch(e) {
    return [];
  }
}

// スライドテキストをフラット化
function getSlideText(pptxPath, slideIndex) {
  try {
    const slides = parsePptx(pptxPath);
    const slide = slides[slideIndex];
    if (!slide) return '';
    return slide.shapes.flatMap(s => s.paragraphs.flatMap(p => p.runs.map(r => r.text))).join(' ');
  } catch(e) {
    return '';
  }
}

// イラスト推奨API
app.get('/api/illustrations/suggest', (req, res) => {
  const { slideIndex, weekId } = req.query;
  const catalog = loadIllustCatalog();
  if (!catalog.length) return res.json({ illustrations: [] });

  const ctx = resolveWeekPaths(weekId || 'week1');
  const slideText = (ctx && ctx.exists && slideIndex !== undefined)
    ? getSlideText(ctx.pptxPath, parseInt(slideIndex))
    : '';

  const toUrl = (id) => `/illust-cache/${id}.png`;

  const scored = catalog.map(ill => {
    const score = ill.keywords.reduce((s, kw) => s + (slideText.includes(kw) ? 2 : 0), 0);
    return { ...ill, score, thumbnailUrl: toUrl(ill.id) };
  });

  const sorted = scored.sort((a, b) => b.score - a.score);
  const top = sorted.slice(0, 6);

  // スコアが全0なら多様なカテゴリから
  if (top.every(i => i.score === 0)) {
    const shuffled = [...catalog].sort(() => Math.random() - 0.5).slice(0, 6);
    return res.json({ illustrations: shuffled.map(i => ({ ...i, thumbnailUrl: toUrl(i.id) })) });
  }

  res.json({ illustrations: top });
});

// 全イラストカタログAPI（検索・全一覧用）
app.get('/api/illustrations/all', (req, res) => {
  const catalog = loadIllustCatalog();
  const toUrl = (id) => `/illust-cache/${id}.png`;
  // キーワード検索フィルター
  const q = (req.query.q || '').trim();
  let filtered = catalog;
  if (q) {
    const terms = q.split(/\s+/).filter(Boolean);
    filtered = catalog.filter(ill => {
      const haystack = ill.title + ' ' + (ill.keywords || []).join(' ');
      return terms.every(t => haystack.includes(t));
    });
  }
  res.json({
    total: catalog.length,
    count: filtered.length,
    illustrations: filtered.map(i => ({
      id: i.id,
      title: i.title,
      keywords: i.keywords || [],
      thumbnailUrl: toUrl(i.id)
    }))
  });
});

// イラストをPPTXスライドに挿入するAPI
app.post('/api/illustrations/apply', requireEditor, async (req, res) => {
  const { illustrationId, slideIndex, weekId, position } = req.body;
  if (illustrationId === undefined || slideIndex === undefined) {
    return res.status(400).json({ error: 'illustrationId と slideIndex は必須です' });
  }

  const ctx = resolveWeekPaths(weekId || 'week1');
  if (!ctx || !ctx.exists) return res.status(404).json({ error: 'PPTXファイルがありません' });

  try {
    // Loose Drawing から画像ダウンロード
    const imgUrl = `https://loosedrawing.com/assets/media/illustrations/png/${illustrationId}.png`;
    const imgResp = await fetch(imgUrl);
    if (!imgResp.ok) throw new Error(`イラストのダウンロードに失敗しました (${imgResp.status})`);
    const imgBuffer = Buffer.from(await imgResp.arrayBuffer());

    const zip = new AdmZip(ctx.pptxPath);

    // 次のメディア番号を決定
    const mediaEntries = zip.getEntries().filter(e => e.entryName.match(/^ppt\/media\/image\d+\.(png|jpg|jpeg)$/i));
    const maxImgNum = mediaEntries.reduce((max, e) => {
      const m = e.entryName.match(/image(\d+)\./);
      return m ? Math.max(max, parseInt(m[1])) : max;
    }, 0);
    const newImgNum = maxImgNum + 1;
    const newImgName = `ppt/media/image${newImgNum}.png`;

    // 画像をzipに追加
    zip.addFile(newImgName, imgBuffer);

    // relsファイル更新
    const slideNum = parseInt(slideIndex) + 1;
    const relsPath = `ppt/slides/_rels/slide${slideNum}.xml.rels`;
    const relsEntry = zip.getEntry(relsPath);
    let relsXml = relsEntry
      ? relsEntry.getData().toString('utf8')
      : `<?xml version='1.0' encoding='UTF-8' standalone='yes'?>\n<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"></Relationships>`;

    const rIdMatches = [...relsXml.matchAll(/Id="rId(\d+)"/g)];
    const maxRId = rIdMatches.reduce((max, m) => Math.max(max, parseInt(m[1])), 0);
    const newRId = `rId${maxRId + 1}`;

    const newRel = `<Relationship Id="${newRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image${newImgNum}.png"/>`;
    relsXml = relsXml.replace('</Relationships>', `${newRel}</Relationships>`);

    if (relsEntry) {
      zip.updateFile(relsPath, Buffer.from(relsXml));
    } else {
      zip.addFile(relsPath, Buffer.from(relsXml));
    }

    // スライドXMLに画像シェイプを追加
    const slidePath = `ppt/slides/slide${slideNum}.xml`;
    const slideEntry = zip.getEntry(slidePath);
    if (!slideEntry) throw new Error(`スライド${slideNum}が見つかりません`);
    let slideXml = slideEntry.getData().toString('utf8');

    // 最大シェイプIDを取得
    const idMatches = [...slideXml.matchAll(/\bid="(\d+)"/g)];
    const maxId = idMatches.reduce((max, m) => Math.max(max, parseInt(m[1])), 100);
    const newShapeId = maxId + 1;

    // ドロップ位置（フロントエンドから渡された座標、なければデフォルト右中央）
    const ILLUST_SIZE = 2400000;
    const pos = (position && position.x !== undefined)
      ? { x: Math.max(0, position.x), y: Math.max(0, position.y), cx: ILLUST_SIZE, cy: ILLUST_SIZE }
      : { x: 7200000, y: 1500000, cx: ILLUST_SIZE, cy: ILLUST_SIZE };

    const picXml = `<p:pic><p:nvPicPr><p:cNvPr id="${newShapeId}" name="Illust_${illustrationId}"/><p:cNvPicPr><a:picLocks noChangeAspect="1"/></p:cNvPicPr><p:nvPr/></p:nvPicPr><p:blipFill><a:blip r:embed="${newRId}"/><a:stretch><a:fillRect/></a:stretch></p:blipFill><p:spPr><a:xfrm><a:off x="${pos.x}" y="${pos.y}"/><a:ext cx="${pos.cx}" cy="${pos.cy}"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:ln><a:noFill/></a:ln></p:spPr></p:pic>`;

    slideXml = slideXml.replace('</p:spTree>', picXml + '</p:spTree>');
    zip.updateFile(slidePath, Buffer.from(slideXml));

    // 保存
    zip.writeZip(ctx.pptxPath);

    // GitHubへ自動プッシュ
    pushToGithub(ctx.pptxPath, `✏️ スライド${slideNum}にイラスト${illustrationId}を挿入 [${weekId || 'week1'}]`);

    res.json({ success: true, message: `スライド${slideNum}にイラストを挿入しました` });
  } catch(e) {
    console.error('イラスト挿入エラー:', e);
    res.status(500).json({ error: e.message });
  }
});

// ====== VOICEVOX プロキシ ======
function vvPost(path, headers, body) {
  return new Promise((resolve, reject) => {
    const opts = { host: '127.0.0.1', port: 50021, path, method: 'POST', headers };
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body: Buffer.concat(chunks) }));
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}

function vvGet(path) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: 50021, path }, (res) => {
      const chunks = [];
      res.on('data', c => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

// スピーカー一覧
app.get('/api/voicevox/speakers', async (req, res) => {
  try {
    const body = await vvGet('/speakers');
    res.set('Content-Type', 'application/json; charset=utf-8');
    res.send(body);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

// テキスト→WAV（audio_query + synthesis を一括）
app.post('/api/voicevox/audio', requireEditor, async (req, res) => {
  try {
    const { text, speaker, speedScale, intonationScale, pitchScale,
            pauseLengthScale, prePhonemeLength, postPhonemeLength } = req.body;
    const encodedText = encodeURIComponent(text);

    // audio_query
    const qRes = await vvPost(
      `/audio_query?text=${encodedText}&speaker=${speaker}`,
      { 'Content-Length': '0' },
      null
    );
    const audioQuery = JSON.parse(qRes.body.toString('utf8'));
    if (speedScale != null)        audioQuery.speedScale        = speedScale;
    if (intonationScale != null)   audioQuery.intonationScale   = intonationScale;
    if (pitchScale != null)        audioQuery.pitchScale        = pitchScale;
    if (pauseLengthScale != null)  audioQuery.pauseLengthScale  = pauseLengthScale;
    if (prePhonemeLength != null)  audioQuery.prePhonemeLength  = prePhonemeLength;
    if (postPhonemeLength != null) audioQuery.postPhonemeLength = postPhonemeLength;

    // synthesis
    const qBody = Buffer.from(JSON.stringify(audioQuery), 'utf8');
    const sRes = await vvPost(
      `/synthesis?speaker=${speaker}`,
      { 'Content-Type': 'application/json', 'Content-Length': qBody.length },
      qBody
    );

    res.set('Content-Type', 'audio/wav');
    res.send(sRes.body);
  } catch(e) {
    res.status(500).json({ error: e.message });
  }
});

const { spawn, execFile } = require('child_process');
const os = require('os');

// ─── PDF ダウンロード ───
app.get('/download-pdf', (req, res) => {
  const ctx = resolveWeekPaths(getWeekId(req)) || resolveWeekPaths('week1');
  if (!ctx || !ctx.pptxPath || !ctx.exists) {
    return res.status(404).json({ error: 'PPTXファイルがありません' });
  }
  const soffice = process.platform === 'win32'
    ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
    : 'soffice';

  const outDir   = os.tmpdir();
  const pptxName = path.basename(ctx.pptxPath);
  const pdfName  = pptxName.replace(/\.pptx$/i, '.pdf');
  const pdfPath  = path.join(outDir, pdfName);

  if (fs.existsSync(pdfPath)) {
    try { fs.unlinkSync(pdfPath); } catch(e) {}
  }

  execFile(soffice, [
    '--headless', '--convert-to', 'pdf', '--outdir', outDir, ctx.pptxPath
  ], { timeout: 60000 }, (err) => {
    if (err) {
      console.error('PDF変換エラー:', err);
      return res.status(500).json({ error: 'PDF変換に失敗しました: ' + err.message });
    }
    if (!fs.existsSync(pdfPath)) {
      return res.status(500).json({ error: 'PDFファイルが生成されませんでした' });
    }
    const downloadName = encodeURIComponent(pdfName);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename*=UTF-8''${downloadName}`);
    const stream = fs.createReadStream(pdfPath);
    stream.pipe(res);
    stream.on('close', () => { try { fs.unlinkSync(pdfPath); } catch(e) {} });
  });
});

// ─── GitHub Webhook（自動 git pull） ───
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'torihada-auto-deploy-2024';

app.post('/webhook/github', (req, res) => {
  // 署名検証
  const sig = req.headers['x-hub-signature-256'];
  if (sig) {
    const crypto = require('crypto');
    const body = JSON.stringify(req.body);
    const expected = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(body).digest('hex');
    if (sig !== expected) {
      console.warn('⚠️  Webhook: 署名不一致 - 無視します');
      return res.status(401).json({ error: 'Invalid signature' });
    }
  }

  const branch = (req.body && req.body.ref) ? req.body.ref : '';
  if (branch && branch !== 'refs/heads/master') {
    return res.status(200).json({ message: 'masterブランチ以外は無視します' });
  }

  console.log('🔄 GitHub Webhook 受信 → git pull 実行中...');
  res.status(200).json({ message: 'git pull を開始しました' });

  const { execFile } = require('child_process');
  execFile('git', ['pull', 'origin', 'master'], { cwd: __dirname }, (err, stdout, stderr) => {
    if (err) {
      console.error('❌ git pull 失敗:', err.message);
    } else {
      console.log('✅ git pull 完了:', stdout.trim() || 'Already up to date.');
    }
  });
});

const PORT = process.env.PORT || 3000;
const NGROK_PATH = 'C:\\Users\\長澤開\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Ngrok.Ngrok_Microsoft.Winget.Source_8wekyb3d8bbwe\\ngrok.exe';
const NGROK_CONFIG = path.join(process.env.USERPROFILE || 'C:\\Users\\長澤開', 'AppData\\Local\\ngrok\\ngrok.yml');

app.listen(PORT, () => {
  console.log(`\n✅ PPTX エディター起動中`);
  console.log(`👉 ローカル:  http://localhost:${PORT}`);
  console.log(`📄 編集対象: ${PPTX_PATH}`);
  console.log(`\n🌐 外部共有URL を生成中...`);

  function onTunnelUrl(url) {
    const pad = Math.max(0, 44 - url.length);
    console.log(`\n╔${'═'.repeat(url.length + 16 + pad)}╗`);
    console.log(`║  🔗 共有リンク: ${url}${' '.repeat(pad)}║`);
    console.log(`╚${'═'.repeat(url.length + 16 + pad)}╝`);
    console.log(`  ↑ このURLをGoogle Sitesに埋め込んでいます`);
    console.log(`\nCtrl+C で停止\n`);
    fs.writeFileSync(path.join(__dirname, 'tunnel_url.txt'), url, 'utf8');

    // GitHub Webhookを自動登録（pushしたら自動git pull）
    registerGithubWebhook(url + '/webhook/github');
  }

  function registerGithubWebhook(webhookUrl) {
    const https = require('https');
    const GITHUB_TOKEN = process.env.GITHUB_TOKEN || '';
    const REPO = 'nagasawakai-eng/torihada-pptx-editor';
    if (!GITHUB_TOKEN) {
      console.log('ℹ️  GITHUB_TOKEN が未設定のためWebhook自動登録をスキップします');
      return;
    }
    // 既存のwebhookを取得して重複登録を防ぐ
    const listOpts = {
      hostname: 'api.github.com',
      path: `/repos/${REPO}/hooks`,
      method: 'GET',
      headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'torihada-server', 'Accept': 'application/vnd.github.v3+json' }
    };
    const listReq = https.request(listOpts, (res) => {
      let body = '';
      res.on('data', d => body += d);
      res.on('end', () => {
        try {
          const hooks = JSON.parse(body);
          // 古いwebhookを削除
          if (Array.isArray(hooks)) {
            hooks.forEach(hook => {
              if (hook.config && hook.config.url && hook.config.url.includes('/webhook/github')) {
                const delOpts = { ...listOpts, path: `/repos/${REPO}/hooks/${hook.id}`, method: 'DELETE' };
                https.request(delOpts, r => r.resume()).end();
              }
            });
          }
        } catch(e) {}
        // 新しいwebhookを登録
        const payload = JSON.stringify({
          name: 'web',
          active: true,
          events: ['push'],
          config: { url: webhookUrl, content_type: 'json', secret: WEBHOOK_SECRET, insecure_ssl: '0' }
        });
        const createOpts = {
          hostname: 'api.github.com',
          path: `/repos/${REPO}/hooks`,
          method: 'POST',
          headers: { 'Authorization': `token ${GITHUB_TOKEN}`, 'User-Agent': 'torihada-server', 'Accept': 'application/vnd.github.v3+json', 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
        };
        const createReq = https.request(createOpts, (res2) => {
          let b = '';
          res2.on('data', d => b += d);
          res2.on('end', () => {
            if (res2.statusCode === 201) {
              console.log(`✅ GitHub Webhook 登録完了 → ${webhookUrl}`);
              console.log(`   pushするたびに自動でgit pullされます！`);
            } else {
              console.warn(`⚠️  Webhook登録失敗 (${res2.statusCode}):`, b.substring(0, 100));
            }
          });
        });
        createReq.on('error', e => console.warn('Webhook登録エラー:', e.message));
        createReq.write(payload);
        createReq.end();
      });
    });
    listReq.on('error', e => console.warn('Webhook一覧取得エラー:', e.message));
    listReq.end();
  }

  // ngrok設定ファイルにauth_tokenとstatic_domainがあればngrokを使用、なければcloudflaredにフォールバック
  let useNgrok = false;
  let ngrokDomain = null;
  try {
    if (fs.existsSync(NGROK_CONFIG)) {
      const cfgContent = fs.readFileSync(NGROK_CONFIG, 'utf8');
      const domainMatch = cfgContent.match(/static_domain[:\s]+([a-z0-9\-]+\.ngrok-free\.app)/);
      const authMatch = cfgContent.match(/authtoken[:\s]+\S+/);
      if (authMatch && domainMatch) {
        ngrokDomain = domainMatch[1];
        useNgrok = true;
        console.log(`✨ ngrok固定ドメイン使用: ${ngrokDomain}`);
      } else if (authMatch) {
        useNgrok = true;
        console.log(`✨ ngrok使用（ドメイン未設定）`);
      }
    }
  } catch(e) {}

  if (useNgrok && fs.existsSync(NGROK_PATH)) {
    const ngrokArgs = ngrokDomain
      ? ['http', `--url=${ngrokDomain}`, `${PORT}`]
      : ['http', `${PORT}`];
    const ng = spawn(NGROK_PATH, ngrokArgs, { stdio: ['ignore', 'pipe', 'pipe'] });
    let urlFound = false;
    function checkNgrok(data) {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9\-]+\.ngrok-free\.app/) ||
                    text.match(/https:\/\/[a-z0-9\-]+\.ngrok\.io/);
      if (match && !urlFound) {
        urlFound = true;
        onTunnelUrl(match[0]);
      }
    }
    ng.stdout.on('data', checkNgrok);
    ng.stderr.on('data', checkNgrok);
    ng.on('error', (e) => {
      console.error('ngrok 起動失敗:', e.message);
      startCloudflared();
    });
    process.on('SIGINT', () => { ng.kill(); process.exit(); });
    process.on('SIGTERM', () => { ng.kill(); process.exit(); });

    // ngrok APIからURLを取得（APIが利用可能な場合）
    setTimeout(() => {
      if (!urlFound) {
        try {
          const http = require('http');
          http.get('http://127.0.0.1:4040/api/tunnels', (res) => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
              try {
                const data = JSON.parse(body);
                const tunnel = data.tunnels && data.tunnels.find(t => t.proto === 'https');
                if (tunnel && !urlFound) { urlFound = true; onTunnelUrl(tunnel.public_url); }
              } catch(e) {}
            });
          }).on('error', () => {});
        } catch(e) {}
      }
    }, 5000);
  } else {
    startCloudflared();
  }

  function startCloudflared() {
    const cfPath = path.join(__dirname, 'cloudflared.exe');
    const cf = spawn(cfPath, ['tunnel', '--url', `http://localhost:${PORT}`], {
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let urlFound = false;
    function checkOutput(data) {
      const text = data.toString();
      const match = text.match(/https:\/\/[a-z0-9\-]+\.trycloudflare\.com/);
      if (match && !urlFound) {
        urlFound = true;
        onTunnelUrl(match[0]);
      }
    }
    cf.stdout.on('data', checkOutput);
    cf.stderr.on('data', checkOutput);
    cf.on('error', (e) => console.error('cloudflared 起動失敗:', e.message));
    cf.on('exit', (code) => { if (code !== 0 && code !== null) console.log(`cloudflared 終了 (code ${code})`); });
    process.on('SIGINT', () => { cf.kill(); process.exit(); });
    process.on('SIGTERM', () => { cf.kill(); process.exit(); });
  }
});
