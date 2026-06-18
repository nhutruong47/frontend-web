const fs = require('fs');
const file = 'src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const alertMsg = "window.alert('Chức năng này đang được phát triển và sẽ sớm ra mắt.')";

content = content.replace(/<button>Sửa<\/button>/g, `<button onClick={() => ${alertMsg}}>Sửa</button>`);
content = content.replace(/<button>Xóa<\/button>/g, `<button onClick={() => ${alertMsg}}>Xóa</button>`);
content = content.replace(/<button><RotateCcw size=\{14\} \/> Đặt lại<\/button>/g, `<button onClick={() => ${alertMsg}}><RotateCcw size={14} /> Đặt lại</button>`);
content = content.replace(/<button><Lock size=\{14\} \/> Khóa<\/button>/g, `<button onClick={() => ${alertMsg}}><Lock size={14} /> Khóa</button>`);

// Fix the dynamic Lock/Unlock button
const dynamicLockStr = `<button>{item.status === 'Locked' ? <Unlock size={14} /> : <Lock size={14} />} {item.status === 'Locked' ? 'Kích hoạt' : 'Khóa'}</button>`;
const dynamicLockReplacement = `<button onClick={() => ${alertMsg}}>{item.status === 'Locked' ? <Unlock size={14} /> : <Lock size={14} />} {item.status === 'Locked' ? 'Kích hoạt' : 'Khóa'}</button>`;
content = content.split(dynamicLockStr).join(dynamicLockReplacement);


fs.writeFileSync(file, content);
console.log("Replaced placeholder buttons.");
