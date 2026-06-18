const fs = require('fs');

// 1. Update AdminPage.tsx to add toast to unimplemented buttons
let tsxContent = fs.readFileSync('src/pages/AdminPage.tsx', 'utf8');

// Ensure toast is imported
if (!tsxContent.includes("import { toast } from 'react-hot-toast';") && !tsxContent.includes("import toast from 'react-hot-toast';")) {
    tsxContent = tsxContent.replace("import { useAuth }", "import toast from 'react-hot-toast';\nimport { useAuth }");
}

// Add a generic click handler
if (!tsxContent.includes("const handleNotImplemented")) {
    tsxContent = tsxContent.replace(
        "const updateTeamVerification",
        "const handleNotImplemented = () => toast('Chức năng đang được phát triển', { icon: '🚧', style: { borderRadius: '10px', background: '#333', color: '#fff' } });\n\n  const updateTeamVerification"
    );
}

// Thêm doanh nghiệp
tsxContent = tsxContent.replace(
    /<button type="button" className="admin-button admin-button-primary"><Plus size=\{16\} \/> Thêm doanh nghiệp<\/button>/g,
    '<button type="button" className="admin-button admin-button-primary" onClick={handleNotImplemented}><Plus size={16} /> Thêm doanh nghiệp</button>'
);

// Sửa, Khóa, Xóa (doanh nghiệp)
tsxContent = tsxContent.replace(
    /<button>Sửa<\/button>/g,
    '<button onClick={handleNotImplemented} className="btn-edit">Sửa</button>'
);
tsxContent = tsxContent.replace(
    /<button><Lock size=\{14\} \/> Khóa<\/button>/g,
    '<button onClick={handleNotImplemented} className="btn-lock"><Lock size={14} /> Khóa</button>'
);
tsxContent = tsxContent.replace(
    /<button>Xóa<\/button>/g,
    '<button onClick={handleNotImplemented} className="btn-delete">Xóa</button>'
);
tsxContent = tsxContent.replace(
    /<button onClick=\{\(\) => updateTeamVerification\(item\.id, 'APPROVED'\)\}><CheckCircle2 size=\{14\} \/> Duyệt<\/button>/g,
    '<button onClick={() => updateTeamVerification(item.id, \'APPROVED\')} className="btn-approve"><CheckCircle2 size={14} /> Duyệt</button>'
);
tsxContent = tsxContent.replace(
    /<button onClick=\{\(\) => updateTeamVerification\(item\.id, 'REJECTED'\)\}><XCircle size=\{14\} \/> Từ chối<\/button>/g,
    '<button onClick={() => updateTeamVerification(item.id, \'REJECTED\')} className="btn-reject"><XCircle size={14} /> Từ chối</button>'
);

// Tỉo người dùng
tsxContent = tsxContent.replace(
    /<button type="button" className="admin-button admin-button-primary"><Plus size=\{16\} \/> Tạo người dùng<\/button>/g,
    '<button type="button" className="admin-button admin-button-primary" onClick={handleNotImplemented}><Plus size={16} /> Tạo người dùng</button>'
);

// Đặt lại (người dùng)
tsxContent = tsxContent.replace(
    /<button><RotateCcw size=\{14\} \/> Đặt lại<\/button>/g,
    '<button onClick={handleNotImplemented} className="btn-reset"><RotateCcw size={14} /> Đặt lại</button>'
);

// Kích hoạt / Khóa (người dùng)
tsxContent = tsxContent.replace(
    /<button>\{item\.status === 'Locked' \? <Unlock size=\{14\} \/> : <Lock size=\{14\} \/>\} \{item\.status === 'Locked' \? 'Kích hoạt' : 'Khóa'\}<\/button>/g,
    '<button onClick={handleNotImplemented} className="btn-lock">{item.status === \'Locked\' ? <Unlock size={14} /> : <Lock size={14} />} {item.status === \'Locked\' ? \'Kích hoạt\' : \'Khóa\'}</button>'
);

// Tạo gói
tsxContent = tsxContent.replace(
    /<button className="admin-button admin-button-primary"><Plus size=\{16\} \/> Tạo gói<\/button>/g,
    '<button className="admin-button admin-button-primary" onClick={handleNotImplemented}><Plus size={16} /> Tạo gói</button>'
);

// Tạo rule
tsxContent = tsxContent.replace(
    /<button className="admin-button admin-button-primary"><BellRing size=\{16\} \/> Tạo rule<\/button>/g,
    '<button className="admin-button admin-button-primary" onClick={handleNotImplemented}><BellRing size={16} /> Tạo rule</button>'
);

// Tạo quy trình
tsxContent = tsxContent.replace(
    /<button className="admin-button admin-button-primary"><Plus size=\{16\} \/> Tạo quy trình<\/button>/g,
    '<button className="admin-button admin-button-primary" onClick={handleNotImplemented}><Plus size={16} /> Tạo quy trình</button>'
);

// Sửa (quy trình)
tsxContent = tsxContent.replace(
    /<strong>\{stage\}<\/strong><button>Sửa<\/button>/g,
    '<strong>{stage}</strong><button onClick={handleNotImplemented} className="btn-edit">Sửa</button>'
);

// Cấu hình AI
tsxContent = tsxContent.replace(
    /<button className="admin-button admin-button-primary"><Settings size=\{16\} \/> Cấu hình AI<\/button>/g,
    '<button className="admin-button admin-button-primary" onClick={handleNotImplemented}><Settings size={16} /> Cấu hình AI</button>'
);

fs.writeFileSync('src/pages/AdminPage.tsx', tsxContent);

// 2. Update AdminPage.css
let cssContent = fs.readFileSync('src/pages/AdminPage.css', 'utf8');

// The user is not liking the gold/tan (#d4a574) button.
// Let's use a nice modern primary button style like a sleek blue or green, or just a better looking default.
// Wait, the primary button is `.admin-button-primary`.
// Let's replace the .admin-button-primary block
cssContent = cssContent.replace(
    /\.admin-button-primary \{[\s\S]*?\}/,
    `.admin-button-primary {
  background: var(--primary-color, #2563eb);
  color: white;
  border: none;
  font-weight: 600;
  box-shadow: 0 4px 12px rgba(37, 99, 235, 0.2);
}
.admin-button-primary:hover {
  background: #1d4ed8;
  box-shadow: 0 6px 16px rgba(37, 99, 235, 0.3);
  transform: translateY(-1px);
}`
);

// Let's add nicer button styles for `.admin-row-actions`
const actionStyles = `
/* Modern Action Buttons */
.admin-row-actions button {
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 4px;
  border: 1px solid transparent;
  transition: all 0.2s;
  cursor: pointer;
}

.admin-row-actions .btn-edit {
  background: rgba(255, 255, 255, 0.05);
  color: #e2e8f0;
  border-color: rgba(255, 255, 255, 0.1);
}
.admin-row-actions .btn-edit:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 255, 255, 0.2);
}

.admin-row-actions .btn-lock {
  background: rgba(245, 158, 11, 0.1);
  color: #f59e0b;
  border-color: rgba(245, 158, 11, 0.2);
}
.admin-row-actions .btn-lock:hover {
  background: rgba(245, 158, 11, 0.2);
}

.admin-row-actions .btn-delete,
.admin-row-actions .btn-reject {
  background: rgba(239, 68, 68, 0.1);
  color: #ef4444;
  border-color: rgba(239, 68, 68, 0.2);
}
.admin-row-actions .btn-delete:hover,
.admin-row-actions .btn-reject:hover {
  background: rgba(239, 68, 68, 0.2);
}

.admin-row-actions .btn-approve {
  background: rgba(34, 197, 94, 0.1);
  color: #22c55e;
  border-color: rgba(34, 197, 94, 0.2);
}
.admin-row-actions .btn-approve:hover {
  background: rgba(34, 197, 94, 0.2);
}

.admin-row-actions .btn-reset {
  background: rgba(56, 189, 248, 0.1);
  color: #38bdf8;
  border-color: rgba(56, 189, 248, 0.2);
}
.admin-row-actions .btn-reset:hover {
  background: rgba(56, 189, 248, 0.2);
}
`;

if (!cssContent.includes('.admin-row-actions .btn-edit')) {
    cssContent += actionStyles;
}

// Remove old generic button style from .admin-row-actions
cssContent = cssContent.replace(
    /\.admin-row-actions button \{[\s\S]*?cursor: pointer;\n\}/g,
    '' // The block has been replaced by the new generic style above
);
cssContent = cssContent.replace(
    /\.admin-row-actions button:hover \{[\s\S]*?\n\}/g,
    '' 
);

// If the primary button was using a gradient, let's make sure it's completely replaced.
if (cssContent.includes('background: linear-gradient')) {
    cssContent = cssContent.replace(/background: linear-gradient[^\n]*;/g, 'background: var(--primary-color, #2563eb);');
}

fs.writeFileSync('src/pages/AdminPage.css', cssContent);

console.log('Fixed buttons and styles in AdminPage');
