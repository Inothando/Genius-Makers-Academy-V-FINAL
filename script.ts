import fs from 'fs';
const content = fs.readFileSync('server.ts', 'utf8');
const newContent = content.replace(/genAI\.models\.generateContent/g, 'getGenAI().models.generateContent');
fs.writeFileSync('server.ts', newContent);
console.log('done');
