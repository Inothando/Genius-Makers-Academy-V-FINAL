import fs from 'fs';
let content = fs.readFileSync('src/pages/PastPapersPage.tsx', 'utf8');
content = content.replace(/if \(lower\.includes\('maths'\) \|\| lower\.includes\('mathematics'\)\) \{.*?(?=  return subject;)/s, `if (lower.includes('maths') || lower.includes('mathematics')) {
    subject = 'Mathematics';
  } else if (lower.includes('physics') || lower.includes('physical') || lower.includes('science')) {
    subject = 'Physical Sciences';
  }
`);
content = content.replace(/if \(paper\.subject\.includes\('Math'\)\) \{.*?(?=  return bgClass;)/s, `if (paper.subject.includes('Math')) {
      bgClass = 'from-blue-500/10 to-transparent border-blue-500/20';
    } else if (paper.subject.includes('Physical') || paper.subject.includes('Science')) {
      bgClass = 'from-emerald-500/10 to-transparent border-emerald-500/20';
    }
`);
fs.writeFileSync('src/pages/PastPapersPage.tsx', content, 'utf8');
