import fs from 'fs';

const cssContent = `@import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=JetBrains+Mono:wght@400;500&display=swap');
@import "tailwindcss";
@plugin "@tailwindcss/typography";

@theme {
  --font-sans: "Plus Jakarta Sans", ui-sans-serif, system-ui, sans-serif;
  --font-serif: "Playfair Display", ui-serif, Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, SFMono-Regular, monospace;

  --color-lux-bg: var(--color-bg);
  --color-lux-surface: var(--color-surface);
  --color-lux-surface-alt: var(--color-surface-alt);
  --color-lux-border: var(--color-border);
  
  --color-lux-green-950: var(--color-contrast-950);
  --color-lux-green-900: var(--color-contrast-900);
  --color-lux-green-800: var(--color-contrast-800);
  --color-lux-green-500: var(--color-accent-primary);
  --color-lux-green-100: var(--color-accent-primary-light);
  
  --color-lux-gold: var(--color-accent-secondary);
  --color-lux-gold-light: var(--color-accent-secondary-light);
  
  --color-lux-text: var(--color-text);
  --color-lux-muted: var(--color-text-muted);
  
  --shadow-lux-sm: var(--shadow-sm-custom);
  --shadow-lux-lg: var(--shadow-lg-custom);
}

:root {
  /* Soft Bright Mode */
  --color-bg: #FDFCF8; /* Soft warm cream */
  --color-surface: #FFFFFF; /* Pure white for clean cards */
  --color-surface-alt: #F6F4EF; /* Subtle contrast */
  --color-border: #EBE8E0; /* Very soft border */
  
  --color-contrast-950: #1C1A18; /* Soft black */
  --color-contrast-900: #2D2B29;
  --color-contrast-800: #464340;
  
  --color-accent-primary: #85A69B; /* Gentle Soft Sage */
  --color-accent-primary-light: rgba(133, 166, 155, 0.15);
  
  --color-accent-secondary: #E3A899; /* Soft Dusty Peach */
  --color-accent-secondary-light: rgba(227, 168, 153, 0.15);
  
  --color-text: #2D2A28; /* Warm dark gray */
  --color-text-muted: #827E7A; /* Gentle muted text */
  
  --shadow-sm-custom: 0 4px 20px rgba(133, 166, 155, 0.04);
  --shadow-lg-custom: 0 16px 40px rgba(133, 166, 155, 0.08);
  
  --body-bg-gradient: radial-gradient(circle at 10% 0%, rgba(133, 166, 155, 0.06), transparent 50%),
                      radial-gradient(circle at 90% 100%, rgba(227, 168, 153, 0.06), transparent 50%);
}

.dark {
  /* Soft Dim Mode */
  --color-bg: #211F1D;
  --color-surface: #2A2826;
  --color-surface-alt: #35322F;
  --color-border: #44413D;
  
  --color-contrast-950: #FDFCF8;
  --color-contrast-900: #EBE8E0;
  --color-contrast-800: #C2BEB6;
  
  --color-accent-primary: #94B5AA; 
  --color-accent-primary-light: rgba(148, 181, 170, 0.15);
  
  --color-accent-secondary: #EEB5A6;
  --color-accent-secondary-light: rgba(238, 181, 166, 0.15);
  
  --color-text: #FDFCF8;
  --color-text-muted: #9E9A96;
  
  --shadow-sm-custom: 0 4px 20px rgba(0, 0, 0, 0.15);
  --shadow-lg-custom: 0 16px 40px rgba(0, 0, 0, 0.25);
  
  --body-bg-gradient: radial-gradient(circle at 10% 0%, rgba(148, 181, 170, 0.03), transparent 50%),
                      radial-gradient(circle at 90% 100%, rgba(238, 181, 166, 0.03), transparent 50%);
}

@layer base {
  body {
    background-color: var(--color-bg);
    color: var(--color-text);
    background-image: var(--body-bg-gradient);
    background-attachment: fixed;
    font-family: var(--font-sans);
    transition: background-color 0.4s ease, color 0.4s ease;
  }
}

@layer utilities {
  .text-gradient {
    background: linear-gradient(135deg, var(--color-accent-primary) 0%, var(--color-accent-secondary) 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    background-clip: text;
    color: transparent;
  }
  
  .glass-panel {
    background-color: var(--color-surface);
    border: 1px solid var(--color-border);
    box-shadow: var(--shadow-sm-custom);
    backdrop-filter: blur(12px);
    transition: all 0.3s ease;
  }
  
  .glass-button {
    background-color: var(--color-accent-primary);
    color: #FFFFFF;
    font-weight: 500;
    border: 1px solid rgba(255, 255, 255, 0.1);
    box-shadow: 0 4px 12px var(--color-accent-primary-light);
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  }
  
  .glass-button:hover {
    background-color: var(--color-contrast-900);
    color: var(--color-bg);
    transform: translateY(-2px);
    box-shadow: 0 8px 24px rgba(0,0,0,0.06);
  }
  
  /* Additional soft utilites */
  .soft-ring {
    box-shadow: 0 0 0 2px var(--color-border), 0 0 0 4px var(--color-accent-primary-light);
  }
}
`;

fs.writeFileSync('src/index.css', cssContent);
console.log('src/index.css has been rewritten for Soft Bright Mode.');
