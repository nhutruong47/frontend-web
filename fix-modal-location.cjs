const fs = require('fs');
const path = require('path');

const groupPage = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(groupPage, 'utf8');

const modalRegex = /\{\/\* History Modal \*\/\}(.|\n)*?\)\}/m;
const modalMatch = content.match(modalRegex);

if (modalMatch) {
    const modalStr = modalMatch[0];
    content = content.replace(modalStr, ''); // Remove from SalaryPanel

    // Find the end of GroupDetailPage. It usually ends before 'function SalaryPanel' or 'const SalaryPanel'
    const salaryPanelMatch = content.match(/function SalaryPanel|const SalaryPanel/);
    if (salaryPanelMatch) {
        const insertIndex = salaryPanelMatch.index;
        // Find the last '</div>' before this index
        const substring = content.substring(0, insertIndex);
        const lastDivIndex = substring.lastIndexOf('</div>');
        if (lastDivIndex !== -1) {
            content = content.substring(0, lastDivIndex) + '\\n' + modalStr + '\\n' + content.substring(lastDivIndex);
            fs.writeFileSync(groupPage, content, 'utf8');
            console.log('Modal moved successfully.');
        } else {
            console.log('Could not find last div before SalaryPanel.');
        }
    } else {
        console.log('Could not find SalaryPanel.');
    }
} else {
    console.log('Could not find History Modal.');
}
