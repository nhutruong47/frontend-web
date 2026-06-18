const fs = require('fs');
const file = 'src/pages/GroupDetailPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Fix dummy arguments
content = content.replace(/getByTeam: async \(\) => \[\]/g, 'getByTeam: async (...args: any[]) => []');
content = content.replace(/create: async \(\) => \{\}/g, 'create: async (...args: any[]) => {}');
content = content.replace(/updateQuantity: async \(\) => \{\}/g, 'updateQuantity: async (...args: any[]) => {}');
content = content.replace(/delete: async \(\) => \{\}/g, 'delete: async (...args: any[]) => {}');

// Remove lineData unused var safely
const rx = /const lineData = \[[\s\S]*?\];/;
content = content.replace(rx, '');

fs.writeFileSync(file, content);
console.log("Fixed dummy arguments and removed lineData");
