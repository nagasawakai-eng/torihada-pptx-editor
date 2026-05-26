const { pdf } = require('pdf-to-img');
const fs = require('fs');
async function run() {
  const doc = await pdf('C:\\Users\\長澤開\\Downloads\\cover_f2.pdf', { scale: 1.5 });
  let i = 1;
  for await (const p of doc) {
    fs.writeFileSync('C:\\Users\\長澤開\\Downloads\\pptx_v2_preview\\cover_f2_' + i + '.png', p);
    i++;
  }
  console.log('done: ' + (i-1));
}
run().catch(console.error);
