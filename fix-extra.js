import fs from 'fs';

let content = fs.readFileSync('src/pages/VideosPage.tsx', 'utf8');
content = content.replace(
  /\{ name: 'Life Sciences'.*?\n/g,
  ""
);
content = content.replace(
  /\{ name: 'Accounting'.*?\n/g,
  ""
);
content = content.replace(
  /\{ name: 'English'.*?\n/g,
  ""
);
fs.writeFileSync('src/pages/VideosPage.tsx', content, 'utf8');

let ppContent = fs.readFileSync('src/pages/PastPapersPage.tsx', 'utf8');
ppContent = ppContent.replace(/'Life Sciences',/g, "");
ppContent = ppContent.replace(/'Mathematical Literacy',/g, "");
ppContent = ppContent.replace(/'Accounting',/g, "");
ppContent = ppContent.replace(/'Business Studies',/g, "");
ppContent = ppContent.replace(/'English Home Language',/g, "");
ppContent = ppContent.replace(/'English First Additional Language',/g, "");
ppContent = ppContent.replace(/'Afrikaans Home Language',/g, "");
ppContent = ppContent.replace(/'Afrikaans First Additional Language',/g, "");
ppContent = ppContent.replace(/'History',/g, "");
ppContent = ppContent.replace(/'Geography',/g, "");
ppContent = ppContent.replace(/'Tourism',/g, "");
ppContent = ppContent.replace(/'Consumer Studies',/g, "");
ppContent = ppContent.replace(/'Technical Mathematics',/g, "");
ppContent = ppContent.replace(/'Technical Sciences',/g, "");
ppContent = ppContent.replace(/'IsiZulu Home Language',/g, "");
ppContent = ppContent.replace(/'IsiXhosa Home Language',/g, "");
fs.writeFileSync('src/pages/PastPapersPage.tsx', ppContent, 'utf8');

console.log("Fixed extra subjects.");
