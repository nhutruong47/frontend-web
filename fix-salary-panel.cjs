const fs = require('fs');
const path = require('path');

const pageFile = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(pageFile, 'utf8');

// 1. Main Salary Panel Container
content = content.replace(/<div style={{ background: '#fff', borderRadius: 20, padding: 0, marginTop: 24, border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 24px rgba\(0,0,0,0.04\)' }}>/, 
    '<div style={{ background: "var(--bg-card, #1e293b)", borderRadius: 20, padding: 0, marginTop: 24, border: "1px solid var(--border, #334155)", overflow: "hidden", boxShadow: "0 4px 24px rgba(0,0,0,0.2)" }}>');

// 2. See Salary Button
content = content.replace(/background: showSalary \? 'rgba\(255,255,255,0.15\)' : '#fff',/g,
    "background: showSalary ? 'rgba(255,255,255,0.15)' : 'var(--bg-card, #1e293b)',");
content = content.replace(/color: showSalary \? '#fff' : '#3d2b1d',/g,
    "color: '#fff',");

// 3. Month Selector Bar
content = content.replace(/background: '#fafafa'/g, "background: 'var(--bg-card, #1e293b)'");
content = content.replace(/border: '1px solid #e2e8f0', background: '#fff'/g, "border: '1px solid var(--border, #334155)', background: 'var(--bg-tertiary, #0f172a)'");
content = content.replace(/background: '#fff', fontSize: 14/g, "background: 'var(--bg-tertiary, #0f172a)', fontSize: 14");

// 4. Summary Stats Grid
content = content.replace(/bg: '#eff6ff'/g, "bg: 'rgba(59, 130, 246, 0.1)'");
content = content.replace(/bg: '#f5f3ff'/g, "bg: 'rgba(139, 92, 246, 0.1)'");
content = content.replace(/bg: '#ecfdf5'/g, "bg: 'rgba(16, 185, 129, 0.1)'");
content = content.replace(/bg: '#fffbeb'/g, "bg: 'rgba(245, 158, 11, 0.1)'");

// 5. Table Header
content = content.replace(/background: '#f8fafc', borderRadius: '12px 12px 0 0'/g, "background: 'var(--bg-tertiary, #0f172a)', borderRadius: '12px 12px 0 0'");

// 6. Employee Row
content = content.replace(/background: '#fff',/g, "background: 'var(--bg-card, #1e293b)',");
content = content.replace(/onMouseEnter=\{e => e\.currentTarget\.style\.background = '#fafafa'\}/g, "onMouseEnter={e => e.currentTarget.style.background = 'var(--bg-tertiary, #334155)'}");
content = content.replace(/onMouseLeave=\{e => e\.currentTarget\.style\.background = '#fff'\}/g, "onMouseLeave={e => e.currentTarget.style.background = 'var(--bg-card, #1e293b)'}");
content = content.replace(/borderBottom: idx < salaryData\.length - 1 \? '1px solid #f1f5f9' : 'none'/g, "borderBottom: idx < salaryData.length - 1 ? '1px solid var(--border, #334155)' : 'none'");

// 7. Completion Rate Badge
content = content.replace(/background: completionRate >= 80 \? '#dcfce7' : completionRate >= 50 \? '#fef3c7' : '#fee2e2'/g, "background: completionRate >= 80 ? 'rgba(22, 163, 74, 0.1)' : completionRate >= 50 ? 'rgba(217, 119, 6, 0.1)' : 'rgba(220, 38, 38, 0.1)'");

// 8. Hourly Rate Badge
content = content.replace(/background: hourlyRateOverride\[s\.memberId\] \? '#fef3c7' : '#f1f5f9'/g, "background: hourlyRateOverride[s.memberId] ? 'rgba(245, 158, 11, 0.1)' : 'rgba(255,255,255,0.05)'");
content = content.replace(/color: '#475569'/g, "color: 'var(--text-secondary, #94a3b8)'");
content = content.replace(/border: '1px dashed #cbd5e1'/g, "border: '1px dashed var(--border, #334155)'");

// 9. Total Row and Bottom Bar
content = content.replace(/borderTop: '1px solid #e2e8f0', background: '#f8fafc'/g, "borderTop: '1px solid var(--border, #334155)', background: 'var(--bg-tertiary, #0f172a)'");
content = content.replace(/padding: '16px 28px', borderTop: '1px solid #e2e8f0', background: '#fff', display: 'flex', justifyContent: 'flex-end', gap: 12/g, "padding: '16px 28px', borderTop: '1px solid var(--border, #334155)', background: 'var(--bg-card, #1e293b)', display: 'flex', justifyContent: 'flex-end', gap: 12");
content = content.replace(/background: '#fff', color: '#475569', border: '1px solid #cbd5e1'/g, "background: 'var(--bg-tertiary, #334155)', color: 'var(--text-primary, #fff)', border: '1px solid var(--border, #475569)'");

fs.writeFileSync(pageFile, content, 'utf8');
console.log('GroupDetailPage.tsx SalaryPanel colors fixed for dark mode.');
