const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync(path.join(__dirname, 'src/pages/GroupDetailPage.tsx'), 'utf8').split('\n');
const funcIdx = lines.findIndex(l => l.includes('function SalaryPanel'));
if (funcIdx !== -1) {
    console.log('Found function SalaryPanel at:', funcIdx + 1);
    console.log(lines.slice(funcIdx, funcIdx + 30).join('\n'));
} else {
    // try searching for Bảng Lương
    const panelIdx = lines.findIndex(l => l.includes('Lương'));
    console.log('Found Lương at:', panelIdx + 1);
    if(panelIdx !== -1) console.log(lines.slice(panelIdx-5, panelIdx + 30).join('\n'));
}
