import fs from 'fs';

let content = fs.readFileSync('src/pages/PastPapersPage.tsx', 'utf8');
content = content.replace(
  /const SUBJECT_OPTIONS = \[\s*'Mathematics',.*?'IsiXhosa Home Language',\n\];/gs,
  "const SUBJECT_OPTIONS = ['Mathematics', 'Physical Sciences'];"
);

content = content.replace(
  /\{\s*name:\s*'Life Sciences'[\s\S]*?'English HL 📖'[^}]*\},/gs,
  ""
);
content = content.replace(
  /\{\s*name:\s*'Accounting'[^}]*\},/gs,
  ""
);

fs.writeFileSync('src/pages/PastPapersPage.tsx', content, 'utf8');

if (fs.existsSync('src/pages/VideosPage.tsx')) {
  let videosContent = fs.readFileSync('src/pages/VideosPage.tsx', 'utf8');
  videosContent = videosContent.replace(
    /const subjects = \[\s*\{ name: 'Mathematics'.*?\{ name: 'History'.*?\}\n\];/gs,
    `const subjects = [
  { name: 'Mathematics', desc: 'Core algebraic and geometric concepts.', color: 'bg-blue-500' },
  { name: 'Physical Sciences', desc: 'Physics and Chemistry principles.', color: 'bg-emerald-500' }
];`
  );
  fs.writeFileSync('src/pages/VideosPage.tsx', videosContent, 'utf8');
}

console.log("Fixed PastPapers and Videos Page.");
