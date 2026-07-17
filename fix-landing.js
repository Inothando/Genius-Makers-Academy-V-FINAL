import fs from 'fs';

let content = fs.readFileSync('src/pages/LandingPage.tsx', 'utf8');

content = content.replace(
  /Master your <br \/><span className="text-gradient font-serif italic text-5xl sm:text-6xl lg:text-7xl xl:text-8xl drop-shadow-md">academics.<\/span>/g,
  'Master Grade 12 <br /><span className="text-gradient font-serif italic text-5xl sm:text-6xl lg:text-7xl xl:text-8xl drop-shadow-md">Math & Science.</span>'
);

content = content.replace(
  /South Africa's most beautiful and powerful learning platform.                 Powered by our most capable AI to auto-assemble hyper-personalized study packages guaranteed to improve your grades./g,
  "South Africa's most beautiful and powerful learning platform. Focused purely on Grade 12 Mathematics and Physical Sciences, powered by our most capable AI."
);

fs.writeFileSync('src/pages/LandingPage.tsx', content, 'utf8');
console.log("Fixed LandingPage.tsx text");
