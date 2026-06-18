const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'src', 'pages', 'GroupDetailPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// remove inventoryService
content = content.replace(', inventoryService } from \'../services/groupService\';', ' } from \'../services/groupService\';');
content = content.replace(', InventoryItem } from \'../types/types\';', ' } from \'../types/types\';');

// remove lineData
const lineStart = '// Mock line chart data';
const lineEnd = 'return point;\n    });';
const idxStart = content.indexOf(lineStart);
const idxEnd = content.indexOf(lineEnd);
if (idxStart > -1 && idxEnd > -1) {
    content = content.substring(0, idxStart) + content.substring(idxEnd + lineEnd.length);
}

fs.writeFileSync(file, content);
