const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'CreateTaskPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Replace all hardcoded #fff and #ffffff in AiResultRefinementForm with CSS variables
// Be careful not to replace text color #fff inside buttons (e.g., #d4a574 buttons use white text)

// Backgrounds
content = content.replace(/background: '#fff'/g, "background: 'var(--bg-card)'");
content = content.replace(/background: '#ffffff'/g, "background: 'var(--bg-card)'");
content = content.replace(/background: '#f1f5f9'/g, "background: 'var(--bg-secondary)'");
content = content.replace(/background: '#fff1f2'/g, "background: 'rgba(239, 68, 68, 0.1)'"); // light red
content = content.replace(/background: '#fff7ed'/g, "background: 'rgba(249, 115, 22, 0.1)'"); // light orange
content = content.replace(/background: '#f0fdf4'/g, "background: 'rgba(34, 197, 94, 0.1)'"); // light green
content = content.replace(/background: '#fffbeb'/g, "background: 'rgba(234, 179, 8, 0.1)'"); // light yellow
content = content.replace(/background: '#fff9db'/g, "background: 'var(--bg-input)'"); // clarify yellow

// Colors
content = content.replace(/color: '#64748b'/g, "color: 'var(--text-secondary)'");
content = content.replace(/color: '#94a3b8'/g, "color: 'var(--text-muted)'");
content = content.replace(/color: '#1e293b'/g, "color: 'var(--text-primary)'");
content = content.replace(/color: '#334155'/g, "color: 'var(--text-primary)'");
content = content.replace(/color: '#0f172a'/g, "color: 'var(--text-primary)'");
content = content.replace(/color: '#9a3412'/g, "color: 'var(--warning)'");

// Borders
content = content.replace(/border: '1px solid #e2e8f0'/g, "border: '1px solid var(--border)'");
content = content.replace(/border: '1px solid #e0e7ff'/g, "border: '1px solid var(--border)'");
content = content.replace(/borderBottom: '1px solid #f1f5f9'/g, "borderBottom: '1px solid var(--border)'");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed CreateTaskPage.tsx deeper theme colors');
