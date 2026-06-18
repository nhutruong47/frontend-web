const fs = require('fs');
const path = require('path');

const groupPagePath = path.join(__dirname, 'src', 'pages', 'GroupDetailPage.tsx');
let content = fs.readFileSync(groupPagePath, 'utf8');

const startMarker = '{/* ===== EMPTY STATE / ANALYTICS ===== */}';
const endMarker = '{/* ===== MEMBER CARDS ===== */}';
const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex > -1 && endIndex > -1) {
    content = content.substring(0, startIndex) + content.substring(endIndex);
    fs.writeFileSync(groupPagePath, content);
    console.log("Successfully removed charts from GroupDetailPage.tsx");
} else {
    console.log("Could not find start or end markers");
}
