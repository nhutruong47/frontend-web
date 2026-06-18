const fs = require('fs');
const path = require('path');

const groupPagePath = path.join(__dirname, 'src', 'pages', 'GroupDetailPage.tsx');
let content = fs.readFileSync(groupPagePath, 'utf8');

// 1. Flex wrap fix
content = content.replace("<div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>\n                    <style>", "<div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>\n                    <style>");
content = content.replace("border: '1px solid var(--border)' }}>\n                            <ion-icon name=\"key-outline\"", "border: '1px solid var(--border)', height: '100%', boxSizing: 'border-box' }}>\n                            <ion-icon name=\"key-outline\"");
content = content.replace("padding: '8px 20px',\n                                fontSize: 14", "padding: '8px 20px',\n                                height: '100%',\n                                boxSizing: 'border-box',\n                                fontSize: 14");
content = content.replace("background: 'var(--bg-card)',\n                        border: '1px solid var(--border)',\n                        borderRadius: 14,\n                        padding: '4px',\n                        display: 'flex',\n                        gap: '4px',\n                        flexWrap: 'wrap',\n                        alignItems: 'center',\n                    }}", "background: 'var(--bg-card)',\n                        border: '1px solid var(--border)',\n                        borderRadius: 10,\n                        padding: '4px',\n                        display: 'flex',\n                        gap: '4px',\n                        flexWrap: 'wrap',\n                        alignItems: 'center',\n                        height: '100%',\n                        boxSizing: 'border-box',\n                    }}");
content = content.replace("borderRadius: 8,\n                                        padding: '7px 14px',", "borderRadius: 6,\n                                        padding: '4px 12px',");


// 2. Remove charts section
const chartStart = '{/* ===== LINE CHART ===== */}';
const chartEnd = '{/* ===== MEMBER CARDS ===== */}';
const idxStart = content.indexOf(chartStart);
const idxEnd = content.indexOf(chartEnd);

if (idxStart > -1 && idxEnd > -1) {
    const blockStart = content.lastIndexOf('{isManager && totalTasks > 0 && (', idxStart);
    if (blockStart > -1) {
        content = content.substring(0, blockStart) + content.substring(idxEnd);
    }
}

// 3. Remove variables carefully
content = content.replace("import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';", "");

content = content.replace("const DONUT_COLORS = ['#10b981', '#f59e0b', '#94a3b8'];", "");
content = content.replace("const completionPct = totalTasks ? Math.round((completedTasks / totalTasks) * 100) : 0;", "");

// Donut data
const donutStart = "// Donut data";
const donutEnd = "if (donutData.length === 0) donutData.push({ name: 'Trống', value: 1 });";
const idxDonutStart = content.indexOf(donutStart);
const idxDonutEnd = content.indexOf(donutEnd);
if (idxDonutStart > -1 && idxDonutEnd > -1) {
    content = content.substring(0, idxDonutStart) + content.substring(idxDonutEnd + donutEnd.length);
}

// Line chart data
const lineStart = "// Mock line chart data (weekly performance)";
const lineEnd = "return point;\n    });";
const idxLineStart = content.indexOf(lineStart);
const idxLineEnd = content.indexOf(lineEnd);
if (idxLineStart > -1 && idxLineEnd > -1) {
    content = content.substring(0, idxLineStart) + content.substring(idxLineEnd + lineEnd.length);
}

// Bar data
const barStart = "// Bar data";
const barEnd = "tasks: m.total, completed: m.completed }));";
const idxBarStart = content.indexOf(barStart);
const idxBarEnd = content.indexOf(barEnd);
if (idxBarStart > -1 && idxBarEnd > -1) {
    content = content.substring(0, idxBarStart) + content.substring(idxBarEnd + barEnd.length);
}

fs.writeFileSync(groupPagePath, content);
console.log("Done");
