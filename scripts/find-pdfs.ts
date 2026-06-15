import * as fs from 'fs';
import * as path from 'path';

function walk(dir: string): string[] {
  let results: string[] = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== 'dist' && file !== '.git') {
        results = results.concat(walk(fullPath));
      }
    } else {
      if (file.endsWith('.pdf')) {
        results.push(fullPath);
      }
    }
  }
  return results;
}

const pdfs = walk('.');
console.log(`Found ${pdfs.length} PDFs.`);
if (pdfs.length > 0) {
  console.log(pdfs.slice(0, 10));
}
