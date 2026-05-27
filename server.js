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

// ─── ルートアクセス制御（/view と /preview は公開）───
app.use((req, res, next) => {
  if (req.path === '/view' || req.path.startsWith('/preview/')) return next();
  if (req.path.startsWith('/api/')) return next();
  if (req.path.match(/\.(js|css|png|jpg|jpeg|svg|ico|woff2?)$/)) return next();
  const token = extractToken(req);
  const role = getRole(token);
  if (!role) return res.status(403).send(accessDeniedHtml());
  req.role = role;
  next();
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

// スライドプレビュー画像を配信（クロスオリジン対応）
app.get('/preview/:filename', (req, res) => {
  const filePath = path.join(PREVIEW_DIR, req.params.filename);
  if (fs.existsSync(filePath)) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.sendFile(filePath);
  } else {
    res.status(404).send('not found');
  }
});

const PPTX_PATH = process.env.PPTX_PATH || path.join(__dirname, 'TORIHADA_第1週_研修資料_v2.pptx');
const BACKUP_PATH = PPTX_PATH.replace('.pptx', '_backup.pptx');

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
    const u = shapeUpds.find(u => u.idx === si++); return u ? patchEl(m, u) : m;
  });
  const picUpds = updates.filter(u => u.type === 'picture');
  let pi = 0;
  xml = xml.replace(/<p:pic[\s>][\s\S]*?<\/p:pic>/g, m => {
    const u = picUpds.find(u => u.idx === pi++); return u ? patchEl(m, u) : m;
  });
  zip.updateFile(entryName, Buffer.from(xml, 'utf8'));
  return zip.toBuffer();
}

// API: 要素ポジション取得
app.get('/api/slide-positions/:slideNum', (req, res) => {
  try {
    const slideNum = parseInt(req.params.slideNum);
    const entryName = `ppt/slides/slide${slideNum}.xml`;
    const zip = new AdmZip(PPTX_PATH);
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
  try {
    const { entryName, updates } = req.body;
    if (!fs.existsSync(BACKUP_PATH)) fs.copyFileSync(PPTX_PATH, BACKUP_PATH);
    const buf = patchElementPositions(PPTX_PATH, entryName, updates);
    fs.writeFileSync(PPTX_PATH, buf);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// ────── 変更履歴 ──────
const CHANGELOG_PATH = path.join(__dirname, 'change_log.json');

app.get('/api/changelog', (req, res) => {
  try {
    const log = fs.existsSync(CHANGELOG_PATH)
      ? JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8'))
      : [];
    res.json({ success: true, log });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/changelog', requireEditor, (req, res) => {
  try {
    const { slide, category, description } = req.body;
    const log = fs.existsSync(CHANGELOG_PATH)
      ? JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8'))
      : [];
    const now = new Date();
    const entry = {
      id: Date.now(),
      date: now.toLocaleDateString('ja-JP'),
      time: now.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }),
      slide, category, description
    };
    log.unshift(entry);
    fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(log, null, 2), 'utf8');
    res.json({ success: true, entry });
  } catch(e) { res.status(500).json({ success: false, error: e.message }); }
});

app.delete('/api/changelog/:id', requireEditor, (req, res) => {
  try {
    const id = parseInt(req.params.id);
    let log = fs.existsSync(CHANGELOG_PATH)
      ? JSON.parse(fs.readFileSync(CHANGELOG_PATH, 'utf8'))
      : [];
    log = log.filter(e => e.id !== id);
    fs.writeFileSync(CHANGELOG_PATH, JSON.stringify(log, null, 2), 'utf8');
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
  try {
    const slides = parsePptx(PPTX_PATH);
    res.json({ success: true, slides });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: 変更を保存
app.post('/api/save', requireEditor, (req, res) => {
  try {
    const { edits } = req.body;

    // バックアップ作成（初回のみ）
    if (!fs.existsSync(BACKUP_PATH)) {
      fs.copyFileSync(PPTX_PATH, BACKUP_PATH);
    }

    const newPptxBuffer = applyEdits(PPTX_PATH, edits);
    fs.writeFileSync(PPTX_PATH, newPptxBuffer);

    res.json({ success: true, message: '保存しました' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: バックアップから復元
app.post('/api/restore', requireEditor, (req, res) => {
  try {
    if (!fs.existsSync(BACKUP_PATH)) {
      return res.status(404).json({ success: false, error: 'バックアップがありません' });
    }
    fs.copyFileSync(BACKUP_PATH, PPTX_PATH);
    res.json({ success: true, message: '元の状態に復元しました' });
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
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
  // LibreOffice のパスを OS で切り替え
  const soffice = process.platform === 'win32'
    ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
    : 'soffice';

  const outDir = os.tmpdir();
  const pptxName = path.basename(PPTX_PATH);
  const pdfName  = pptxName.replace(/\.pptx$/i, '.pdf');
  const pdfPath  = path.join(outDir, pdfName);

  // 既存の古いPDFを削除
  if (fs.existsSync(pdfPath)) {
    try { fs.unlinkSync(pdfPath); } catch(e) {}
  }

  execFile(soffice, [
    '--headless',
    '--convert-to', 'pdf',
    '--outdir', outDir,
    PPTX_PATH
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
    stream.on('close', () => {
      try { fs.unlinkSync(pdfPath); } catch(e) {}
    });
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
