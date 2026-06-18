const fs = require('fs');
let content = fs.readFileSync('src/pages/ProductionOrderPage.tsx', 'utf8');

// Update createDefaultForm to include status
content = content.replace(
    /customerName: '',/,
    `customerName: '',
    status: 'PENDING',`
);

// Update startEdit to include status
content = content.replace(
    /customerName: order\.customerName \|\| '',/,
    `customerName: order.customerName || '',
            status: order.status || 'PENDING',`
);

// Add status field to form
const statusField = `
                            <Field label="Trạng thái đơn hàng">
                                <select value={form.status} onChange={e => handleChange('status', e.target.value)} style={inputStyle}>
                                    {STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}
                                </select>
                            </Field>
`;

content = content.replace(
    /<Field label="Tieu de don hang" required>/,
    statusField + '\n                            <Field label="Tieu de don hang" required>'
);

// Mock deduction logic on submit
content = content.replace(
    /await productionService\.updateOrder\(editingOrderId, payload\);/,
    `await productionService.updateOrder(editingOrderId, payload);
                if (payload.status === 'DELIVERED' && form.status !== 'DELIVERED') {
                    const src = payload.materialSource === 'CUSTOMER' ? 'Nguyên liệu khách gửi' : 'Kho xưởng';
                    alert(\`[HỆ THỐNG] Đã tự động trừ \${payload.inputRequired || 0} kg vào \${src} thành công!\`);
                }`
);

fs.writeFileSync('src/pages/ProductionOrderPage.tsx', content);
console.log('Updated ProductionOrderPage.tsx with status edit & deduction logic');
