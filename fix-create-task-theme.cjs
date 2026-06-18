const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'CreateTaskPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const newStyle = `            <style>{\`
                body.task-studio-mode .topbar {
                    display: none;
                }
                body.task-studio-mode .layout-content {
                    padding: 0;
                    background: var(--bg-primary);
                }
                body.task-studio-mode .layout-main {
                    background: var(--bg-primary);
                }
                body.task-studio-mode .sidebar {
                    background: var(--bg-secondary);
                    border-right: 1px solid var(--border);
                    box-shadow: none;
                }
                body.task-studio-mode .sidebar-logo {
                    border-bottom: 0;
                    margin-bottom: 20px;
                }
                body.task-studio-mode .logo-text {
                    color: var(--accent-primary) !important;
                    -webkit-text-fill-color: var(--accent-primary);
                    letter-spacing: 0.12em;
                }
                body.task-studio-mode .logo-icon {
                    color: var(--accent-primary) !important;
                    background: var(--bg-secondary);
                    box-shadow: inset 0 0 0 1px var(--border);
                }
                body.task-studio-mode .nav-label {
                    color: var(--text-secondary);
                    opacity: 1;
                }
                body.task-studio-mode .nav-item {
                    color: var(--text-primary);
                    background: transparent;
                    border-radius: 10px;
                    font-weight: 520;
                }
                body.task-studio-mode .nav-item.active,
                body.task-studio-mode .nav-item:hover {
                    color: var(--accent-primary);
                    background: rgba(50, 34, 20, 0.04);
                    box-shadow: none;
                    transform: none;
                }
                body.task-studio-mode .nav-item.active::before {
                    display: none;
                }
                .task-gpt-page {
                    min-height: 100vh;
                    display: grid;
                    grid-template-rows: auto minmax(0, 1fr) auto;
                    color: var(--text-primary);
                    background: var(--bg-primary);
                    font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
                }
                .task-gpt-topbar {
                    min-height: 56px;
                    display: grid;
                    grid-template-columns: 1fr auto;
                    align-items: center;
                    padding: 0 26px;
                }
                .task-gpt-model {
                    display: inline-flex;
                    align-items: center;
                    gap: 8px;
                    color: var(--text-primary);
                    font-size: 18px;
                    font-weight: 650;
                }
                .task-gpt-actions {
                    display: inline-flex;
                    align-items: center;
                    gap: 16px;
                    color: var(--text-primary);
                    font-size: 14px;
                    font-weight: 650;
                }
                .task-gpt-action {
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    color: inherit;
                    background: transparent;
                    border: 0;
                    font: inherit;
                    cursor: pointer;
                }
                .task-gpt-chat {
                    min-height: 0;
                    overflow-y: auto;
                    padding: 34px 24px 170px;
                }
                .task-gpt-inner {
                    width: min(880px, 100%);
                    margin: 0 auto;
                    display: grid;
                    gap: 28px;
                }
                .task-gpt-empty {
                    min-height: min(58vh, 560px);
                    display: grid;
                    align-content: center;
                    justify-items: center;
                    text-align: center;
                }
                .task-gpt-empty h1 {
                    margin: 0 0 14px;
                    color: var(--text-primary);
                    font-size: clamp(1.8rem, 3vw, 2.6rem);
                    font-weight: 650;
                    letter-spacing: 0;
                }
                .task-gpt-empty p {
                    max-width: 620px;
                    margin: 0;
                    color: var(--text-secondary);
                    font-size: 16px;
                    line-height: 1.6;
                }
                .task-gpt-suggestions {
                    margin-top: 28px;
                    display: grid;
                    grid-template-columns: repeat(2, minmax(0, 1fr));
                    gap: 12px;
                    width: min(680px, 100%);
                }
                .task-gpt-suggestion {
                    min-height: 54px;
                    padding: 0 16px;
                    color: var(--text-primary);
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 14px;
                    font: inherit;
                    font-size: 14px;
                    font-weight: 520;
                    text-align: left;
                    cursor: pointer;
                }
                .task-gpt-suggestion:hover {
                    background: var(--bg-card-hover);
                }
                .task-gpt-message-row {
                    display: flex;
                    width: 100%;
                }
                .task-gpt-message-row.user {
                    justify-content: flex-end;
                }
                .task-gpt-message-row.assistant {
                    justify-content: flex-start;
                }
                .task-gpt-bubble {
                    max-width: min(720px, 82%);
                    color: var(--text-primary);
                    font-size: 16px;
                    line-height: 1.72;
                }
                .task-gpt-message-row.user .task-gpt-bubble {
                    max-width: min(520px, 72%);
                    padding: 11px 18px;
                    background: var(--bg-secondary);
                    border-radius: 22px;
                }
                .task-gpt-message-row.assistant .task-gpt-bubble {
                    padding: 0;
                    background: transparent;
                }
                .task-gpt-assistant-head {
                    margin-bottom: 8px;
                    color: var(--text-primary);
                    font-size: 15px;
                    font-weight: 650;
                }
                .task-gpt-message-actions {
                    display: flex;
                    align-items: center;
                    gap: 16px;
                    margin-top: 14px;
                    color: var(--text-secondary);
                    font-size: 18px;
                }
                .task-gpt-token {
                    margin-left: auto;
                    color: var(--text-muted);
                    font-size: 12px;
                    font-weight: 650;
                }
                .task-gpt-result {
                    margin-top: 20px;
                    padding: 18px;
                    border: 1px solid var(--border);
                    border-radius: 16px;
                    background: var(--bg-card);
                    box-shadow: 0 8px 24px rgba(0, 0, 0, 0.04);
                }
                .task-gpt-loading {
                    color: var(--text-secondary);
                    font-size: 16px;
                    line-height: 1.6;
                }
                .task-gpt-composer-wrap {
                    position: sticky;
                    bottom: 0;
                    z-index: 10;
                    padding: 18px 24px 14px;
                    background: var(--bg-primary);
                    border-top: 1px solid var(--border);
                }
                .task-gpt-composer {
                    width: min(880px, 100%);
                    min-height: 74px;
                    margin: 0 auto;
                    display: grid;
                    grid-template-columns: auto minmax(0, 1fr) auto auto;
                    align-items: end;
                    gap: 10px;
                    padding: 10px 12px 10px 16px;
                    background: var(--bg-card);
                    border: 1px solid var(--border);
                    border-radius: 28px;
                    box-shadow: 0 10px 34px rgba(0, 0, 0, 0.08);
                }
                .task-gpt-icon-btn,
                .task-gpt-send {
                    width: 42px;
                    height: 42px;
                    display: grid;
                    place-items: center;
                    border: 0;
                    border-radius: 50%;
                    font: inherit;
                    cursor: pointer;
                }
                .task-gpt-icon-btn {
                    color: var(--text-primary);
                    background: transparent;
                    font-size: 24px;
                }
                .task-gpt-textarea {
                    width: 100%;
                    max-height: 170px;
                    min-height: 42px;
                    padding: 9px 4px;
                    color: var(--text-primary);
                    background: transparent;
                    border: 0;
                    outline: 0;
                    resize: none;
                    font: inherit;
                    font-size: 16px;
                    line-height: 1.5;
                }
                .task-gpt-textarea::placeholder {
                    color: var(--text-muted);
                }
                .task-gpt-mode {
                    min-height: 34px;
                    display: inline-flex;
                    align-items: center;
                    gap: 6px;
                    padding: 0 10px;
                    color: var(--text-secondary);
                    background: transparent;
                    border: 0;
                    font: inherit;
                    font-size: 14px;
                }
                .task-gpt-send {
                    color: var(--bg-primary);
                    background: var(--text-primary);
                    font-size: 18px;
                }
                .task-gpt-send:disabled {
                    background: var(--border);
                    color: var(--text-muted);
                    cursor: not-allowed;
                }
                .task-gpt-disclaimer {
                    width: min(880px, 100%);
                    margin: 8px auto 0;
                    color: var(--text-muted);
                    font-size: 12px;
                    text-align: center;
                }
                .markdown-content p {
                    margin: 0 0 12px;
                }
                .markdown-content p:last-child {
                    margin-bottom: 0;
                }
                .markdown-content table {
                    border-collapse: collapse;
                    width: 100%;
                    margin: 12px 0;
                    font-size: 13px;
                    background: var(--bg-card);
                }
                .markdown-content th,
                .markdown-content td {
                    border: 1px solid var(--border);
                    padding: 10px;
                    text-align: left;
                }
                .markdown-content th {
                    background: var(--bg-secondary);
                    font-weight: 700;
                }
                @media (max-width: 760px) {
                    .task-gpt-topbar {
                        padding-inline: 16px;
                    }
                    .task-gpt-chat {
                        padding-inline: 16px;
                    }
                    .task-gpt-suggestions {
                        grid-template-columns: 1fr;
                    }
                    .task-gpt-message-row.user .task-gpt-bubble,
                    .task-gpt-bubble {
                        max-width: 92%;
                    }
                    .task-gpt-mode {
                        display: none;
                    }
                    .task-gpt-composer {
                        grid-template-columns: auto minmax(0, 1fr) auto;
                    }
                }
            \`}</style>`;

const startStr = '            <style>{`';
const endStr = '            `}</style>';

const startIndex = content.indexOf(startStr);
const endIndex = content.indexOf(endStr, startIndex) + endStr.length;

if (startIndex !== -1 && endIndex !== -1) {
    content = content.substring(0, startIndex) + newStyle + content.substring(endIndex);
}

// Now replace AiResultRefinementForm colors:
// I will just use string replacement for the specific inline colors within AiResultRefinementForm to switch to CSS variables.

// For AiResultRefinementForm background
content = content.replace(/background: '#ffffff',\s*borderRadius: '24px',\s*border: '1px solid #e2e8f0',/g, "background: 'var(--bg-card)',\n            borderRadius: '24px',\n            border: '1px solid var(--border)',");

// Header Area border
content = content.replace(/borderBottom: '1px solid #f1f5f9'/g, "borderBottom: '1px solid var(--border)'");
content = content.replace(/color: '#1e293b'/g, "color: 'var(--text-primary)'");
content = content.replace(/background: '#ede9fe', color: '#7c3aed'/g, "background: 'rgba(212, 165, 116, 0.12)', color: 'var(--accent-primary)'");
content = content.replace(/color: '#64748b'/g, "color: 'var(--text-secondary)'");

// Standardization Card
content = content.replace(/background: '#fafafa', borderRadius: '16px', border: '1px solid #f1f5f9'/g, "background: 'var(--bg-secondary)', borderRadius: '16px', border: '1px solid var(--border)'");
content = content.replace(/color: '#334155'/g, "color: 'var(--text-primary)'");
// d4a574 is already accent primary so keep it

// List styling inside AiResultRefinementForm
content = content.replace(/border: '1px solid #f1f5f9'/g, "border: '1px solid var(--border)'");
content = content.replace(/background: '#ffffff'/g, "background: 'var(--bg-card)'");
content = content.replace(/background: '#f8fafc'/g, "background: 'var(--bg-input)'");
content = content.replace(/color: '#0f172a'/g, "color: 'var(--text-primary)'");
content = content.replace(/color: '#475569'/g, "color: 'var(--text-secondary)'");
content = content.replace(/color: '#94a3b8'/g, "color: 'var(--text-muted)'");
content = content.replace(/background: '#fef3c7', color: '#b45309'/g, "background: 'rgba(212, 165, 116, 0.1)', color: 'var(--accent-primary)'");
content = content.replace(/background: '#dbeafe', color: '#1d4ed8'/g, "background: 'rgba(212, 165, 116, 0.1)', color: 'var(--accent-primary)'");

// Action buttons
content = content.replace(/background: '#1e293b', color: '#ffffff'/g, "background: 'var(--accent-primary)', color: 'var(--bg-primary)'");
content = content.replace(/border: '1px solid #e2e8f0', background: '#ffffff', color: '#0f172a'/g, "border: '1px solid var(--border)', background: 'var(--bg-primary)', color: 'var(--text-primary)'");

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed CreateTaskPage.tsx theme');
