import fs from 'fs';
let content = fs.readFileSync('src/index.css', 'utf8');
content = content.replace(/--color-text: #000000; \/\* Raw black \*\/ \/\* Warm dark gray \*\//g, '--color-text: #000000; /* Raw black */');
content = content.replace(/--color-text-muted: #333333; \/\* Darker grey \*\/ \/\* Gentle muted text \*\//g, '--color-text-muted: #333333; /* Darker grey */');
content = content.replace(/--color-contrast-950: #000000; \/\* Raw black \*\/ \/\* Soft black \*\//g, '--color-contrast-950: #000000; /* Raw black */');
fs.writeFileSync('src/index.css', content, 'utf8');
