const fs = require('fs');
let content = fs.readFileSync('src/pages/ProductionOrderPage.tsx', 'utf8');

// 1. Add constants
const constantsAdd = `
const MATERIAL_SOURCES = [
    { value: 'CUSTOMER', label: 'Khách hàng cung cấp' },
    { value: 'FACTORY', label: 'Xưởng cung cấp' },
    { value: 'COMBINED', label: 'Kết hợp' },
];

const SERVICE_TYPES = [
    'Rang',
    'QC',
    'Đóng gói',
    'Phân loại',
    'Tách màu',
    'Xử lý sau thu hoạch',
    'Gia công trọn gói'
];
`;
content = content.replace('const PRODUCT_TYPES = [', constantsAdd + '\nconst PRODUCT_TYPES = [');

// 2. Update createDefaultForm
content = content.replace(
    /customerName: '',\s+productType: 'Robusta',/,
    `customerName: '',
    materialSource: 'FACTORY',
    serviceTypes: ['Gia công trọn gói'],
    productType: 'Robusta',`
);

// 3. Update startEdit
content = content.replace(
    /customerName: order\.customerName \|\| '',\s+productType: order\.productType \|\| 'Robusta',/,
    `customerName: order.customerName || '',
            materialSource: order.materialSource || 'FACTORY',
            serviceTypes: order.serviceTypes || ['Gia công trọn gói'],
            productType: order.productType || 'Robusta',`
);

// 4. Add form fields
const formFields = `
                            {/* Nguồn nguyên liệu & Dịch vụ */}
                            <div style={{ gridColumn: '1 / -1' }}>
                                <h3 style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-muted)', marginBottom: 12, marginTop: 8, textTransform: 'uppercase', letterSpacing: 1 }}>Nguồn nguyên liệu & Dịch vụ</h3>
                            </div>

                            <Field label="Nguồn nguyên liệu">
                                <div style={{ display: 'flex', gap: 16 }}>
                                    {MATERIAL_SOURCES.map(src => (
                                        <label key={src.value} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
                                            <input type="radio" name="materialSource" value={src.value}
                                                checked={form.materialSource === src.value}
                                                onChange={e => handleChange('materialSource', e.target.value)}
                                            />
                                            {src.label}
                                        </label>
                                    ))}
                                </div>
                            </Field>

                            <Field label="Loại dịch vụ" required>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, background: 'var(--bg-input)', padding: 12, borderRadius: 10, border: '1px solid var(--border)' }}>
                                    {SERVICE_TYPES.map(svc => (
                                        <label key={svc} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 14, color: 'var(--text-primary)', cursor: 'pointer' }}>
                                            <input type="checkbox"
                                                checked={(form.serviceTypes || []).includes(svc)}
                                                onChange={e => {
                                                    let nextTypes = [...(form.serviceTypes || [])];
                                                    if (e.target.checked) {
                                                        if (svc === 'Gia công trọn gói') nextTypes = ['Gia công trọn gói'];
                                                        else {
                                                            nextTypes = nextTypes.filter(t => t !== 'Gia công trọn gói');
                                                            nextTypes.push(svc);
                                                        }
                                                    } else {
                                                        nextTypes = nextTypes.filter(t => t !== svc);
                                                    }
                                                    handleChange('serviceTypes', nextTypes);
                                                }}
                                            />
                                            {svc}
                                        </label>
                                    ))}
                                </div>
                            </Field>
`;
content = content.replace(
    /\{\/\* San pham \*\/\}/,
    formFields + '\n                            {/* San pham */}'
);

// 5. Update Order Dashboard Card
content = content.replace(
    /\{order\.productType && \(\s*<span style=\{\{ fontSize: 11, color: 'var\(--text-muted\)', padding: '2px 8px', background: 'var\(--bg-input\)', borderRadius: 4 \}\}>\s*\{order\.productType\}\s*<\/span>\s*\)\}/,
    `{order.serviceTypes && order.serviceTypes.length > 0 && (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-input)', borderRadius: 4 }}>
                                                    {order.serviceTypes.join(', ')}
                                                </span>
                                            )}`
);

content = content.replace(
    /\{order\.customerName && <div style=\{\{ fontSize: 13, color: 'var\(--text-secondary\)' \}\}>Khach hang: \{order\.customerName\}<\/div>\}/,
    `{order.customerName && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Khách hàng: {order.customerName}</div>}
                                        {order.materialSource && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Nguồn NL: {MATERIAL_SOURCES.find(m => m.value === order.materialSource)?.label || order.materialSource}</div>}`
);

fs.writeFileSync('src/pages/ProductionOrderPage.tsx', content);
console.log('Updated ProductionOrderPage.tsx successfully');
