const pptxgen = require('pptxgenjs');
const path = require('path');
const FONT = "Hiragino Sans";
const C = { PINK:"FF69B4", NAVY:"1A1A5C", BLACK:"1A1A1A", GRAY:"888888", WHITE:"FFFFFF" };
const IL = path.join(__dirname, 'public', 'illustrations');

function img(s, file, x, y, w, h, rot) {
  s.addImage({ path: path.join(IL, file), x, y, w, h, rotate: rot || 0 });
}
function bg(s) {
  s.background = { color: "FAFAFA" };
  for (let i=0;i<20;i++) s.addShape("line",{x:i*0.5,y:0,w:0,h:5.625,line:{color:"E8E8E8",width:0.5}});
  for (let i=0;i<12;i++) s.addShape("line",{x:0,y:i*0.5,w:10,h:0,line:{color:"E8E8E8",width:0.5}});
}
function banner(s) {
  s.addShape("rect",{x:0,y:5.15,w:10,h:0.475,fill:{color:C.NAVY},line:{color:C.NAVY}});
  s.addText("torihada-creator-license-center  /  creator training",{x:0,y:5.15,w:10,h:0.475,fontSize:13,color:C.WHITE,align:"center",valign:"middle",fontFace:FONT});
}
function illustrations(s) {
  img(s,"lightbulb.png",    0.15, 0.5,  1.5, 1.5);
  img(s,"growth-graph.png", 7.8,  0.45, 1.9, 1.5);
  img(s,"coins-money.png",  0.15, 3.5,  2.0, 1.6);
  img(s,"star.png",         8.5,  3.8,  1.1, 1.1, 20);
  img(s,"star.png",         0.15, 2.3,  0.6, 0.6, 15);
}

const pres = new pptxgen();
pres.layout = "LAYOUT_16x9";

// PATTERN A
{
  const s = pres.addSlide(); bg(s);
  s.addShape("rect",{x:0,y:0,w:10,h:0.4,fill:{color:C.NAVY},line:{color:C.NAVY}});
  s.addText("Pattern A  -  balanced centered",{x:0.3,y:0,w:9,h:0.4,fontSize:13,color:C.WHITE,bold:true,fontFace:FONT});
  illustrations(s);
  s.addText("torihada-creator-license-center",{x:2.0,y:1.55,w:6.0,h:0.6,fontSize:17,color:C.PINK,bold:true,align:"center",fontFace:FONT});
  s.addText("kotashukai",{x:1.8,y:2.1,w:6.4,h:1.2,fontSize:62,color:C.BLACK,bold:true,align:"center",fontFace:FONT});
  s.addText("- Pro creator ni naru tame ni -",{x:1.8,y:3.35,w:6.4,h:0.55,fontSize:14,color:C.GRAY,italic:true,align:"center",fontFace:FONT});
  banner(s);
}

// PATTERN B
{
  const s = pres.addSlide(); bg(s);
  s.addShape("rect",{x:0,y:0,w:10,h:0.4,fill:{color:C.PINK},line:{color:C.PINK}});
  s.addText("Pattern B  -  English + Japanese contrast",{x:0.3,y:0,w:9,h:0.4,fontSize:13,color:C.WHITE,bold:true,fontFace:FONT});
  illustrations(s);
  s.addShape("rect",{x:2.0,y:1.62,w:6.0,h:0.04,fill:{color:C.PINK},line:{color:C.PINK}});
  s.addText("torihada-creator-license-center",{x:1.8,y:1.68,w:6.4,h:0.52,fontSize:16,color:C.NAVY,bold:true,align:"center",fontFace:FONT});
  s.addText("kotashukai",{x:1.5,y:2.15,w:7.0,h:1.15,fontSize:68,color:C.PINK,bold:true,align:"center",fontFace:FONT});
  s.addText("- Pro creator ni naru tame ni -",{x:1.8,y:3.4,w:6.4,h:0.52,fontSize:15,color:C.GRAY,italic:true,align:"center",fontFace:FONT});
  banner(s);
}

// PATTERN C
{
  const s = pres.addSlide(); bg(s);
  s.addShape("rect",{x:0,y:0,w:10,h:0.4,fill:{color:"2C2C2C"},line:{color:"2C2C2C"}});
  s.addText("Pattern C  -  split title 2 lines",{x:0.3,y:0,w:9,h:0.4,fontSize:13,color:C.WHITE,bold:true,fontFace:FONT});
  illustrations(s);
  s.addText("torihada-creator",{x:2.0,y:1.45,w:6.0,h:0.65,fontSize:28,color:C.NAVY,bold:true,align:"center",fontFace:FONT});
  s.addText("license-center kotashukai",{x:1.5,y:2.05,w:7.0,h:0.85,fontSize:34,color:C.BLACK,bold:true,align:"center",fontFace:FONT});
  s.addShape("rect",{x:2.5,y:2.97,w:5.0,h:0.05,fill:{color:C.PINK},line:{color:C.PINK}});
  s.addText("- Pro creator ni naru tame ni -",{x:1.8,y:3.1,w:6.4,h:0.52,fontSize:17,color:C.GRAY,italic:true,align:"center",fontFace:FONT});
  banner(s);
}

pres.writeFile({ fileName: "C:\\Users\\長澤開\\Downloads\\cover_patterns.pptx" })
  .then(() => console.log("done"))
  .catch(e => console.error(e.message));
