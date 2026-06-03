const fs = require('fs');
let pageContent = fs.readFileSync('src/pages/GroupDetailPage.tsx', 'utf-8');

const s = pageContent.indexOf('onChange={async e => {');
if (s !== -1) {
    console.log(pageContent.substring(s, s + 400));
} else {
    console.log("Not found at all");
}
