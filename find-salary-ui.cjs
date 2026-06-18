const fs = require('fs');
const path = require('path');
const lines = fs.readFileSync(path.join(__dirname, 'src/pages/GroupDetailPage.tsx'), 'utf8').split('\n');
const calcIdx = lines.findIndex(l => l.includes('const calculateSalary = (s: SalaryReport)'));
console.log('calcIdx:', calcIdx + 1);
if (calcIdx !== -1) console.log(lines.slice(calcIdx, calcIdx + 10).join('\n'));

const workloadIdx = lines.findIndex((l, i) => i > calcIdx && l.includes('{/* Workload */}'));
console.log('workloadIdx:', workloadIdx + 1);
if (workloadIdx !== -1) console.log(lines.slice(workloadIdx, workloadIdx + 10).join('\n'));
