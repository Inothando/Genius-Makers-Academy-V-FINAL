import fs from 'fs';

const content = fs.readFileSync('src/pages/PastPapersPage.tsx', 'utf8');

// The replacement logic
let newContent = content.replace(
  '<main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8 bg-[#1e4431] relative rounded-[2.5rem] border border-lux-border shadow-2xl my-8">',
  '<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8 relative z-10">'
);

// Remove the background graphics
newContent = newContent.replace(
  /        <div className="absolute inset-0 overflow-hidden rounded-\[2\.5rem\] pointer-events-none">[\s\S]*?        <\/div>\n/,
  ''
);

// Remove the relative z-10 wrapper
newContent = newContent.replace(
  /        <div className="relative z-10 flex flex-col gap-6">\n/,
  ''
);

// Replace the closing tag for the wrapper
newContent = newContent.replace(
  /        <\/div>\n      <\/main>/,
  '      </main>'
);

fs.writeFileSync('src/pages/PastPapersPage.tsx', newContent, 'utf8');
console.log('PastPapersPage updated!');
