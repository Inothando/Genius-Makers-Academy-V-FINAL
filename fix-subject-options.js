import fs from 'fs';
let content = fs.readFileSync('src/pages/PastPapersPage.tsx', 'utf8');
content = content.replace(/const SUBJECT_OPTIONS = \[.*?\];/s, `const SUBJECT_OPTIONS = [
  'Mathematics',
  'Physical Sciences'
];`);
fs.writeFileSync('src/pages/PastPapersPage.tsx', content, 'utf8');
