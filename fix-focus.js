import fs from 'fs';
import path from 'path';

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    if (fs.statSync(dirPath).isDirectory()) {
      walkDir(dirPath, callback);
    } else {
      callback(dirPath);
    }
  });
}

walkDir('./src', function(filePath) {
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    // FilterBar.tsx subjects
    content = content.replace(
      /const subjects = \[\s*'Mathematics', 'Physical Sciences'.*?\];/gs, 
      "const subjects = ['Mathematics', 'Physical Sciences'];"
    );

    // ProfilePage.tsx ALL_SUBJECTS
    content = content.replace(
      /const ALL_SUBJECTS = \['Mathematics', 'Physical Sciences'.*?\];/gs,
      "const ALL_SUBJECTS = ['Mathematics', 'Physical Sciences'];"
    );

    // AdminContentHub.tsx SUBJECTS
    content = content.replace(
      /const SUBJECTS = \["Mathematics", "Physical Sciences".*?\];/gs,
      'const SUBJECTS = ["Mathematics", "Physical Sciences"];'
    );

    // LandingPage.tsx subjects
    content = content.replace(
      /const subjects = \[\s*'Mathematics', 'Mathematical Literacy'.*?\];/gs,
      "const subjects = ['Mathematics', 'Physical Sciences'];"
    );

    // FilterBar.tsx grades
    content = content.replace(
      /const grades = \['All', '8', '9', '10', '11', '12'\];/g,
      "const grades = ['12'];"
    );
    // Any other grades array
    content = content.replace(
      /const GRADES = \['8', '9', '10', '11', '12'\];/g,
      "const GRADES = ['12'];"
    );
    content = content.replace(
      /const GRADES = \['10', '11', '12'\];/g,
      "const GRADES = ['12'];"
    );

    // Some useState initial values for grade might be 'All' or '10', change them to '12' if they are defaults
    // Example: grade: 'All', -> if it's the only option, maybe it should default to '12'.
    // Let's replace `grade: 'All'` with `grade: '12'` in FilterBar initial state
    if (filePath.includes('FilterBar.tsx')) {
        content = content.replace(/grade: 'All'/g, "grade: '12'");
        // replace option 'All' in mobile filter section if we want
    }
    
    // In AdminPapersPage.tsx, we have a form with grades
    content = content.replace(/<option value="10">Grade 10<\/option>/g, '');
    content = content.replace(/<option value="11">Grade 11<\/option>/g, '');
    content = content.replace(/<option value="8">Grade 8<\/option>/g, '');
    content = content.replace(/<option value="9">Grade 9<\/option>/g, '');
    
    content = content.replace(/>Grade 8</g, '>Grade 12<');
    content = content.replace(/>Grade 9</g, '>Grade 12<');
    content = content.replace(/>Grade 10</g, '>Grade 12<');
    content = content.replace(/>Grade 11</g, '>Grade 12<');

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
      console.log(`Updated ${filePath}`);
    }
  }
});
console.log("Fixed focus to Grade 12 Math/Physical Sciences");
