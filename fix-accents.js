import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf8');

// Update light mode accents to be darker
content = content.replace(/--color-accent-primary: #85A69B;/g, '--color-accent-primary: #267A4A;');
content = content.replace(/--color-accent-secondary: #E3A899;/g, '--color-accent-secondary: #C05640;');

// Update dark mode accents to be brighter
content = content.replace(/--color-accent-primary: #94B5AA;/g, '--color-accent-primary: #4ADE80;');
content = content.replace(/--color-accent-secondary: #EEB5A6;/g, '--color-accent-secondary: #F87171;');

fs.writeFileSync('src/index.css', content, 'utf8');
console.log("Fixed accents");
