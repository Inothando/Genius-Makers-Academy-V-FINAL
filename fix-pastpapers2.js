import fs from 'fs';
let content = fs.readFileSync('src/pages/PastPapersPage.tsx', 'utf8');
content = content.replace(/  if \(folderSubject === 'MATHEMATICS' \|\| folderSubject === 'MATHS'\) \{.*?(?=  return subject;)/s, `  if (folderSubject === 'MATHEMATICS' || folderSubject === 'MATHS' || folderSubject === 'MATHEMATICAL LITERACY' || folderSubject === 'TECHNICAL MATHEMATICS') {
    subject = 'Mathematics';
  } else if (folderSubject === 'PHYSICAL SCIENCES' || folderSubject === 'PHYSICAL_SCIENCES' || folderSubject === 'TECHNICAL SCIENCES' || folderSubject === 'NATURAL SCIENCES') {
    subject = 'Physical Sciences';
  } else {
    // Default to Mathematics or Physical Sciences based on random or some logic, but let's just say if it's not physical sciences, it's mathematics, or just keep it as is and let the parser filter.
    // Actually we only want to display these two.
  }
`);

content = content.replace(/  if \(normFile\.includes\('MATHEMATICS'\) \|\| normFile\.includes\('WISKUNDE'\) \|\| normFile\.includes\('MATH'\)\) \{.*?(?=  return subject;)/s, `  if (normFile.includes('MATHEMATICS') || normFile.includes('WISKUNDE') || normFile.includes('MATH')) {
    subject = 'Mathematics';
  } else if (normFile.includes('PHYSICAL SCIENCES') || normFile.includes('FISIESE WETENSKAPPE') || normFile.includes('PHYSICAL_SCIENCES') || normFile.includes('PHYS') || normFile.includes('SCIENCES')) {
    subject = 'Physical Sciences';
  }
`);

fs.writeFileSync('src/pages/PastPapersPage.tsx', content, 'utf8');
