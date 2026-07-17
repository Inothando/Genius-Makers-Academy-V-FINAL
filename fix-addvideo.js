import fs from 'fs';

let content = fs.readFileSync('src/pages/admin/AddVideoPage.tsx', 'utf8');

content = content.replace(
  /const GRADES = \[.*?\];/s,
  "const GRADES = [{ value: 12, label: 'Grade 12' }];"
);

content = content.replace(
  /const SUBJECTS = \[.*?\];/s,
  "const SUBJECTS = ['Mathematics', 'Physical Sciences'];"
);

fs.writeFileSync('src/pages/admin/AddVideoPage.tsx', content, 'utf8');
console.log("Fixed AddVideoPage.tsx");
