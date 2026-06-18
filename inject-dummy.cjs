const fs = require('fs');
const file = 'src/pages/GroupDetailPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Undo the broken comments
content = content.replace(/\/\/ inventoryService/g, 'inventoryService');

// Add a dummy inventoryService definition
const dummy = `
const inventoryService = {
  getByTeam: async () => [],
  create: async () => {},
  updateQuantity: async () => {},
  delete: async () => {}
};
`;

if (!content.includes('const inventoryService = {')) {
    content = content.replace('export default function GroupDetailPage() {', dummy + '\nexport default function GroupDetailPage() {');
}

// remove lineData if it's there
const lineStart = '// Mock line chart data';
const lineEnd = 'return point;\n    });';
const idxStart = content.indexOf(lineStart);
const idxEnd = content.indexOf(lineEnd);
if (idxStart > -1 && idxEnd > -1) {
    content = content.substring(0, idxStart) + content.substring(idxEnd + lineEnd.length);
}

fs.writeFileSync(file, content);
console.log("Injected dummy inventory service");
