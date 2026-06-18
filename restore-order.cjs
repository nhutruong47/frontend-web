const fs = require('fs');
let content = fs.readFileSync('src/pages/ProductionOrderPage.tsx', 'utf8');

// 1. Remove constantsAdd
const constantsAddRegex = /const MATERIAL_SOURCES = \[\s*\{ value: 'CUSTOMER', label: 'Khách hàng cung cấp' \},\s*\{ value: 'FACTORY', label: 'Xưởng cung cấp' \},\s*\{ value: 'COMBINED', label: 'Kết hợp' \},\s*\];\s*const SERVICE_TYPES = \[\s*'Rang',\s*'QC',\s*'Đóng gói',\s*'Phân loại',\s*'Tách màu',\s*'Xử lý sau thu hoạch',\s*'Gia công trọn gói'\s*\];\n/;
content = content.replace(constantsAddRegex, '');

// 2. Remove from createDefaultForm & status addition
content = content.replace(/customerName: '',\n\s*status: 'PENDING',\n\s*materialSource: 'FACTORY',\n\s*serviceTypes: \['Gia công trọn gói'\],\n\s*productType: 'Robusta',/, "customerName: '',\n    productType: 'Robusta',");
content = content.replace(/customerName: '',\n\s*materialSource: 'FACTORY',\n\s*serviceTypes: \['Gia công trọn gói'\],\n\s*productType: 'Robusta',/, "customerName: '',\n    productType: 'Robusta',");

// 3. Remove from startEdit & status addition
content = content.replace(/customerName: order\.customerName \|\| '',\n\s*status: order\.status \|\| 'PENDING',\n\s*materialSource: order\.materialSource \|\| 'FACTORY',\n\s*serviceTypes: order\.serviceTypes \|\| \['Gia công trọn gói'\],\n\s*productType: order\.productType \|\| 'Robusta',/, "customerName: order.customerName || '',\n            productType: order.productType || 'Robusta',");
content = content.replace(/customerName: order\.customerName \|\| '',\n\s*materialSource: order\.materialSource \|\| 'FACTORY',\n\s*serviceTypes: order\.serviceTypes \|\| \['Gia công trọn gói'\],\n\s*productType: order\.productType \|\| 'Robusta',/, "customerName: order.customerName || '',\n            productType: order.productType || 'Robusta',");

// Remove the new fields
const formFieldsRegex = /\{\/\* Nguồn nguyên liệu & Dịch vụ \*\/\}.*?<\/Field>\s*\{\/\* San pham \*\/\}/s;
content = content.replace(formFieldsRegex, '{/* San pham */}');

const statusFieldRegex = /<Field label="Trạng thái đơn hàng">.*?<\/Field>\s*<Field label="Tieu de don hang" required>/s;
content = content.replace(statusFieldRegex, '<Field label="Tieu de don hang" required>');

// Remove from deduction logic
const deductionRegex = /await productionService\.updateOrder\(editingOrderId, payload\);\n\s*if \(payload\.status === 'DELIVERED'.*?\}/s;
content = content.replace(deductionRegex, 'await productionService.updateOrder(editingOrderId, payload);');

// Restore order dashboard card elements
const dashboardServiceRegex = /\{order\.serviceTypes && order\.serviceTypes\.length > 0 && \(.*?<\/span>\s*\)\}/s;
content = content.replace(dashboardServiceRegex, `{order.productType && (
                                                <span style={{ fontSize: 11, color: 'var(--text-muted)', padding: '2px 8px', background: 'var(--bg-input)', borderRadius: 4 }}>
                                                    {order.productType}
                                                </span>
                                            )}`);

const dashboardCustomerRegex = /\{order\.customerName && <div style=\{\{ fontSize: 13, color: 'var\(--text-secondary\)' \}\}>Khách hàng: \{order\.customerName\}<\/div>\}\n\s*\{order\.materialSource && <div style=\{\{ fontSize: 13, color: 'var\(--text-secondary\)' \}\}>Nguồn NL: \{MATERIAL_SOURCES\.find\(m => m\.value === order\.materialSource\)\?\.label \|\| order\.materialSource\}<\/div>\}/s;
content = content.replace(dashboardCustomerRegex, `{order.customerName && <div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Khach hang: {order.customerName}</div>}`);

fs.writeFileSync('src/pages/ProductionOrderPage.tsx', content);
console.log('Restored ProductionOrderPage.tsx');
