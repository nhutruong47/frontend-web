const fs = require('fs');
const path = require('path');

const file = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(file, 'utf8');

// Find SalaryPanel start and end
const startIdx = content.indexOf('function SalaryPanel');
if (startIdx !== -1) {
    let panelContent = content.substring(startIdx);
    
    // Panel Wrapper
    panelContent = panelContent.replace(/background: '#fff', borderRadius: 20/, "background: 'var(--bg-card)', borderRadius: 20");
    panelContent = panelContent.replace(/border: '1px solid #e2e8f0'/g, "border: '1px solid var(--border)'");
    
    // Month Selector Area
    panelContent = panelContent.replace(/background: '#fafafa'/g, "background: 'var(--bg-input)'");
    panelContent = panelContent.replace(/borderBottom: '1px solid #f1f5f9'/g, "borderBottom: '1px solid var(--border)'");
    
    // Select dropdown & arrows
    panelContent = panelContent.replace(/background: '#fff'/g, "background: 'var(--bg-card)'");
    panelContent = panelContent.replace(/color: '#1e293b'/g, "color: 'var(--text-primary)'");
    panelContent = panelContent.replace(/stroke="#64748b"/g, 'stroke="var(--text-secondary)"');
    
    // Stat Cards bg
    panelContent = panelContent.replace(/bg: '#eff6ff'/g, "bg: 'rgba(59, 130, 246, 0.1)'");
    panelContent = panelContent.replace(/bg: '#f5f3ff'/g, "bg: 'rgba(139, 92, 246, 0.1)'");
    panelContent = panelContent.replace(/bg: '#ecfdf5'/g, "bg: 'rgba(16, 185, 129, 0.1)'");
    panelContent = panelContent.replace(/bg: '#fffbeb'/g, "bg: 'rgba(245, 158, 11, 0.1)'");
    
    // Table Header & Footer
    panelContent = panelContent.replace(/background: '#f8fafc'/g, "background: 'rgba(255,255,255,0.03)'");
    
    // Rows
    panelContent = panelContent.replace(/background: '#fff'/g, "background: 'transparent'"); // Wait, background: '#fff' was replaced by var(--bg-card) already? Ah! The order matters.
    // I will replace specific patterns
    panelContent = panelContent.replace(/onMouseEnter=\{e => e\.currentTarget\.style\.background = '#fafafa'\}/g, "onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.02)'}");
    panelContent = panelContent.replace(/onMouseLeave=\{e => e\.currentTarget\.style\.background = 'var\(--bg-card\)'\}/g, "onMouseLeave={e => e.currentTarget.style.background = 'transparent'}");
    // Original might be '#fff'
    panelContent = panelContent.replace(/onMouseLeave=\{e => e\.currentTarget\.style\.background = '#fff'\}/g, "onMouseLeave={e => e.currentTarget.style.background = 'transparent'}");

    // Badges
    panelContent = panelContent.replace(/background: completionRate >= 80 \? '#dcfce7' : completionRate >= 50 \? '#fef3c7' : '#fee2e2'/g, "background: completionRate >= 80 ? 'rgba(22, 163, 74, 0.2)' : completionRate >= 50 ? 'rgba(217, 119, 6, 0.2)' : 'rgba(220, 38, 38, 0.2)'");
    
    // Hourly Rate Tag
    panelContent = panelContent.replace(/background: hourlyRateOverride\[s\.memberId\] \? '#fef3c7' : '#f1f5f9'/g, "background: hourlyRateOverride[s.memberId] ? 'rgba(217, 119, 6, 0.2)' : 'rgba(255, 255, 255, 0.05)'");
    panelContent = panelContent.replace(/color: '#475569'/g, "color: 'var(--text-secondary)'");
    panelContent = panelContent.replace(/border: '1px dashed #cbd5e1'/g, "border: '1px dashed var(--border)'");

    // Replace the SalaryPanel content back
    content = content.substring(0, startIdx) + panelContent;
    
    // More targeted replacements inside panelContent
    content = content.replace(/borderBottom: idx < salaryData.length - 1 \? '1px solid #f1f5f9' : 'none'/g, "borderBottom: idx < salaryData.length - 1 ? '1px solid var(--border)' : 'none'");
    content = content.replace(/borderTop: '1px solid #e2e8f0'/g, "borderTop: '1px solid var(--border)'");

    fs.writeFileSync(file, content, 'utf8');
    console.log('Fixed theme colors');
} else {
    console.log('SalaryPanel not found');
}
