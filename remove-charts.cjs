const fs = require('fs');
const path = require('path');

const groupPagePath = path.join(__dirname, 'src', 'pages', 'GroupDetailPage.tsx');
let content = fs.readFileSync(groupPagePath, 'utf8');

// Find the start and end of the block
const startMarker = '{/* ===== LINE CHART ===== */}';
const endMarker = '{/* ===== MEMBER CARDS ===== */}';

const startIndex = content.indexOf(startMarker);
const endIndex = content.indexOf(endMarker);

if (startIndex !== -1 && endIndex !== -1) {
    // We also need to remove `{isManager && totalTasks > 0 && (` before it and `)}` after the Two Col block.
    // Actually, looking at the file, it has:
    // {isManager && totalTasks > 0 && (
    // <>
    // {/* ===== LINE CHART ===== */}
    // ...
    // </>
    // )}

    const blockStart = content.lastIndexOf('{isManager && totalTasks > 0 && (', startIndex);
    const blockEnd = endIndex;

    if (blockStart !== -1) {
        content = content.substring(0, blockStart) + content.substring(blockEnd);
        fs.writeFileSync(groupPagePath, content);
        console.log("Successfully removed charts from GroupDetailPage.tsx");
    } else {
        console.log("Could not find blockStart");
    }
} else {
    console.log("Could not find start or end markers");
}
