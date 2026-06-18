const fs = require('fs');
const path = require('path');

const groupPagePath = path.join(__dirname, 'src', 'pages', 'GroupDetailPage.tsx');
let content = fs.readFileSync(groupPagePath, 'utf8');

content = content.replace("import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';", "");

content = content.replace("const DONUT_COLORS = ['#16a34a', '#eab308', '#94a3b8'];", "");

content = content.replace("const completionPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;", "");

content = content.replace(/const lineData = Array\.from\(\{ length: 7 \}, \(_, i\) => \{[\s\S]*?\}\);/, "");

content = content.replace(/\/\/ Donut data\s*const donutData = \[\s*\{ name: 'Hoàn thành', value: completedTasks \},\s*\{ name: 'Đang làm', value: inProgressTasks \},\s*\{ name: 'Chưa bắt đầu', value: pendingTasks \},\s*\]\.filter\(d => d\.value > 0\);\s*if \(donutData\.length === 0\) donutData\.push\(\{ name: 'Trống', value: 1 \}\);/, "");

content = content.replace(/\/\/ Bar data\s*const barData = memberStats\.map\(m => \(\{ name: \(m\.fullName || m\.username\)\.split\(' '\)\.pop\(\), tasks: m\.total, completed: m\.completed \}\)\);/, "");

fs.writeFileSync(groupPagePath, content);
