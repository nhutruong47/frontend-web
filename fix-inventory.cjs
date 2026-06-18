const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'GroupDetailPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// remove inventoryService
content = content.replace(/, inventoryService/g, '');
content = content.replace(/, InventoryItem/g, '');

// Also remove the code that uses inventoryService
content = content.replace(/inventoryService\./g, '// inventoryService.');
content = content.replace(/InventoryItem/g, 'any');

fs.writeFileSync(file, content);
