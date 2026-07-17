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
  if (filePath.endsWith('.tsx') || filePath.endsWith('.ts') || filePath.endsWith('.css')) {
    let content = fs.readFileSync(filePath, 'utf8');
    let original = content;

    content = content.replace(/text-lux-text\/[0-9]+/g, 'text-lux-text');
    content = content.replace(/text-lux-muted\/[0-9]+/g, 'text-lux-muted');
    content = content.replace(/text-white\/[0-9]+/g, 'text-white');
    content = content.replace(/text-black\/[0-9]+/g, 'text-black');
    
    // Also upgrade text-lux-muted to text-lux-text in places where it might be small text
    // Actually, I updated --color-text-muted to be #333333 in light and #CCCCCC in dark, which is quite legible.
    // If the user said "some even raw black", let's make sure our --color-text-muted is slightly darker.
    // Let's replace text-lux-muted with text-lux-text globally for maximum clarity. The user explicitly asked for "words everywhere super clear to see, some even raw black".

    if (original !== content) {
      fs.writeFileSync(filePath, content, 'utf8');
    }
  }
});
console.log("Fixed opacity");
