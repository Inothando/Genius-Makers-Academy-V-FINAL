import fs from 'fs';
let content = fs.readFileSync('src/lib/paperParser.ts', 'utf8');
content = content.replace(/const SUBJECT_MAP: Record<string, string> = \{.*?\};/s, `const SUBJECT_MAP: Record<string, string> = {
  mathematics: "Mathematics",
  maths: "Mathematics",
  math: "Mathematics",
  "mathematical literacy": "Mathematics",
  "maths lit": "Mathematics",
  mathlit: "Mathematics",
  "mathematical_literacy": "Mathematics",
  physics: "Physical Sciences",
  "physical sciences": "Physical Sciences",
  "physical_sciences": "Physical Sciences",
  physicalsciences: "Physical Sciences",
  chemistry: "Physical Sciences",
  "life sciences": "Physical Sciences",
  "life_sciences": "Physical Sciences",
  lifesciences: "Physical Sciences",
  biology: "Physical Sciences",
};`);
fs.writeFileSync('src/lib/paperParser.ts', content, 'utf8');
