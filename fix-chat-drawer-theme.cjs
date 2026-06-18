const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'GroupDetailPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Drawer Container
content = content.replace(/background: '#0f172a'/g, "background: 'var(--bg-card)'");

// 2. Chat Header
content = content.replace(/background: '#17120f'/g, "background: 'var(--bg-card)'");
content = content.replace(/color: '#fff4e8'/g, "color: 'var(--text-primary)'");
content = content.replace(/color: '#64748b'/g, "color: 'var(--text-secondary)'"); // Common for icon buttons
content = content.replace(/color: '#10b981'/g, "color: 'var(--accent-primary)'"); // Video icon
content = content.replace(/background: showChatTokens \? '#f9f1e3' : '#f8fafc'/g, "background: showChatTokens ? 'var(--bg-secondary)' : 'var(--bg-input)'");
content = content.replace(/border: '1px solid #e2e8f0'/g, "border: '1px solid var(--border)'");
content = content.replace(/color: showChatTokens \? '#d4a574' : '#64748b'/g, "color: showChatTokens ? 'var(--accent-primary)' : 'var(--text-secondary)'");

// Close btn
content = content.replace(/background: '#fff7ed', border: '1px solid #fed7aa', borderRadius: 10, fontSize: 22, cursor: 'pointer', color: '#9a3412'/g, "background: 'transparent', border: 'none', borderRadius: 10, fontSize: 24, cursor: 'pointer', color: 'var(--text-secondary)'");

// 3. Tab Bar
content = content.replace(/background: '#120f0d'/g, "background: 'var(--bg-secondary)'");
content = content.replace(/background: chatTab === 'group' \? '#f9f1e3' : '#f8fafc'/g, "background: chatTab === 'group' ? 'var(--bg-card)' : 'transparent'");
content = content.replace(/background: chatTab === 'dm' \? '#f9f1e3' : '#f8fafc'/g, "background: chatTab === 'dm' ? 'var(--bg-card)' : 'transparent'");
content = content.replace(/color: chatTab === 'group' \? '#d4a574' : '#64748b'/g, "color: chatTab === 'group' ? 'var(--accent-primary)' : 'var(--text-secondary)'");
content = content.replace(/color: chatTab === 'dm' \? '#d4a574' : '#64748b'/g, "color: chatTab === 'dm' ? 'var(--accent-primary)' : 'var(--text-secondary)'");
content = content.replace(/borderBottom: chatTab === 'group' \? '2px solid #d4a574' : '1px solid #e2e8f0'/g, "borderBottom: chatTab === 'group' ? '2px solid var(--accent-primary)' : '1px solid var(--border)'");
content = content.replace(/borderBottom: chatTab === 'dm' \? '2px solid #d4a574' : '1px solid #e2e8f0'/g, "borderBottom: chatTab === 'dm' ? '2px solid var(--accent-primary)' : '1px solid var(--border)'");

// DM List
content = content.replace(/borderBottom: '1px solid #f1f5f9'/g, "borderBottom: '1px solid var(--border)'");
content = content.replace(/background: unreadCount > 0 \? '#fff7ed' : 'transparent'/g, "background: unreadCount > 0 ? 'var(--bg-secondary)' : 'transparent'");
content = content.replace(/currentTarget\.style\.background = '#f8fafc'/g, "currentTarget.style.background = 'var(--bg-input)'");
content = content.replace(/currentTarget\.style\.background = unreadCount > 0 \? '#fff7ed' : 'transparent'/g, "currentTarget.style.background = unreadCount > 0 ? 'var(--bg-secondary)' : 'transparent'");
content = content.replace(/color: '#1e293b'/g, "color: 'var(--text-primary)'");
content = content.replace(/color: isOnline \? '#22c55e' : '#94a3b8'/g, "color: isOnline ? '#22c55e' : 'var(--text-muted)'");
content = content.replace(/color: '#cbd5e1'/g, "color: 'var(--text-muted)'");

// 4. Inner Header
content = content.replace(/background: '#15110f'/g, "background: 'var(--bg-card)'");
content = content.replace(/color: '#94a3b8'/g, "color: 'var(--text-muted)'");

// 5. Chat Area
content = content.replace(/background: '#0b1220'/g, "background: 'var(--bg-primary)'");

// Message bubbles
content = content.replace(/background: '#e2e8f0'/g, "background: 'var(--bg-input)'");
content = content.replace(/background: isMe \? '#e5efff' : 'var\\(--bg-input, #fff\\)'/g, "background: isMe ? 'rgba(212, 165, 116, 0.15)' : 'var(--bg-secondary)'");
content = content.replace(/border: isMe \? '#1px solid #d1e2ff' : '1px solid var\\(--border, #e1e4e8\\)'/g, "border: '1px solid var(--border)'");
content = content.replace(/color: '#515d6e'/g, "color: 'var(--text-secondary)'");
content = content.replace(/color: '#081c36'/g, "color: 'var(--text-primary)'");
content = content.replace(/color: '#7a869a'/g, "color: 'var(--text-muted)'");

// 6. Composer Area
content = content.replace(/background: '#211915'/g, "background: 'var(--bg-input)'");
content = content.replace(/background: '#f8fafc'/g, "background: 'var(--bg-input)'");
content = content.replace(/border: '1px solid #d1e2ff'/g, "border: '1px solid var(--border)'"); // Handle border
content = content.replace(/border: isMe \? '1px solid #d1e2ff' : '1px solid var\(--border, #e1e4e8\)'/g, "border: '1px solid var(--border)'");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed GroupDetailPage.tsx Chat Theme');
