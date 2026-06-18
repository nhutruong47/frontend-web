const fs = require('fs');
const path = require('path');

const groupPage = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(groupPage, 'utf8');

const correctTop = `import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { teamService, goalService, taskService, getTrialStatus, chatService, inventoryService } from '../services/groupService';
import { attendanceService } from '../services/attendanceService';
import type { Team, Goal, Task, ChatMsg, SalaryReport, AiChatLogMsg, InventoryItem } from '../types/types';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, BarChart, Bar } from 'recharts';
import SockJS from 'sockjs-client';
import { Client } from '@stomp/stompjs';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { estimateTokens, formatTokenCount } from '../utils/tokenUsage';

function getInitials(name: string) {
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function avatarColor(name: string) {
    const colors = ['#d4a574', '#8b5cf6', '#ec4899', '#f43f5e', '#f59e0b', '#10b981', '#06b6d4', '#3b82f6'];
    let hash = 0;`;

// I will just replace from the very beginning up to `let hash = 0;` (if it still exists) or `for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;`
content = content.replace(/[\s\S]*?for \(const c of name\) hash = \(hash \* 31 \+ c\.charCodeAt\(0\)\) % colors\.length;/, correctTop + '\n    for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) % colors.length;');

fs.writeFileSync(groupPage, content, 'utf8');
console.log('Fixed top of GroupDetailPage');
