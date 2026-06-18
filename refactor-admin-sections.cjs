const fs = require('fs');
const file = 'src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// Rename monitoring to system
content = content.replace(/{active === 'monitoring' && \(/g, "{active === 'system' && (");

// Now we need to delete the blocks for audit, workflow, alerts, reports
// We can use regex to match `{active === 'audit' && ( ... )}`
// Note: regex with greedy matches might be dangerous. We'll find the start and end indices carefully.

function removeBlock(content, sectionName) {
    const startStr = `{active === '${sectionName}' && (`;
    const startIndex = content.indexOf(startStr);
    if (startIndex === -1) return content;
    
    // We want to find the matching closing `)}` for this block.
    // The block is enclosed in `{active === '...' && ( ... )}`
    // We can count brackets.
    let openBraces = 0;
    let openParens = 0;
    let endIndex = -1;
    let started = false;
    
    for (let i = startIndex; i < content.length; i++) {
        if (content[i] === '{') openBraces++;
        if (content[i] === '}') openBraces--;
        if (content[i] === '(') openParens++;
        if (content[i] === ')') openParens--;
        
        if (openBraces > 0 || openParens > 0) {
            started = true;
        }
        
        if (started && openBraces === 0 && openParens === 0) {
            endIndex = i;
            break;
        }
    }
    
    if (endIndex !== -1) {
        return content.substring(0, startIndex) + content.substring(endIndex + 1);
    }
    return content;
}

content = removeBlock(content, 'audit');
content = removeBlock(content, 'workflow');
content = removeBlock(content, 'alerts');
content = removeBlock(content, 'reports');

// Now add the `support` block right after `ai` or before `system`
const systemStr = "{active === 'system' && (";
const supportBlock = `
      {active === 'support' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 16 }}>
          <section className="admin-card">
            <h3>Ticket hỗ trợ</h3>
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Chưa có ticket nào</div>
          </section>
          <section className="admin-card">
            <h3>Khiếu nại</h3>
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Không có khiếu nại</div>
          </section>
          <section className="admin-card">
            <h3>Yêu cầu xác minh</h3>
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--text-muted)' }}>Không có yêu cầu nào</div>
          </section>
        </div>
      )}
      `;

content = content.replace(systemStr, supportBlock + '\n      ' + systemStr);

fs.writeFileSync(file, content);
console.log("Refactored AdminPage sections");
