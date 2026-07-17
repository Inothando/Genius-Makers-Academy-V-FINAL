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

    content = content.replace(/text-gray-950/g, 'text-lux-text');
    content = content.replace(/text-gray-650/g, 'text-lux-muted');
    content = content.replace(/text-gray-350/g, 'text-lux-muted');

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
