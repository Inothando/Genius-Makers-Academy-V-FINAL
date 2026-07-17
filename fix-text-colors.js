import fs from 'fs';

let content = fs.readFileSync('src/index.css', 'utf8');

// Root mode (Light)
content = content.replace(/--color-text: #2D2A28;.*?/g, '--color-text: #000000; /* Raw black */');
content = content.replace(/--color-text-muted: #827E7A;.*?/g, '--color-text-muted: #333333; /* Darker grey */');

content = content.replace(/--color-contrast-950: #1C1A18;.*?/g, '--color-contrast-950: #000000; /* Raw black */');
content = content.replace(/--color-contrast-900: #2D2B29;/g, '--color-contrast-900: #111111;');
content = content.replace(/--color-contrast-800: #464340;/g, '--color-contrast-800: #222222;');

// Dark mode
content = content.replace(/--color-text: #FDFCF8;/g, '--color-text: #FFFFFF;');
content = content.replace(/--color-text-muted: #9E9A96;/g, '--color-text-muted: #CCCCCC;');

content = content.replace(/--color-contrast-950: #FDFCF8;/g, '--color-contrast-950: #FFFFFF;');
content = content.replace(/--color-contrast-900: #EBE8E0;/g, '--color-contrast-900: #EEEEEE;');
content = content.replace(/--color-contrast-800: #C2BEB6;/g, '--color-contrast-800: #DDDDDD;');

fs.writeFileSync('src/index.css', content, 'utf8');
console.log('Fixed text colors for high contrast.');
