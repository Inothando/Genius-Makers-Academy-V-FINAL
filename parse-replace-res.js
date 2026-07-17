import fs from 'fs';

const content = fs.readFileSync('src/pages/ResourcesPage.tsx', 'utf8');

let newContent = content.replace(
  '<main className="max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8 flex flex-col gap-8 bg-[#1e4431] relative overflow-hidden rounded-[2.5rem] border border-lux-border shadow-2xl my-8">',
  '<main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 flex flex-col gap-8 relative z-10">'
);

// Remove the absolute divs
newContent = newContent.replace(
  /        <div className="absolute inset-0 hidden opacity-\[0\.05\] mix-blend-multiply"><\/div>\n/,
  ''
);
newContent = newContent.replace(
  /        <div className="absolute top-0 right-0 w-\[800px\] h-\[800px\] bg-lux-green-500\/15 blur-\[150px\] rounded-full translate-x-1\/3 -translate-y-1\/2 pointer-events-none" \/>\n/,
  ''
);
newContent = newContent.replace(
  /        <div className="absolute bottom-0 left-0 w-\[600px\] h-\[600px\] bg-lux-green-500\/15 blur-\[120px\] rounded-full -translate-x-1\/3 translate-y-1\/3 pointer-events-none" \/>\n/,
  ''
);

// Remove relative wrapper
newContent = newContent.replace(
  /        <div className="relative z-10 flex flex-col gap-8">\n/,
  '        <div className="flex flex-col gap-8">\n'
);

fs.writeFileSync('src/pages/ResourcesPage.tsx', newContent, 'utf8');
console.log('ResourcesPage updated!');
