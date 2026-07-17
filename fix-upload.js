import fs from 'fs';
let content = fs.readFileSync('src/components/resources/UploadResourceModal.tsx', 'utf8');
content = content.replace(/const SUBJECTS = \[\s*'MATHEMATICS', 'PHYSICAL SCIENCES',.*?\n.*?\];/s, `const SUBJECTS = [\n  'MATHEMATICS', 'PHYSICAL SCIENCES'\n];`);
fs.writeFileSync('src/components/resources/UploadResourceModal.tsx', content, 'utf8');
