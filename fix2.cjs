const fs = require('fs');
const file = 'src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// remove imports
content = content.replace(/\bArrowUpDown\b,?\s*/g, '');
content = content.replace(/\bPercent\b,?\s*/g, '');
content = content.replace(/\bUserCheck\b,?\s*/g, '');

// remove percentValue
content = content.replace(/const percentValue = [\s\S]*?;/g, '');

// remove periodChangeNote
content = content.replace(/const periodChangeNote = \([\s\S]*?};/g, '');

fs.writeFileSync(file, content, 'utf8');
