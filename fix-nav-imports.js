import fs from 'fs';
const file = './src/components/Navbar.tsx';
let content = fs.readFileSync(file, 'utf8');

if (!content.includes('useTheme')) {
  content = "import { useTheme } from '../contexts/ThemeContext';\n" + content;
}
if (!content.includes('Sun, Moon')) {
  content = content.replace(/import { Menu, X, ArrowRight } from 'lucide-react';/, "import { Menu, X, ArrowRight, Sun, Moon } from 'lucide-react';");
}

fs.writeFileSync(file, content, 'utf8');
console.log("Fixed Navbar imports.");
