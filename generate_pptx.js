const pptxgen = require("pptxgenjs");
const path = require("path");

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";
pres.title = "TORIHADA クリエイターネットワーク研修 第1週";

const C = {
  PINK:       "FF4DB8",
  PINK_LIGHT: "FFE6F3",
  PINK_MID:   "FFB3E0",
  YELLOW_HL:  "FFE455",
  WHITE:      "FFFFFF",
  BLACK:      "1A1A1A",
  GRAY:       "555555",
  GRAY_LIGHT: "AAAAAA",
  BG:         "F9F9F9",
  RED:        "E63946",
  GREEN:      "2A9D8F",
  NAVY:       "264653",
};

const FONT = "Meiryo";
const ILLUST = (name) => path.join(__dirname, "public", "illustrations", name);

// ──────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────

function setGridBg(slide) {
  slide.background = { color: C.BG };
  for (let i = 0; i < 20; i++) {
    slide.addShape(pres.shapes.LINE, { x:0, y:i*0.3, w:10, h:0, line:{color:"E0E0E0",width:0.5} });
  }
  for (let i = 0; i < 35; i++) {
    slide.addShape(pres.shapes.LINE, { x:i*0.3, y:0, w:0, h:5.625, line:{color:"E0E0E0",width:0.5} });
  }
}

function setPinkBg(slide) {
  slide.background = { color: C.PINK };
}

// Add illustration image
function img(slide, name, x, y, w, h, transparency = 0) {
  slide.addImage({ path: ILLUST(name), x, y, w, h, transparency });
}

// Text with yellow highlight bar behind it
function hlText(slide, text, x, y, w, h, opts = {}) {
  slide.addShape(pres.shapes.RECTANGLE, {
    x: x - 0.05, y: y + h * 0.32, w: w + 0.1, h: h * 0.58,
    fill: { color: C.YELLOW_HL }, line: { color: C.YELLOW_HL }
  });
  slide.addText(text, { x, y, w, h, fontFace: FONT, ...opts });
}

// Pink numbered circle badge
function numCircle(slide, num, x, y, size = 0.6) {
  slide.addShape(pres.shapes.OVAL, { x, y, w:size, h:size, fill:{color:C.PINK}, line:{color:C.PINK} });
  slide.addText(String(num), {
    x, y, w:size, h:size,
    fontSize: size > 0.55 ? 18 : 14, color:C.WHITE, bold:true,
    align:"center", valign:"middle", margin:0, fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 1: タイトル
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  // 大きなピンク「?」ウォーターマーク
  s.addText("?", {
    x: 2.5, y: 0.2, w: 5, h: 5.2,
    fontSize: 320, color: C.PINK, bold: true,
    align: "center", valign: "middle", margin: 0,
    transparency: 85, fontFace: FONT
  });

  // イラスト配置（テキストと被らない四隅）
  img(s, "lightbulb.png",    0.15, 0.5,  1.5, 1.5);
  img(s, "growth-graph.png", 7.8,  0.45, 1.9, 1.5);
  img(s, "coins-money.png",  0.15, 3.5,  2.0, 1.6);
  img(s, "star.png",         8.5,  3.8,  1.1, 1.1, 20);
  img(s, "star.png",         0.15, 2.3,  0.6, 0.6, 15);

  // ── Pattern F: ダブルライン囲みロゴ (27pt) ──
  // 外枠（白背景 + ネイビー太線）
  s.addShape(pres.shapes.RECTANGLE, {
    x: 1.2, y: 1.78, w: 7.6, h: 1.18,
    fill:{color:C.WHITE}, line:{color:C.NAVY, width:2.5}
  });
  // タイトルテキスト
  s.addText("Torihada-Creator-License-Center", {
    x: 1.32, y: 1.84, w: 7.36, h: 1.0,
    fontSize: 27, color: C.NAVY, bold: true, align: "center", valign: "middle",
    charSpacing: 1.0, fontFace: FONT
  });
  // ピンク内ライン（上下）
  s.addShape(pres.shapes.RECTANGLE, {
    x: 1.32, y: 1.89, w: 7.36, h: 0.05, fill:{color:C.PINK}, line:{color:C.PINK}
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 1.32, y: 2.88, w: 7.36, h: 0.05, fill:{color:C.PINK}, line:{color:C.PINK}
  });

  // サブタイトル
  s.addText("～ プロクリエイターになるために ～", {
    x: 1.8, y: 3.1, w: 6.4, h: 0.55,
    fontSize: 16, color: C.GRAY, italic: true, align: "center", fontFace: FONT
  });

  // 下部バナー
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 5.15, w: 10, h: 0.475,
    fill: { color: C.NAVY }, line: { color: C.NAVY }
  });
  s.addText("Torihada-Creator-License-Center  ／  クリエイター研修", {
    x: 0, y: 5.15, w: 10, h: 0.475,
    fontSize: 13, color: C.WHITE, align: "center", valign: "middle", fontFace: FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 2: この動画で学ぶこと ①
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  s.addText("この動画で学ぶこと", {
    x: 0.5, y: 0.25, w: 9, h: 0.7,
    fontSize: 32, color: C.BLACK, bold: true, fontFace: FONT
  });

  // タイトル下ピンク帯（細め）
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.93, w: 9, h: 0.04,
    fill: { color: C.PINK_MID }, line: { color: C.PINK_MID }
  });

  const cardIllust = ["handshake.png", "star.png", "lightbulb.png"];
  const items = [
    { num:"01", title:"3者構造を理解する",    desc:"広告主・TORIHADA・\nクリエイターの関係と責任" },
    { num:"02", title:"研修済みフラグの価値",  desc:"優先的に案件オファーが届く\n仕組みを知る" },
    { num:"03", title:"プロとは何か",          desc:"フォロワー数ではなく\nビジネス基本が求められる理由" },
  ];

  items.forEach((item, i) => {
    const x = 0.5 + i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y: 1.05, w: 2.9, h: 4.1,
      fill: { color: C.WHITE }, line: { color: "E0E0E0", width: 1 }, rectRadius: 0.1,
      shadow: { type:"outer", color:"000000", blur:8, offset:2, angle:135, opacity:0.08 }
    });
    img(s, cardIllust[i], x + 0.45, 1.15, 2.0, 1.55);
    numCircle(s, item.num, x + 0.12, 2.82);
    s.addText(item.title, {
      x: x + 0.15, y: 3.5, w: 2.6, h: 0.6,
      fontSize: 15, color: C.BLACK, bold: true, fontFace: FONT
    });
    s.addText(item.desc, {
      x: x + 0.15, y: 4.15, w: 2.6, h: 0.85,
      fontSize: 12, color: C.GRAY, fontFace: FONT
    });
  });
}

// ──────────────────────────────────────────────
// SLIDE 3: PR案件の3者構造
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  s.addText('PR案件の「3者構造」を理解しよう', {
    x: 0.5, y: 0.2, w: 9, h: 0.65,
    fontSize: 26, color: C.BLACK, bold: true, fontFace: FONT
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.83, w: 9, h: 0.04,
    fill: { color: C.PINK_MID }, line: { color: C.PINK_MID }
  });

  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 1.0, w: 10, h: 3.9,
    fill: { color: C.PINK_LIGHT }, line: { color: C.PINK_LIGHT }
  });

  const boxes = [
    { title:"広告主様\n（クライアント）", desc:"商品・サービスをPRしたい企業", illust:"bar-chart.png",       x:0.35 },
    { title:"TORIHADA",                   desc:"案件をマネジメントし\nクリエイターに委託",  illust:"people-network.svg", x:3.55 },
    { title:"クリエイター\n（あなた）",    desc:"動画を制作・投稿し\n報酬を受け取る",       illust:"video-creator.svg",  x:6.75 },
  ];

  boxes.forEach((box) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x: box.x, y: 1.2, w: 2.9, h: 3.4,
      fill: { color: C.WHITE }, line: { color: "E8C0DA", width: 1 }, rectRadius: 0.1,
      shadow: { type:"outer", color:"000000", blur:6, offset:2, angle:135, opacity:0.1 }
    });
    img(s, box.illust, box.x + 0.45, 1.3, 2.0, 1.5);
    s.addText(box.title, {
      x: box.x + 0.1, y: 2.85, w: 2.7, h: 0.7,
      fontSize: 16, color: C.BLACK, bold: true, align: "center", fontFace: FONT
    });
    s.addText(box.desc, {
      x: box.x + 0.1, y: 3.6, w: 2.7, h: 0.8,
      fontSize: 12, color: C.GRAY, align: "center", fontFace: FONT
    });
  });

  // 矢印
  ["3.3", "6.5"].forEach(xStr => {
    s.addText("▶", { x: parseFloat(xStr), y: 2.65, w: 0.35, h: 0.5, fontSize: 18, color: C.PINK, align: "center", fontFace: FONT });
  });

  // 重要メモ
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 4.68, w: 9.2, h: 0.65,
    fill: { color: "FFF0F5" }, line: { color: C.PINK, width: 1.5 }, rectRadius: 0.07
  });
  s.addText("【重要】あなたと広告主は直接契約していない。あなたの言動 ＝ TORIHADAの評価につながる", {
    x: 0.55, y: 4.72, w: 8.9, h: 0.55,
    fontSize: 13, color: C.PINK, bold: true, align: "center", valign: "middle", fontFace: FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 4: 研修済みフラグ
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  hlText(s, '研修済みフラグで「選ばれる」クリエイターになる', 0.5, 0.2, 9, 0.65, {
    fontSize: 22, color: C.BLACK, bold: true
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0.5, y: 0.83, w: 9, h: 0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID}
  });

  // 左: 研修なし
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 1.05, w: 4.2, h: 4.1,
    fill:{color:"F9F9F9"}, line:{color:"DDDDDD",width:1}, rectRadius:0.1
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 0.4, y: 1.05, w: 4.2, h: 0.6,
    fill:{color:"CCCCCC"}, line:{color:"CCCCCC"}, rectRadius:0.1
  });
  s.addText("研修なし", {
    x: 0.4, y: 1.05, w: 4.2, h: 0.6,
    fontSize: 17, color: C.WHITE, bold: true, align: "center", valign: "middle", fontFace: FONT
  });
  ["案件オファーの優先度：低", "クオリティ保証ができない", "クライアントへの説明が難しい", "案件進行リスクが高い"].forEach((text, i) => {
    s.addText(`✗  ${text}`, {
      x: 0.6, y: 1.82 + i * 0.72, w: 3.8, h: 0.6,
      fontSize: 13, color: C.RED, fontFace: FONT
    });
  });

  // VS バッジ
  s.addShape(pres.shapes.OVAL, { x: 4.65, y: 2.5, w: 0.7, h: 0.7, fill:{color:C.PINK}, line:{color:C.PINK} });
  s.addText("VS", { x:4.65, y:2.53, w:0.7, h:0.7, fontSize:13, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT });

  // 右: 研修済み
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.4, y: 1.05, w: 4.2, h: 4.1,
    fill:{color:"FFF5FB"}, line:{color:C.PINK,width:1.5}, rectRadius:0.1
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x: 5.4, y: 1.05, w: 4.2, h: 0.6,
    fill:{color:C.PINK}, line:{color:C.PINK}, rectRadius:0.1
  });
  s.addText("研修済み ✓", {
    x: 5.4, y: 1.05, w: 4.2, h: 0.6,
    fontSize: 17, color: C.WHITE, bold: true, align: "center", valign: "middle", fontFace: FONT
  });
  ["案件オファーの優先度：高", "クオリティ保証済みとして紹介", "クライアントへの期待値コントロール可", "案件進行がスムーズ"].forEach((text, i) => {
    s.addText(`✓  ${text}`, {
      x: 5.6, y: 1.82 + i * 0.72, w: 3.8, h: 0.6,
      fontSize: 13, color: C.GREEN, bold: true, fontFace: FONT
    });
  });

  // トロフィーイラスト（右下・ボックス外に配置）
  img(s, "trophy-badge.svg", 7.1, 4.55, 1.5, 1.0, 10);
}

// ──────────────────────────────────────────────
// SLIDE 5: プロのクリエイターとは？（4分割レイアウト）
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  // タイトル帯（ピンク）
  s.addShape(pres.shapes.RECTANGLE, {
    x: 0, y: 0, w: 10, h: 1.0,
    fill: { color: C.PINK }, line: { color: C.PINK }
  });
  hlText(s, "プロのクリエイターとは？", 0.4, 0.05, 6.5, 0.65, {
    fontSize: 30, color: C.WHITE, bold: true
  });
  s.addText("フォロワー数ではなく、4つのビジネスの基本を守れる人", {
    x: 0.4, y: 0.68, w: 9, h: 0.28,
    fontSize: 12, color: C.WHITE, italic: true, fontFace: FONT
  });

  // 4分割ライン
  s.addShape(pres.shapes.LINE, { x:0, y:3.3, w:10, h:0, line:{color:C.BLACK,width:2} });
  s.addShape(pres.shapes.LINE, { x:5, y:1.0, w:0, h:4.625, line:{color:C.BLACK,width:2} });

  // 各象限のイラストとラベル
  const quads = [
    { illust:"calendar.png",      title:"納期を守る",         desc:"期限を守ることが信頼の基本\n遅れる場合は必ず事前連絡",      x:0.3, y:1.1 },
    { illust:"checklist.png",     title:"指示通りに動く",     desc:"ブリーフィングを正確に理解し\n勝手な判断で進めない",          x:5.2, y:1.1 },
    { illust:"document.png",      title:"情報を外に漏らさない",desc:"案件内容・クライアント情報は\n守秘義務あり（契約終了後1年）", x:0.3, y:3.4 },
    { illust:"speech-bubble.png", title:"ミスは隠さず報告",   desc:"トラブルの早期共有が被害最小化\n隠蔽は最大のNG",               x:5.2, y:3.4 },
  ];

  quads.forEach((q) => {
    img(s, q.illust, q.x + 0.35, q.y + 0.05, 1.65, 1.65);
    s.addText(q.title, {
      x: q.x + 2.1, y: q.y + 0.35, w: 2.5, h: 0.55,
      fontSize: 15, color: C.BLACK, bold: true, fontFace: FONT
    });
    s.addText(q.desc, {
      x: q.x + 2.1, y: q.y + 0.92, w: 2.5, h: 0.9,
      fontSize: 11, color: C.GRAY, fontFace: FONT
    });
  });
}

// ──────────────────────────────────────────────
// SLIDE 6: まとめ ①
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  s.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:0.78, fill:{color:C.PINK}, line:{color:C.PINK}
  });
  s.addText("まとめ　動画①", {
    x:0.4, y:0.08, w:8, h:0.62, fontSize:22, color:C.WHITE, bold:true, fontFace:FONT
  });

  const points = [
    "PR案件は「広告主・TORIHADA・クリエイター」の3者構造で動く",
    "研修修了フラグで、優先的に案件オファーが届く",
    "プロとは「ビジネスの基本を守れる人」のこと",
  ];
  points.forEach((pt, i) => {
    const y = 1.0 + i * 1.25;
    numCircle(s, i + 1, 0.5, y + 0.1, 0.65);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:1.3, y, w:8.2, h:0.9,
      fill:{color:C.WHITE}, line:{color:"E8C0DA",width:1}, rectRadius:0.07
    });
    s.addText(pt, {
      x:1.5, y:y+0.08, w:7.8, h:0.75,
      fontSize: 16, color: C.BLACK, valign: "middle", fontFace: FONT
    });
  });

  img(s, "star.png", 8.1, 3.5, 1.4, 1.1, 20);

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.4, y:4.78, w:9.2, h:0.6,
    fill:{color:"FFF0F5"}, line:{color:C.PINK,width:1}, rectRadius:0.07
  });
  s.addText("▶  Next  |  動画②：PR案件でやってはいけないこと", {
    x:0.55, y:4.83, w:8.8, h:0.5,
    fontSize:14, color:C.PINK, valign:"middle", fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 7: チャプター区切り ②
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setPinkBg(s);

  // 大きな番号
  s.addText("2", {
    x:-0.3, y:0.1, w:4.5, h:5.4,
    fontSize:300, color:C.WHITE, bold:true, align:"left", valign:"middle",
    transparency:20, margin:0, fontFace:FONT
  });

  // イラスト散らし
  img(s, "megaphone.svg",      7.0, 0.1, 2.7, 2.4, 10);
  img(s, "warning-person.svg", 7.5, 3.4, 2.2, 2.1, 10);
  img(s, "arrow.png",          0.2, 3.8, 1.8, 1.7, 30);

  // 白いカード
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:3.0, y:1.5, w:6.3, h:2.6,
    fill:{color:C.WHITE}, line:{color:C.WHITE}, rectRadius:0.18
  });
  s.addText("避けるべきNG行動", {
    x:3.2, y:1.75, w:5.9, h:1.1,
    fontSize:38, color:C.BLACK, bold:true, fontFace:FONT
  });
  s.addText("PR案件でやってはいけないこと", {
    x:3.2, y:2.85, w:5.9, h:0.65,
    fontSize:17, color:C.GRAY, fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 8: この動画で学ぶこと ②
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  s.addText("この動画で学ぶこと", {
    x:0.5, y:0.25, w:9, h:0.7, fontSize:32, color:C.BLACK, bold:true, fontFace:FONT
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x:0.5, y:0.93, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID}
  });

  const cardIllust = ["warning-person.svg", "shield-lock.svg", "contract-pen.svg"];
  const items = [
    { num:"01", title:"4つのNGケース",      desc:"実際に起きがちな違反行為を\n具体的な事例で確認する" },
    { num:"02", title:"違反するとどうなるか", desc:"損害賠償・契約解除など\nリアルなリスクを理解する" },
    { num:"03", title:"根拠となる規約条項",  desc:"第8条・第13条・第17条・\n第19条・第22条を押さえる" },
  ];
  items.forEach((item, i) => {
    const x = 0.5 + i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y:1.05, w:2.9, h:4.1,
      fill:{color:C.WHITE}, line:{color:"E0E0E0",width:1}, rectRadius:0.1,
      shadow:{type:"outer",color:"000000",blur:8,offset:2,angle:135,opacity:0.08}
    });
    img(s, cardIllust[i], x + 0.45, 1.15, 2.0, 1.55);
    numCircle(s, item.num, x + 0.12, 2.82);
    s.addText(item.title, { x:x+0.15, y:3.5, w:2.6, h:0.6, fontSize:15, color:C.BLACK, bold:true, fontFace:FONT });
    s.addText(item.desc,  { x:x+0.15, y:4.15, w:2.6, h:0.85, fontSize:12, color:C.GRAY, fontFace:FONT });
  });
}

// ──────────────────────────────────────────────
// SLIDE 9: 4つのNGケース
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  hlText(s, "やってはいけない！4つのNGケース", 0.5, 0.2, 9, 0.65, {
    fontSize:26, color:C.BLACK, bold:true
  });
  s.addShape(pres.shapes.RECTANGLE, {
    x:0.5, y:0.83, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID}
  });

  const ngs = [
    { title:"競合他社の案件を同時受注",    desc:"コスメ系案件Aの契約中に同カテゴリの別ブランドBのオファーを受注→ 即契約違反・降板", law:"第8条" },
    { title:"案件情報をSNSに投稿",         desc:"「撮影楽しかった！🎬」と投稿→ クライアント名・商品が特定できる状態は守秘義務違反", law:"第19条" },
    { title:"友人・知人に仕事を丸投げ",    desc:"「後輩に撮影だけ頼んだ」「編集を外注した」→ 書面承諾なしの再委託はすべて禁止", law:"第13条" },
    { title:"品位を損なう言動・SNS投稿",   desc:"炎上発言・不適切投稿→ 広告主のブランドイメージに直結。即時解除・損害賠償の対象", law:"第8条" },
  ];

  ngs.forEach((ng, i) => {
    const x = 0.4 + (i % 2) * 4.8;
    const y = 1.1 + Math.floor(i / 2) * 2.05;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w:4.55, h:1.85,
      fill:{color:"FFF5F5"}, line:{color:"FFCCCC",width:1}, rectRadius:0.1,
      shadow:{type:"outer",color:"000000",blur:5,offset:1,angle:135,opacity:0.07}
    });
    // NGバッジ
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:x+0.1, y:y+0.15, w:0.6, h:0.45,
      fill:{color:C.RED}, line:{color:C.RED}, rectRadius:0.07
    });
    s.addText("NG", { x:x+0.1, y:y+0.15, w:0.6, h:0.45, fontSize:13, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT });
    // 条文バッジ
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:x+3.7, y:y+0.15, w:0.75, h:0.4,
      fill:{color:C.PINK_LIGHT}, line:{color:C.PINK}, rectRadius:0.05
    });
    s.addText(ng.law, { x:x+3.7, y:y+0.15, w:0.75, h:0.4, fontSize:10, color:C.PINK, bold:true, align:"center", valign:"middle", fontFace:FONT });
    s.addText(ng.title, { x:x+0.8, y:y+0.18, w:2.85, h:0.5, fontSize:13, color:C.RED, bold:true, fontFace:FONT });
    s.addText(ng.desc,  { x:x+0.1, y:y+0.75, w:4.35, h:0.95, fontSize:12, color:C.GRAY, fontFace:FONT });
  });
}

// ──────────────────────────────────────────────
// SLIDE 9b: こんなケースはNG！（同日投稿）
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  // 赤タイトル帯
  s.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:0.85, fill:{color:C.RED}, line:{color:C.RED}
  });
  s.addText("🚫  こんなケースはNG！〜同日投稿編〜", {
    x:0.35, y:0.12, w:9.3, h:0.6,
    fontSize:22, color:C.WHITE, bold:true, fontFace:FONT
  });

  // ── 左半分: ストーリー ──
  // Step 1
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.3, y:1.05, w:4.5, h:1.25,
    fill:{color:"FFF9F9"}, line:{color:"FFCCCC",width:1.2}, rectRadius:0.1
  });
  numCircle(s, 1, 0.28, 1.07, 0.5);
  img(s, "smartphone-pr.svg", 0.82, 1.12, 0.95, 0.92);
  s.addText("メイク系クリエイターAさん、\nコスメブランドXのPR動画の投稿日を迎えた", {
    x:1.88, y:1.12, w:2.78, h:0.82,
    fontSize:11, color:C.BLACK, fontFace:FONT
  });

  // 下矢印
  s.addText("▼", {
    x:2.15, y:2.35, w:0.55, h:0.38,
    fontSize:18, color:C.RED, align:"center", fontFace:FONT
  });

  // Step 2（NG発生）
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.3, y:2.78, w:4.5, h:1.3,
    fill:{color:"FFF0F0"}, line:{color:C.RED,width:2}, rectRadius:0.1
  });
  numCircle(s, 2, 0.28, 2.8, 0.5);
  img(s, "calendar.png", 0.85, 2.9, 0.92, 0.88);
  s.addText("同じ日に、別のメイク用品\nブランドYのPR投稿も公開してしまった！", {
    x:1.88, y:2.88, w:2.78, h:0.82,
    fontSize:11, color:C.RED, bold:true, fontFace:FONT
  });

  // 右向き矢印
  s.addText("▶", {
    x:4.85, y:2.88, w:0.45, h:0.5,
    fontSize:22, color:C.RED, align:"center", fontFace:FONT
  });

  // ── 右半分: 結果 ──
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:5.42, y:1.05, w:4.25, h:1.75,
    fill:{color:"FFF0F0"}, line:{color:C.RED,width:2}, rectRadius:0.1
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:5.55, y:1.13, w:1.75, h:0.38,
    fill:{color:C.RED}, line:{color:C.RED}, rectRadius:0.07
  });
  s.addText("どうなった？", {
    x:5.55, y:1.13, w:1.75, h:0.38,
    fontSize:12, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT
  });
  img(s, "document.png", 8.95, 1.1, 0.65, 0.65, 15);
  ["⚠️  ブランドXから削除要請が入る", "⚠️  案件降板・報酬全額没収リスク", "⚠️  今後のオファー機会を失う"].forEach((t, i) => {
    s.addText(t, {
      x:5.58, y:1.58+i*0.38, w:3.95, h:0.34,
      fontSize:11, color:C.RED, fontFace:FONT
    });
  });

  // ルールボックス
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:5.42, y:2.93, w:4.25, h:1.65,
    fill:{color:C.WHITE}, line:{color:C.NAVY,width:1.5}, rectRadius:0.1
  });
  s.addText("📋  TORIHADAのルール（発注書特記事項）", {
    x:5.55, y:3.0, w:4.0, h:0.4,
    fontSize:11, color:C.NAVY, bold:true, fontFace:FONT
  });
  [
    "PR投稿日に他のPR投稿を同日公開はNG",
    "オーガニック投稿も同日はNG",
    "やむを得ない場合は事前申告が必須",
  ].forEach((r, i) => {
    s.addText(`✗  ${r}`, {
      x:5.58, y:3.48+i*0.36, w:4.0, h:0.32,
      fontSize:11, color:C.BLACK, fontFace:FONT
    });
  });

  // 下部メモ帯
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.3, y:4.82, w:9.4, h:0.6,
    fill:{color:C.PINK_LIGHT}, line:{color:C.PINK,width:1.2}, rectRadius:0.08
  });
  s.addText("💡  「同日投稿禁止」は発注書の特記事項に明記されています。知らなかったでは通じません！", {
    x:0.52, y:4.87, w:9.0, h:0.5,
    fontSize:12, color:C.PINK, bold:true, valign:"middle", fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 9c: 発注書特記事項のNGルール（6種）
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  s.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:0.78, fill:{color:C.NAVY}, line:{color:C.NAVY}
  });
  s.addText("発注書（特記事項）で定められたNGルール", {
    x:0.4, y:0.1, w:9.2, h:0.58,
    fontSize:20, color:C.WHITE, bold:true, fontFace:FONT
  });

  const specRules = [
    { icon:"calendar.png",      title:"同日投稿禁止",          desc:"PR投稿日は他のPR・オーガニック\n投稿を同日公開してはいけない",   color:C.RED },
    { icon:"document.png",      title:"素材の使い回し禁止",     desc:"他案件の素材や過去動画の素材を\n本件に流用するのはNG",           color:C.PINK },
    { icon:"speech-bubble.png", title:"PR表記の義務（WOMJ）",  desc:"「#PR」等WOMJガイドラインに\n従った表記が必須",                color:C.GREEN },
    { icon:"checklist.png",     title:"撮影許諾の取得",         desc:"私有地以外での撮影は撮影・\n商用利用の許諾が必要",             color:"E88020" },
    { icon:"gears.png",         title:"商品訴求変化行為禁止",   desc:"案件期間中に訴求内容と矛盾する\n行為はNG（例：ヘアケア×染髪）",  color:"6D2E46" },
    { icon:"star.png",          title:"投稿動画の削除不可",      desc:"投稿動画は原則削除できない。\n削除は発注者のみ権限を持つ",      color:C.NAVY },
  ];

  specRules.forEach((r, i) => {
    const col = i % 2;
    const row = Math.floor(i / 2);
    const x = 0.3 + col * 4.85;
    const y = 0.93 + row * 1.52;

    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w:4.6, h:1.38,
      fill:{color:C.WHITE}, line:{color:"E0E0E0",width:1}, rectRadius:0.1,
      shadow:{type:"outer",color:"000000",blur:5,offset:1,angle:135,opacity:0.08}
    });
    // 左カラーバー
    s.addShape(pres.shapes.RECTANGLE, {
      x, y, w:0.14, h:1.38,
      fill:{color:r.color}, line:{color:r.color}
    });
    img(s, r.icon, x+0.22, y+0.24, 0.85, 0.85);
    // NGバッジ
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:x+3.76, y:y+0.13, w:0.72, h:0.35,
      fill:{color:C.RED}, line:{color:C.RED}, rectRadius:0.05
    });
    s.addText("NG", {
      x:x+3.76, y:y+0.13, w:0.72, h:0.35,
      fontSize:12, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT
    });
    s.addText(r.title, {
      x:x+1.15, y:y+0.18, w:2.55, h:0.42,
      fontSize:13, color:C.BLACK, bold:true, fontFace:FONT
    });
    s.addText(r.desc, {
      x:x+1.15, y:y+0.63, w:2.75, h:0.67,
      fontSize:10, color:C.GRAY, fontFace:FONT
    });
  });

  // 下部注意帯
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.3, y:5.33, w:9.4, h:0.27,
    fill:{color:C.PINK_LIGHT}, line:{color:C.PINK,width:1}, rectRadius:0.05
  });
  s.addText("⚠️  上記はすべて発注書の特記事項に明記されたルールです。案件受注前に必ず確認してください。", {
    x:0.5, y:5.33, w:9.0, h:0.27,
    fontSize:10, color:C.PINK, bold:true, align:"center", valign:"middle", fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 10: 違反するとどうなるか（同日投稿ケース詳細＋契約リスク）
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  // ── タイトル帯（ダークレッド）──
  s.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:0.82, fill:{color:"C0392B"}, line:{color:"C0392B"}
  });
  s.addText("⚠️  違反するとどうなるか", {
    x:0.35, y:0.1, w:7.5, h:0.62,
    fontSize:24, color:C.WHITE, bold:true, fontFace:FONT
  });
  // 右上にサブラベル
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:7.9, y:0.18, w:1.9, h:0.42,
    fill:{color:"FF6B6B"}, line:{color:"FF6B6B"}, rectRadius:0.07
  });
  s.addText("同日投稿ケース", {
    x:7.9, y:0.18, w:1.9, h:0.42,
    fontSize:11, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT
  });

  // ─────────────────────────────
  // 左半分：実際の対応フロー（4ステップ）
  // ─────────────────────────────
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.2, y:0.95, w:4.55, h:0.42,
    fill:{color:"C0392B"}, line:{color:"C0392B"}, rectRadius:0.07
  });
  s.addText("📋  同日投稿違反が発覚した後の流れ", {
    x:0.3, y:0.97, w:4.3, h:0.38,
    fontSize:12, color:C.WHITE, bold:true, valign:"middle", fontFace:FONT
  });

  // 縦ライン（フロー）
  s.addShape(pres.shapes.LINE, {
    x:0.82, y:1.55, w:0, h:3.1,
    line:{color:"FFCCCC", width:2.5}
  });

  const flowSteps = [
    { icon:"speech-bubble.png", title:"TORIHADA担当者から連絡が入る",    desc:"「同日に別ブランドのPR投稿を確認しました」と\n即日連絡。状況説明を求められる",          color:C.RED },
    { icon:"document.png",      title:"投稿の削除依頼・クライアントへ謝罪", desc:"ブランドXへの謝罪対応をTORIHADA担当者が実施。\nクリエイターも経緯を文書で説明する場合がある",  color:"E88020" },
    { icon:"coins-money.png",   title:"案件降板・報酬支払いが停止される",   desc:"ルール違反による降板のため、報酬は支払われない\n場合がある。損害賠償の請求対象にもなりうる",    color:"E88020" },
    { icon:"checklist.png",     title:"以降の案件オファーが全停止される",   desc:"TORIHADAのクリエイターリストから\n信頼評価が下がり、以降のオファーが来なくなる",      color:C.NAVY },
  ];

  flowSteps.forEach((step, i) => {
    const y = 1.55 + i * 0.82;
    // 丸バッジ
    s.addShape(pres.shapes.OVAL, {
      x:0.55, y:y+0.05, w:0.55, h:0.55,
      fill:{color:step.color}, line:{color:step.color}
    });
    s.addText(String(i+1), {
      x:0.55, y:y+0.05, w:0.55, h:0.55,
      fontSize:14, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT
    });
    img(s, step.icon, 1.22, y+0.02, 0.55, 0.55, 15);
    s.addText(step.title, {
      x:1.88, y:y+0.02, w:2.75, h:0.3,
      fontSize:11, color:C.BLACK, bold:true, fontFace:FONT
    });
    s.addText(step.desc, {
      x:1.88, y:y+0.34, w:2.75, h:0.42,
      fontSize:9.5, color:C.GRAY, fontFace:FONT
    });
  });

  // ─────────────────────────────
  // 右半分：契約上のリスク（3種）
  // ─────────────────────────────
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:5.0, y:0.95, w:4.75, h:0.42,
    fill:{color:C.NAVY}, line:{color:C.NAVY}, rectRadius:0.07
  });
  s.addText("📑  契約違反のリスク（規約より）", {
    x:5.1, y:0.97, w:4.5, h:0.38,
    fontSize:12, color:C.WHITE, bold:true, valign:"middle", fontFace:FONT
  });

  const risks = [
    {
      law:"第17条", icon:"document.png",
      title:"損害賠償の請求",
      desc:"直接損害・間接損害・逸失利益・弁護士費用まで\nすべて賠償対象。案件規模によっては数百万円規模。",
      color:C.RED
    },
    {
      law:"第22条", icon:"arrow.png",
      title:"即時契約解除",
      desc:"重大な違反・信用失墜は催告なしで即時解除。\nその後のオファーは一切届かなくなる。",
      color:C.RED
    },
    {
      law:"第8条", icon:"growth-graph.png",
      title:"ブランド・TORIHADAへのダメージ",
      desc:"広告主のイメージ低下・TORIHADAへのクライアント\n離れにつながり、業界全体への影響も生じる。",
      color:"E88020"
    },
  ];

  risks.forEach((r, i) => {
    const y = 1.5 + i * 1.28;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:5.0, y, w:4.75, h:1.15,
      fill:{color:C.WHITE}, line:{color:"FFCCCC",width:1.2}, rectRadius:0.1,
      shadow:{type:"outer",color:"000000",blur:5,offset:1,angle:135,opacity:0.07}
    });
    // 左カラーバー
    s.addShape(pres.shapes.RECTANGLE, {
      x:5.0, y, w:0.13, h:1.15,
      fill:{color:r.color}, line:{color:r.color}
    });
    img(s, r.icon, 5.18, y+0.15, 0.72, 0.72, 15);
    // 条文バッジ
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:9.35, y:y+0.1, w:0.32, h:0.95,
      fill:{color:"FFF0F5"}, line:{color:C.PINK,width:1}, rectRadius:0.05
    });
    s.addText(r.law, {
      x:9.35, y:y+0.1, w:0.32, h:0.95,
      fontSize:8, color:C.PINK, bold:true, align:"center", valign:"middle", fontFace:FONT
    });
    s.addText(r.title, {
      x:6.0, y:y+0.1, w:3.25, h:0.38,
      fontSize:14, color:r.color, bold:true, fontFace:FONT
    });
    s.addText(r.desc, {
      x:6.0, y:y+0.5, w:3.25, h:0.58,
      fontSize:10, color:C.GRAY, fontFace:FONT
    });
  });

  // ── 下部バナー ──
  s.addShape(pres.shapes.RECTANGLE, {
    x:0, y:5.15, w:10, h:0.475,
    fill:{color:"FFF0F0"}, line:{color:C.RED,width:1}
  });
  s.addText("「知らなかった」は免責にならない。この研修を受けたあなたには、知っている責任がある。", {
    x:0.4, y:5.18, w:9.2, h:0.42,
    fontSize:13, color:"C0392B", bold:true, align:"center", valign:"middle", fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 11: まとめ ②
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.78, fill:{color:C.PINK}, line:{color:C.PINK} });
  s.addText("まとめ　動画②", { x:0.4, y:0.08, w:8, h:0.62, fontSize:22, color:C.WHITE, bold:true, fontFace:FONT });

  const points = [
    "競合案件の同時受注・無断再委託・情報漏洩・品位を損なう言動はすべてNG",
    "違反は損害賠償・即時契約解除につながる（第17条・第22条）",
    "「知らなかった」は免責にならない。知っている責任がある",
  ];
  points.forEach((pt, i) => {
    const y = 1.0 + i * 1.25;
    numCircle(s, i + 1, 0.5, y + 0.1, 0.65);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:1.3, y, w:8.2, h:0.9, fill:{color:C.WHITE}, line:{color:"E8C0DA",width:1}, rectRadius:0.07
    });
    s.addText(pt, { x:1.5, y:y+0.08, w:7.8, h:0.75, fontSize:15, color:C.BLACK, valign:"middle", fontFace:FONT });
  });
  img(s, "document.png", 8.0, 3.82, 1.6, 0.88, 10);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.4, y:4.78, w:9.2, h:0.6,
    fill:{color:"FFF0F5"}, line:{color:C.PINK,width:1}, rectRadius:0.07
  });
  s.addText("▶  Next  |  動画③：社内規約を理解しよう", {
    x:0.55, y:4.83, w:8.8, h:0.5, fontSize:14, color:C.PINK, valign:"middle", fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 12: チャプター区切り ③
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setPinkBg(s);

  s.addText("3", {
    x:-0.3, y:0.1, w:4.5, h:5.4,
    fontSize:300, color:C.WHITE, bold:true, align:"left", valign:"middle",
    transparency:20, margin:0, fontFace:FONT
  });

  img(s, "checklist.png",  7.0, 0.1, 2.7, 2.4, 20);
  img(s, "document.png",   7.8, 3.4, 2.0, 2.1, 20);
  img(s, "star.png",       0.2, 3.5, 1.8, 1.8, 30);

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:3.0, y:1.5, w:6.3, h:2.6, fill:{color:C.WHITE}, line:{color:C.WHITE}, rectRadius:0.18
  });
  s.addText("社内規約を理解しよう", {
    x:3.2, y:1.75, w:5.9, h:1.1, fontSize:38, color:C.BLACK, bold:true, fontFace:FONT
  });
  s.addText("守るべきルールをしっかりと把握する", {
    x:3.2, y:2.85, w:5.9, h:0.65, fontSize:17, color:C.GRAY, fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 13: この動画で学ぶこと ③
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  s.addText("この動画で学ぶこと", { x:0.5, y:0.25, w:9, h:0.7, fontSize:32, color:C.BLACK, bold:true, fontFace:FONT });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:0.93, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID} });

  const cardIllust = ["shield-lock.svg", "warning-person.svg", "checklist.png"];
  const items = [
    { num:"01", title:"守秘義務の範囲",    desc:"秘密情報の定義と\n義務の継続期間を理解する" },
    { num:"02", title:"個人情報の取り扱い", desc:"委託業務で触れる個人情報の\n正しい管理方法を学ぶ" },
    { num:"03", title:"禁止事項チェック",  desc:"再委託・競合PR・品位を損なう\n行為のルールを確認する" },
  ];
  items.forEach((item, i) => {
    const x = 0.5 + i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y:1.05, w:2.9, h:4.1, fill:{color:C.WHITE}, line:{color:"E0E0E0",width:1}, rectRadius:0.1,
      shadow:{type:"outer",color:"000000",blur:8,offset:2,angle:135,opacity:0.08}
    });
    img(s, cardIllust[i], x + 0.45, 1.15, 2.0, 1.55);
    numCircle(s, item.num, x + 0.12, 2.82);
    s.addText(item.title, { x:x+0.15, y:3.5,  w:2.6, h:0.6,  fontSize:15, color:C.BLACK, bold:true, fontFace:FONT });
    s.addText(item.desc,  { x:x+0.15, y:4.15, w:2.6, h:0.85, fontSize:12, color:C.GRAY, fontFace:FONT });
  });
}

// ──────────────────────────────────────────────
// SLIDE 14: 守秘義務の範囲
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  hlText(s, "守秘義務：いつまで？何が対象？（第19条・第27条）", 0.5, 0.2, 9, 0.65, {
    fontSize:22, color:C.BLACK, bold:true
  });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:0.83, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID} });

  // 左: 継続期間
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.4, y:1.05, w:4.0, h:3.75,
    fill:{color:C.PINK_LIGHT}, line:{color:C.PINK,width:1.5}, rectRadius:0.1
  });
  s.addText("義務の継続期間", { x:0.5, y:1.15, w:3.8, h:0.42, fontSize:14, color:C.PINK, bold:true, fontFace:FONT });
  s.addText("契約終了後\n1年間", {
    x:0.5, y:1.6, w:3.8, h:1.4,
    fontSize:48, color:C.PINK, bold:true, align:"center", valign:"middle", fontFace:FONT
  });
  s.addText("有効に存続します（第27条）", { x:0.5, y:3.1, w:3.8, h:0.38, fontSize:13, color:C.GRAY, align:"center", fontFace:FONT });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.5, y:3.55, w:3.8, h:0.55, fill:{color:C.PINK}, line:{color:C.PINK}, rectRadius:0.07
  });
  s.addText("案件が終わっても情報は守り続ける！", {
    x:0.5, y:3.55, w:3.8, h:0.55, fontSize:12, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT
  });
  img(s, "shield-lock.svg", 0.55, 4.2, 0.95, 1.1, 10);

  // 右: 秘密情報の例
  s.addText("秘密情報に該当するもの（例）", { x:4.7, y:1.05, w:5, h:0.42, fontSize:14, color:C.BLACK, bold:true, fontFace:FONT });
  ["クライアント名・商品情報", "撮影内容・スケジュール", "報酬金額・契約条件", "未公開のキャンペーン情報"].forEach((text, i) => {
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:4.7, y:1.52+i*0.6, w:4.8, h:0.5,
      fill:{color:C.WHITE}, line:{color:"E8C0DA",width:1}, rectRadius:0.07
    });
    s.addText(`🔒  ${text}`, { x:4.85, y:1.54+i*0.6, w:4.5, h:0.45, fontSize:13, color:C.BLACK, valign:"middle", fontFace:FONT });
  });
  s.addText("開示が認められる例外ケース", { x:4.7, y:4.0, w:5, h:0.38, fontSize:13, color:C.GRAY, bold:true, fontFace:FONT });
  ["TORIHADAの承諾を得た再委託先への開示", "法令・裁判所命令による場合"].forEach((text, i) => {
    s.addText(`✓  ${text}`, { x:4.85, y:4.42+i*0.5, w:4.7, h:0.42, fontSize:11, color:C.GRAY, fontFace:FONT });
  });
}

// ──────────────────────────────────────────────
// SLIDE 15: 個人情報の取り扱いルール
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  hlText(s, "個人情報の取り扱いルール（第16条）", 0.5, 0.2, 9, 0.65, {
    fontSize:26, color:C.BLACK, bold:true
  });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:0.83, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID} });

  // やるべきこと
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.4, y:1.05, w:4.5, h:4.15, fill:{color:"F0FFF4"}, line:{color:C.GREEN,width:1.5}, rectRadius:0.1
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.4, y:1.05, w:4.5, h:0.58, fill:{color:C.GREEN}, line:{color:C.GREEN}, rectRadius:0.1
  });
  s.addText("✅ やるべきこと", {
    x:0.4, y:1.05, w:4.5, h:0.58, fontSize:16, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT
  });
  const dos = [
    "委託業務の目的範囲内のみで使用する\n（案件遂行のために必要な範囲だけ）",
    "合理的な安全管理措置を講じる\n（不正アクセス・紛失・漏洩を防ぐ対策）",
    "漏洩事故はすぐにTORIHADAへ報告する\n（発生日時・内容を速やかに連絡）",
  ];
  dos.forEach((d, i) => {
    s.addText(`✓  ${d}`, { x:0.6, y:1.78+i*1.08, w:4.1, h:0.9, fontSize:11, color:C.BLACK, fontFace:FONT });
  });

  // やってはいけないこと
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:5.1, y:1.05, w:4.5, h:4.15, fill:{color:"FFF5F5"}, line:{color:C.RED,width:1.5}, rectRadius:0.1
  });
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:5.1, y:1.05, w:4.5, h:0.58, fill:{color:C.RED}, line:{color:C.RED}, rectRadius:0.1
  });
  s.addText("🚫 やってはいけないこと", {
    x:5.1, y:1.05, w:4.5, h:0.58, fontSize:16, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT
  });
  const donts = [
    "目的外に個人情報を使用・加工・複写する\n（案件と無関係な用途での利用は禁止）",
    "第三者に無断で個人情報を提供する\n（顧客情報等を外部へ渡すのは厳禁）",
    "漏洩を隠す・報告を遅らせる\n（発覚を遅らせると損害賠償リスクが拡大）",
  ];
  donts.forEach((d, i) => {
    s.addText(`✗  ${d}`, { x:5.3, y:1.78+i*1.08, w:4.1, h:0.9, fontSize:11, color:C.BLACK, fontFace:FONT });
  });
}

// ──────────────────────────────────────────────
// SLIDE 16: 禁止事項チェックリスト
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  hlText(s, "禁止事項チェックリスト（総まとめ）", 0.5, 0.15, 9, 0.6, {
    fontSize:26, color:C.BLACK, bold:true
  });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:0.73, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID} });
  s.addText("案件を受ける前に必ず確認してください", {
    x:0.5, y:0.78, w:9, h:0.32, fontSize:13, color:C.GRAY, fontFace:FONT
  });

  const okItems = [
    { text:"競合他社の案件と重複していないか確認した", law:"第8条" },
    { text:"案件情報・クライアント名は外部に一切話さない", law:"第19条" },
    { text:"第三者に仕事を回す場合は事前にTORIHADAへ相談する", law:"第13条" },
    { text:"成果物の著作権はTORIHADAに帰属することを理解した", law:"第20条" },
  ];
  const ngItems = [
    { text:"SNSに「撮影楽しかった！」と案件を匂わせる投稿をする", law:"第19条" },
    { text:"仕事の途中でキャストを勝手に変更する", law:"第8条" },
    { text:"納品後に自分のポートフォリオとして無断使用する", law:"第20条" },
  ];

  // OK欄
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:0.4, y:1.2, w:4.6, h:0.38, fill:{color:C.GREEN}, line:{color:C.GREEN}, rectRadius:0.07 });
  s.addText("✅ やっていいこと / 守ること", { x:0.4, y:1.2, w:4.6, h:0.38, fontSize:12, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT });
  okItems.forEach((item, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x:0.4, y:1.63+i*0.52, w:4.6, h:0.47,
      fill:{color: i%2===0?C.WHITE:"F5FFF7"}, line:{color:"C8E6C9",width:0.5}
    });
    s.addText(`✓  ${item.text}`, { x:0.52, y:1.64+i*0.52, w:4.35, h:0.44, fontSize:10, color:C.BLACK, valign:"middle", fontFace:FONT });
  });

  // NG欄
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:5.2, y:1.2, w:4.4, h:0.38, fill:{color:C.RED}, line:{color:C.RED}, rectRadius:0.07 });
  s.addText("🚫 絶対にやってはいけないこと", { x:5.2, y:1.2, w:4.4, h:0.38, fontSize:12, color:C.WHITE, bold:true, align:"center", valign:"middle", fontFace:FONT });
  ngItems.forEach((item, i) => {
    s.addShape(pres.shapes.RECTANGLE, {
      x:5.2, y:1.63+i*0.52, w:4.4, h:0.47,
      fill:{color: i%2===0?C.WHITE:"FFF5F5"}, line:{color:"FFCCCC",width:0.5}
    });
    s.addText(`✗  ${item.text}`, { x:5.32, y:1.64+i*0.52, w:4.18, h:0.44, fontSize:10, color:C.RED, valign:"middle", fontFace:FONT });
  });

  // 知らなかった名言
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.4, y:3.85, w:9.2, h:0.82, fill:{color:C.PINK_LIGHT}, line:{color:C.PINK,width:1.5}, rectRadius:0.1
  });
  hlText(s, "「知らなかった」は免責にならない。知っている責任がある。", 0.6, 3.9, 8.8, 0.72, {
    fontSize:16, color:C.PINK, bold:true, align:"center", valign:"middle"
  });
}

// ──────────────────────────────────────────────
// SLIDE 17: まとめ ③
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  s.addShape(pres.shapes.RECTANGLE, { x:0, y:0, w:10, h:0.78, fill:{color:C.PINK}, line:{color:C.PINK} });
  s.addText("まとめ　動画③", { x:0.4, y:0.08, w:8, h:0.62, fontSize:22, color:C.WHITE, bold:true, fontFace:FONT });

  const points = [
    "守秘義務は契約終了後も1年間継続する（第19条・第27条）",
    "個人情報は目的範囲内のみで扱い、漏洩はすぐ報告（第16条）",
    "再委託・競合PR・匂わせ投稿はすべて禁止事項",
  ];
  points.forEach((pt, i) => {
    const y = 1.0 + i * 1.25;
    numCircle(s, i + 1, 0.5, y + 0.1, 0.65);
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:1.3, y, w:8.2, h:0.9, fill:{color:C.WHITE}, line:{color:"E8C0DA",width:1}, rectRadius:0.07 });
    s.addText(pt, { x:1.5, y:y+0.08, w:7.8, h:0.75, fontSize:15, color:C.BLACK, valign:"middle", fontFace:FONT });
  });
  img(s, "document.png", 8.0, 3.82, 1.6, 0.88, 10);
  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.4, y:4.78, w:9.2, h:0.6, fill:{color:"FFF0F5"}, line:{color:C.PINK,width:1}, rectRadius:0.07
  });
  s.addText("▶  Next  |  動画④：契約書の読み方＆コーポレート連携フロー", {
    x:0.55, y:4.83, w:8.8, h:0.5, fontSize:14, color:C.PINK, valign:"middle", fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 18: チャプター区切り ④
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setPinkBg(s);

  s.addText("4", {
    x:-0.3, y:0.1, w:4.5, h:5.4,
    fontSize:300, color:C.WHITE, bold:true, align:"left", valign:"middle",
    transparency:20, margin:0, fontFace:FONT
  });

  img(s, "document.png",  7.0, 0.1, 2.7, 2.4, 20);
  img(s, "calendar.png",  7.8, 3.4, 2.0, 2.0, 20);
  img(s, "arrow.png",     0.2, 3.8, 1.8, 1.7, 30);

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:3.0, y:1.5, w:6.3, h:2.6, fill:{color:C.WHITE}, line:{color:C.WHITE}, rectRadius:0.18
  });
  s.addText("契約書の読み方\n＆コーポレート連携フロー", {
    x:3.2, y:1.65, w:5.9, h:1.5, fontSize:32, color:C.BLACK, bold:true, fontFace:FONT
  });
  s.addText("自分を守るための知識", { x:3.2, y:3.15, w:5.9, h:0.65, fontSize:17, color:C.GRAY, fontFace:FONT });
}

// ──────────────────────────────────────────────
// SLIDE 19: この動画で学ぶこと ④
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  s.addText("この動画で学ぶこと", { x:0.5, y:0.25, w:9, h:0.7, fontSize:32, color:C.BLACK, bold:true, fontFace:FONT });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:0.93, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID} });

  const cardIllust = ["contract-pen.svg", "coins-money.png", "arrow.png"];
  const items = [
    { num:"01", title:"個別契約書の重要条項", desc:"何を確認すべきか・\nサイン前のチェックポイント" },
    { num:"02", title:"報酬・支払いルール",   desc:"委託料の支払い期限・\n遅延損害金・費用の扱い" },
    { num:"03", title:"コーポレート連携フロー", desc:"契約締結〜請求〜入金まで\nの流れを把握する" },
  ];
  items.forEach((item, i) => {
    const x = 0.5 + i * 3.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y:1.05, w:2.9, h:4.1, fill:{color:C.WHITE}, line:{color:"E0E0E0",width:1}, rectRadius:0.1,
      shadow:{type:"outer",color:"000000",blur:8,offset:2,angle:135,opacity:0.08}
    });
    img(s, cardIllust[i], x + 0.45, 1.15, 2.0, 1.55);
    numCircle(s, item.num, x + 0.12, 2.82);
    s.addText(item.title, { x:x+0.15, y:3.5,  w:2.6, h:0.6,  fontSize:15, color:C.BLACK, bold:true, fontFace:FONT });
    s.addText(item.desc,  { x:x+0.15, y:4.15, w:2.6, h:0.85, fontSize:12, color:C.GRAY, fontFace:FONT });
  });
}

// ──────────────────────────────────────────────
// SLIDE 20: 個別契約書チェックポイント
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  hlText(s, "個別契約書：サイン前に必ず確認すべき重要条項（第7条）", 0.5, 0.15, 8.2, 0.6, {
    fontSize:21, color:C.BLACK, bold:true
  });
  img(s, "contract-pen.svg", 8.7, 0.0, 1.2, 1.25, 10);
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:0.73, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID} });

  const checks = [
    { num:"①", title:"委託業務の内容・範囲", desc:"何をどこまでやるか。「その他付随する業務」の範囲も要チェック", law:"第7条①" },
    { num:"②", title:"納入期限・作業スケジュール", desc:"いつまでに何を納品するか。遅延すると契約不適合責任が生じる", law:"第7条②③" },
    { num:"③", title:"委託料・支払い方法", desc:"いくら・いつ・どの口座に。下請法対象者は60日以内", law:"第7条⑥" },
    { num:"④", title:"著作権・二次利用の扱い", desc:"成果物の著作権はTORIHADAへ帰属。二次利用の範囲も確認必須", law:"第7条⑨" },
    { num:"⑤", title:"肖像等の使用期間・範囲", desc:"いつまで・どの媒体で自分の顔・名前が使われるかを必ず確認", law:"第7条⑦⑧" },
    { num:"⑥", title:"解除・キャンセル条件", desc:"どんな場合に契約が終了するか。催告なし解除のケースは特に注意", law:"第22条" },
  ];

  checks.forEach((c, i) => {
    const x = 0.4 + (i % 2) * 4.8;
    const y = 0.9 + Math.floor(i / 2) * 1.55;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x, y, w:4.55, h:1.4, fill:{color:C.WHITE}, line:{color:"E0E0E0",width:1}, rectRadius:0.1,
      shadow:{type:"outer",color:"000000",blur:4,offset:1,angle:135,opacity:0.07}
    });
    s.addShape(pres.shapes.OVAL, { x:x+0.1, y:y+0.1, w:0.55, h:0.55, fill:{color:C.PINK_LIGHT}, line:{color:C.PINK,width:1} });
    s.addText(c.num, { x:x+0.1, y:y+0.1, w:0.55, h:0.55, fontSize:16, color:C.PINK, bold:true, align:"center", valign:"middle", fontFace:FONT });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:x+3.9, y:y+0.1, w:0.6, h:0.35, fill:{color:C.PINK_LIGHT}, line:{color:C.PINK}, rectRadius:0.05 });
    s.addText(c.law, { x:x+3.9, y:y+0.1, w:0.6, h:0.35, fontSize:9, color:C.PINK, bold:true, align:"center", valign:"middle", fontFace:FONT });
    s.addText(c.title, { x:x+0.75, y:y+0.12, w:3.1, h:0.5, fontSize:14, color:C.BLACK, bold:true, fontFace:FONT });
    s.addText(c.desc,  { x:x+0.1,  y:y+0.65, w:4.35, h:0.7, fontSize:11, color:C.GRAY, fontFace:FONT });
  });
}

// ──────────────────────────────────────────────
// SLIDE 21: 報酬受け取りまでの流れ（STEP 1-5）
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  hlText(s, "報酬受け取りまでの流れ", 0.5, 0.2, 9, 0.65, { fontSize:28, color:C.BLACK, bold:true });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:0.83, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID} });

  // イラスト（右上）
  img(s, "coins-money.png", 7.8, 0.9, 2.0, 1.6, 20);

  // フローライン
  s.addShape(pres.shapes.LINE, { x:0.8, y:2.55, w:8.5, h:0, line:{color:C.PINK,width:3} });

  const steps = [
    { step:"STEP 1", title:"案件オファー\n受信", icon:"📨", desc:"TORIHADAから\nメール・チャットで\n案件情報が届く" },
    { step:"STEP 2", title:"個別契約書\nへの合意", icon:"✍️", desc:"電子押印または\n書面でサイン・\n締結" },
    { step:"STEP 3", title:"業務遂行・\n納品", icon:"🎬", desc:"期限内に成果物を\n納品。検収7営業日" },
    { step:"STEP 4", title:"請求書の\n提出", icon:"🧾", desc:"所定フォームで\nTORIHADA担当者へ" },
    { step:"STEP 5", title:"報酬振込", icon:"💰", desc:"個別契約の\n支払い期日に振込" },
  ];

  steps.forEach((st, i) => {
    const x = 0.7 + i * 1.75;
    s.addShape(pres.shapes.OVAL, { x:x+0.4, y:2.4, w:0.3, h:0.3, fill:{color:C.PINK}, line:{color:C.PINK} });
    s.addText(st.icon, { x:x+0.05, y:0.95, w:1.1, h:0.95, fontSize:40, align:"center" });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:x+0.05, y:2.8, w:1.4, h:0.48, fill:{color:C.WHITE}, line:{color:C.PINK,width:1.5}, rectRadius:0.07 });
    s.addText(st.step, { x:x+0.05, y:2.8, w:1.4, h:0.48, fontSize:11, color:C.PINK, bold:true, align:"center", valign:"middle", fontFace:FONT });
    s.addText(st.title, { x:x+0.0, y:3.35, w:1.5, h:0.65, fontSize:12, color:C.BLACK, bold:true, align:"center", fontFace:FONT });
    s.addText(st.desc,  { x:x+0.0, y:4.05, w:1.5, h:0.85, fontSize:10, color:C.GRAY, align:"center", fontFace:FONT });
  });
}

// ──────────────────────────────────────────────
// SLIDE 22: お金に関する重要ルール
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  hlText(s, "お金に関する重要ルール", 0.5, 0.2, 9, 0.65, { fontSize:28, color:C.BLACK, bold:true });
  s.addShape(pres.shapes.RECTANGLE, { x:0.5, y:0.83, w:9, h:0.04, fill:{color:C.PINK_MID}, line:{color:C.PINK_MID} });

  img(s, "coins-money.png", 0.1, 1.4, 2.3, 1.9, 10);

  const rules = [
    { law:"第11条", title:"支払いは60日以内",         desc:"業務遂行費用の確定から60日以内が原則。これを超える場合は遅延損害金が発生。", color:C.PINK },
    { law:"第7条",  title:"業務遂行費用はクリエイター負担", desc:"交通費・機材費・スタジオ代など業務に必要な費用は原則クリエイター負担。", color:C.PINK },
    { law:"第11条", title:"遅延時は年3%の損害金",       desc:"TORIHADAが支払いを遅延した場合、年3%の遅延損害金を請求できる。", color:C.PINK },
    { law:"第7条",  title:"変更は必ず書面で合意",        desc:"委託料の変更は必ず書面または電磁的方法による合意が必要。口頭合意は無効。", color:C.PINK },
  ];

  rules.forEach((r, i) => {
    const y = 1.0 + i * 1.1;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:2.9, y, w:6.8, h:0.95,
      fill:{color:C.WHITE}, line:{color:"E8C0DA",width:1}, rectRadius:0.08,
      shadow:{type:"outer",color:"000000",blur:5,offset:1,angle:135,opacity:0.07}
    });
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, { x:3.0, y:y+0.12, w:0.85, h:0.38, fill:{color:C.PINK_LIGHT}, line:{color:C.PINK}, rectRadius:0.05 });
    s.addText(r.law, { x:3.0, y:y+0.12, w:0.85, h:0.38, fontSize:11, color:C.PINK, bold:true, align:"center", valign:"middle", fontFace:FONT });
    s.addText(r.title, { x:3.95, y:y+0.12, w:3.3, h:0.42, fontSize:13, color:C.BLACK, bold:true, fontFace:FONT });
    s.addText(r.desc,  { x:3.0,  y:y+0.55, w:6.6, h:0.35, fontSize:11, color:C.GRAY, fontFace:FONT });
  });

  s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
    x:0.4, y:5.28, w:9.2, h:0.25, fill:{color:C.PINK_LIGHT}, line:{color:C.PINK,width:1}, rectRadius:0.07
  });
  s.addText("✏️ 更新", {
    x:0.5, y:5.28, w:0.8, h:0.25, fontSize:9, color:C.WHITE, bold:true,
    align:"center", valign:"middle", fontFace:FONT,
    fill:{color:C.PINK}, shape:pres.shapes.ROUNDED_RECTANGLE
  });
  s.addText("不明点はTORIHADA担当者へ確認・相談してください", {
    x:1.35, y:5.3, w:8.15, h:0.22, fontSize:11, color:C.PINK, align:"center", fontFace:FONT
  });
}

// ──────────────────────────────────────────────
// SLIDE 23: クロージング（第1週完了）
// ──────────────────────────────────────────────
{
  const s = pres.addSlide();
  setGridBg(s);

  // 大きなピンク背景帯
  s.addShape(pres.shapes.RECTANGLE, {
    x:0, y:0, w:10, h:1.5, fill:{color:C.PINK}, line:{color:C.PINK}
  });
  s.addText("第1週の研修　お疲れさまでした！", {
    x:0.5, y:0.1, w:9, h:0.85, fontSize:30, color:C.WHITE, bold:true, align:"center", fontFace:FONT
  });
  s.addText("TORIHADA クリエイターネットワーク研修", {
    x:0.5, y:0.95, w:9, h:0.45, fontSize:14, color:C.WHITE, align:"center", fontFace:FONT
  });

  // イラスト散らし
  img(s, "handshake.png",   0.1, 1.55, 2.2, 1.65, 10);
  img(s, "growth-graph.png", 7.3, 1.5, 2.5, 2.0, 10);
  img(s, "star.png",        4.3, 1.8, 1.3, 1.3, 20);

  // まとめカード
  const rects = [
    "契約書は6つのポイントを必ず確認してからサインする",
    "業務費用はクリエイター負担。変更は書面合意が必須",
    "フローはSTEP1〜5。不明点はTORIHADA担当者へ確認・相談する",
  ];
  rects.forEach((text, i) => {
    const y = 3.1 + i * 0.62;
    s.addShape(pres.shapes.ROUNDED_RECTANGLE, {
      x:1.8, y, w:6.4, h:0.55, fill:{color:C.WHITE}, line:{color:"E8C0DA",width:1}, rectRadius:0.07
    });
    numCircle(s, i + 1, 1.2, y + 0.02, 0.52);
    s.addText(text, { x:2.0, y:y+0.04, w:6.0, h:0.47, fontSize:13, color:C.BLACK, valign:"middle", fontFace:FONT });
  });

  // 締め言葉
  hlText(s, "才能が扉を開く。あなたを部屋に留まらせるのは、プロとしての信頼です。", 1.0, 5.0, 8.0, 0.5, {
    fontSize:13, color:C.BLACK, italic:true, bold:true, align:"center"
  });
}

// ──────────────────────────────────────────────
// 出力
// ──────────────────────────────────────────────
const outPath = "C:\\Users\\長澤開\\Downloads\\TORIHADA_第1週_研修資料_v2.pptx";
pres.writeFile({ fileName: outPath })
  .then(() => console.log(`✅ 生成完了: ${outPath}`))
  .catch(e => console.error("❌ エラー:", e.message));
