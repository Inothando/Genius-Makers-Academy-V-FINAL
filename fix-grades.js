import fs from 'fs';

let content = fs.readFileSync('src/pages/PastPapersPage.tsx', 'utf8');

content = content.replace(/const GRADE_OPTIONS = \['12', '11', '10', '9', '8'\];/g, "const GRADE_OPTIONS = ['12'];");
content = content.replace(/All Grades \(8–12\)/g, "Grade 12 Only");
content = content.replace(/All Grades \(8 - 12\)/g, "Grade 12 Only");

fs.writeFileSync('src/pages/PastPapersPage.tsx', content, 'utf8');
console.log("Fixed GRADE_OPTIONS in PastPapersPage.tsx");
