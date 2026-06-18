const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

// Change the plus gradient to a neutral/dark style or just solid color
// old: case 'plus': return { bg: 'linear-gradient(135deg, #f59e0b, #d97706)', text: '#fff', label: 'Plus' };
content = content.replace(
    /case 'plus': return \{ bg: 'linear-gradient\(135deg, #f59e0b, #d97706\)', text: '#fff', label: 'Plus' \};/,
    "case 'plus': return { bg: '#e2e8f0', text: '#475569', label: 'Plus' };"
);

fs.writeFileSync('src/components/Sidebar.tsx', content);
console.log('Sidebar.tsx updated: removed yellow gradient from Plus badge');
