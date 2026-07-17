import fs from 'fs';
const content = fs.readFileSync('src/pages/ProfilePage.tsx', 'utf8'); 
const newContent = content.replace(/GMA AI analyzes your past quiz performance to find your weaknesses, then auto-assembles a personalized pack of video lessons and past papers focusing entirely on what you need to master./g, 'Utilizing our most capable AI, the system deeply analyzes your entire study history, quiz scores, and subject data. It intelligently auto-assembles a hyper-personalized, high-yield study package designed specifically to target your weaknesses and guarantee grade improvements.');
const newContent2 = newContent.replace(/Your AI-built study pack/g, 'Advanced AI Performance Pack');
fs.writeFileSync('src/pages/ProfilePage.tsx', newContent2);
