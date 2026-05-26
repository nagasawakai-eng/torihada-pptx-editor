const { pdf } = require('pdf-to-img');
const fs = require('fs');
const path = require('path');

const pdfPath = 'C:\\Users\\長澤開\\Downloads\\TORIHADA_第1週_研修資料_v2.pdf';
const outDir = 'C:\\Users\\長澤開\\Downloads\\pptx_v2_preview';

if (!fs.existsSync(outDir)) fs.mkdirSync(outDir);

async function convert() {
  const doc = await pdf(pdfPath, { scale: 1.5 });
  let i = 1;
  for await (const page of doc) {
    const outPath = path.join(outDir, 'slide_' + String(i).padStart(2,'0') + '.png');
    fs.writeFileSync(outPath, page);
    console.log('slide_' + String(i).padStart(2,'0') + '.png');
    i++;
  }
  console.log('完了: ' + (i-1) + '枚');
}
convert().catch(e => console.error(e.message));
