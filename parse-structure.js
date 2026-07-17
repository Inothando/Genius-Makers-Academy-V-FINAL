import fs from 'fs';
const content = fs.readFileSync('src/pages/PastPapersPage.tsx', 'utf8');
const lines = content.split('\n');
let mainStart = -1;
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('<main ')) {
    mainStart = i;
    break;
  }
}
let indent = lines[mainStart].match(/^\s*/)[0].length;
for (let i = mainStart + 1; i < lines.length; i++) {
  const line = lines[i];
  if (line.match(/^\s*<div/) && line.match(/^\s*/)[0].length === indent + 2) {
    console.log(`Line ${i + 1}: ${line}`);
  }
  if (line.match(/^\s*<\/main>/)) {
    console.log(`Line ${i + 1}: ${line}`);
    break;
  }
}
