const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync(path.join(__dirname, 'src/pages/GroupDetailPage.tsx'), 'utf8').split('\n');
const funcIdx = lines.findIndex(l => l.includes('export default function GroupDetailPage'));
const returnIdx = lines.findIndex((l, i) => i > funcIdx && l.match(/^    return \(/));
console.log('Main Return found at:', returnIdx + 1);
console.log(lines.slice(returnIdx, returnIdx + 20).join('\n'));
