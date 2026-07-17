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

    content = content.replace(/text-lux-muted/g, 'text-lux-text');
    content = content.replace(/text-text-secondary/g, 'text-lux-text');
    content = content.replace(/text-text-tertiary/g, 'text-lux-text');
    content = content.replace(/text-\[\#.*\]/g, 'text-lux-text');

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
console.log("Fixed muted");
