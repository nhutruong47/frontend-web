const fs = require('fs');
const file = 'src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Fix types and tabs
content = content.replace(/type AdminSection =[\s\S]*?;/, `type AdminSection =
  | 'overview'
  | 'businesses'
  | 'users'
  | 'subscriptions'
  | 'billing'
  | 'ai'
  | 'support'
  | 'system';`);

content = content.replace(/const tabs: Array.*?\];/s, `const tabs: Array<{ id: AdminSection; label: string; icon: React.ElementType }> = [
  { id: 'overview', label: 'Tổng quan', icon: Gauge },
  { id: 'businesses', label: 'Doanh nghiệp', icon: Building2 },
  { id: 'users', label: 'Người dùng', icon: Users },
  { id: 'subscriptions', label: 'Gói dịch vụ', icon: ReceiptText },
  { id: 'billing', label: 'Thanh toán', icon: CreditCard },
  { id: 'ai', label: 'Sử dụng AI', icon: Brain },
  { id: 'support', label: 'Hỗ trợ', icon: BellRing },
  { id: 'system', label: 'Hệ thống', icon: Server }
];`);

// 2. Rename monitoring to system
content = content.replace(/{active === 'monitoring' && \(/g, "{active === 'system' && (");

// 3. Delete unused blocks
function removeBlock(c, sec) {
    const startStr = `{active === '${sec}' && (`;
    const startIndex = c.indexOf(startStr);
    if (startIndex === -1) return c;
    
    let ob = 0, op = 0, ei = -1, st = false;
    for (let i = startIndex; i < c.length; i++) {
        if (c[i] === '{') ob++;
        if (c[i] === '}') ob--;
        if (c[i] === '(') op++;
        if (c[i] === ')') op--;
        if (ob > 0 || op > 0) st = true;
        if (st && ob === 0 && op === 0) { ei = i; break; }
    }
    if (ei !== -1) return c.substring(0, startIndex) + c.substring(ei + 1);
    return c;
}

content = removeBlock(content, 'audit');
content = removeBlock(content, 'workflow');
content = removeBlock(content, 'alerts');
content = removeBlock(content, 'reports');

// 4. Add support block
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

// 5. Remove unused variables
content = content.replace(/const auditLogs = \[[\s\S]*?\];/s, '');
content = content.replace(/const \[workflowStages, setWorkflowStages\] = useState[\s\S]*?\]\);/s, '');
content = content.replace(/const \[dragIndex, setDragIndex\] = useState<number \| null>\(null\);/s, '');

// remove moveStage function
const startMove = 'const moveStage = (from: number, to: number) => {';
const endMove = '  };';
const idxMove = content.indexOf(startMove);
if (idxMove > -1) {
    const idxMoveEnd = content.indexOf(endMove, idxMove) + endMove.length;
    content = content.substring(0, idxMove) + content.substring(idxMoveEnd);
}

// 6. Delete alerts section manually
const startAlerts = '<section className="admin-card">\n            <div className="admin-card-head">\n              <h3>Danh sách cảnh báo hệ thống</h3>';
const idxAlerts = content.indexOf(startAlerts);
if (idxAlerts > -1) {
    const endAlerts = '</section>';
    const idxAlertsEnd = content.indexOf(endAlerts, idxAlerts) + endAlerts.length;
    content = content.substring(0, idxAlerts) + content.substring(idxAlertsEnd);
}

// 7. Unused imports
content = content.replace('FileBarChart,', '');
content = content.replace('GripVertical,', '');
content = content.replace('Workflow,', '');
content = content.replace('AlertTriangle,', '');

fs.writeFileSync(file, content);
console.log("Refactoring complete");
