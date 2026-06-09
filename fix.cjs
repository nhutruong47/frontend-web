const fs = require('fs');

let pageContent = fs.readFileSync('src/pages/GroupDetailPage.tsx', 'utf-8');

// I will just use regex to replace the fetch call
const regex = /await fetch\(\`\/api\/tasks\/\$\{t\.id\}\/assign\?memberId=\$\{e\.target\.value\}\`, \{[\s\n]*method: 'PUT',[\s\n]*headers: \{ 'Authorization': \`Bearer \$\{localStorage\.getItem\('token'\)\}\`\}[\s\n]*\}\);/;

if (regex.test(pageContent)) {
    let replace = `await fetch(\`/api/tasks/\${t.id}/assign\`, {
                                                                    method: 'PATCH',
                                                                    headers: {
                                                                        'Authorization': \`Bearer \${localStorage.getItem('token')}\`,
                                                                        'Content-Type': 'application/json'
                                                                    },
                                                                    body: JSON.stringify({ memberId: e.target.value })
                                                                });`;

    let finalStr = pageContent.replace(regex, replace);
    fs.writeFileSync('src/pages/GroupDetailPage.tsx', finalStr);
    console.log('Page Fetch Updated with Regex!');
} else {
    console.log('Search chunk missing with Regex too');

    // Fallback: Check if it's already there
    if (pageContent.includes("method: 'PATCH'")) {
        console.log("WAIT! IT ALREADY HAS PATCH!")
    }
}
