import * as fs from 'fs';

const data = JSON.parse(fs.readFileSync('public/past-papers.json', 'utf-8'));
const totalSize = data.reduce((acc: number, item: any) => acc + (item.fileSize || 0), 0);
console.log(`Total size: ${(totalSize / 1024 / 1024 / 1024).toFixed(2)} GB`);
