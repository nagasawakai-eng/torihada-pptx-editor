const { pdf } = require('pdf-to-img');
const fs = require('fs');
const path = require('path');

const pdfPath = 'C:\\Users\\長澤開\\Downloads\\cover_patterns.pdf';
const outDir  = 'C:\\Users\\長澤開\\Downloads\\pptx_v2_preview';

async function convert() {
  const doc = await pdf(pdfPath, { scale: 1.5 });
  let i = 1;
  for await (const page of doc) {
    const outPath = path.join(outDir, 'cover_pattern_' + String(i).padStart(2,'0') + '.png');
    fs.writeFileSync(outPath, page);
    console.log('cover_pattern_' + i + '.png');
    i++;
  }
  console.log('done: ' + (i-1));
}
convert().catch(console.error);
