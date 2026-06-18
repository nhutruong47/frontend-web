const fs = require('fs');
let content = fs.readFileSync('src/components/Sidebar.tsx', 'utf8');

content = content.replace(
    "case 'plus': return { bg: '#e2e8f0', text: '#475569', label: 'Plus' };",
    "case 'plus': return { bg: 'transparent', text: '#e7a766', label: 'Plus' };"
);

fs.writeFileSync('src/components/Sidebar.tsx', content);
console.log('Removed background for Plus badge in Sidebar');
