import fs from 'fs';
import path from 'path';

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('<main ')) {
        const lines = content.split('\n');
        let mainStart = -1;
        for (let i = 0; i < lines.length; i++) {
          if (lines[i].includes('<main ')) {
            mainStart = i;
            break;
          }
        }
        let indent = lines[mainStart].match(/^\s*/)[0].length;
        let divs = 0;
        let mainFound = false;
        for (let i = mainStart + 1; i < lines.length; i++) {
          const line = lines[i];
          if (line.match(/^\s*<div/) && line.match(/^\s*/)[0].length === indent + 2) {
            divs++;
          }
          if (line.match(/^\s*<\/main>/)) {
            mainFound = true;
            break;
          }
        }
        if (divs >= 4 && mainFound) {
          console.log(`File: ${fullPath} has ${divs} divs directly under main`);
        }
      }
    }
  }
}
scanDir('src/pages');
