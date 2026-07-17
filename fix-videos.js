import fs from 'fs';
let content = fs.readFileSync('src/pages/VideosPage.tsx', 'utf8');
content = content.replace(/const SUBJECTS = \[.*?\];/s, `const SUBJECTS = [
  { name: 'Mathematics', desc: 'Core algebraic and geometric concepts.', color: 'bg-blue-500' },
  { name: 'Physical Sciences', desc: 'Physics and Chemistry principles.', color: 'bg-emerald-500' }
];`);
fs.writeFileSync('src/pages/VideosPage.tsx', content, 'utf8');
