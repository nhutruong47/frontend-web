const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'pages', 'CreateTaskPage.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetStr = `                    <textarea
                        ref={chatInputRef}
                        className="task-gpt-textarea"
                        value={input}
                        onChange={e => setInput(e.target.value)}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                            }
                        }}
                        placeholder={trialActive ? (hasActiveDraft ? 'Nhập yêu cầu sửa draft, ví dụ: Rút gọn còn 2 task' : 'Nhập yêu cầu, ví dụ: Rang 120kg Arabica trước 17:00 hôm nay') : 'Dùng thử đã hết hạn'}
                        disabled={!trialActive || loading}
                        rows={1}
                    />`;

const replacementStr = `                    <textarea
                        ref={chatInputRef}
                        className="task-gpt-textarea"
                        value={input}
                        onChange={e => {
                            setInput(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = Math.min(e.target.scrollHeight, 170) + 'px';
                        }}
                        onPaste={e => {
                            const pastedText = e.clipboardData.getData('text');
                            if (pastedText.startsWith('\\n') || pastedText.endsWith('\\n')) {
                                e.preventDefault();
                                const start = e.target.selectionStart;
                                const end = e.target.selectionEnd;
                                const cleaned = pastedText.replace(/^\\n+|\\n+$/g, '');
                                const newVal = input.substring(0, start) + cleaned + input.substring(end);
                                setInput(newVal);
                                setTimeout(() => {
                                    if (chatInputRef.current) {
                                        chatInputRef.current.selectionStart = chatInputRef.current.selectionEnd = start + cleaned.length;
                                        chatInputRef.current.style.height = 'auto';
                                        chatInputRef.current.style.height = Math.min(chatInputRef.current.scrollHeight, 170) + 'px';
                                    }
                                }, 0);
                            }
                        }}
                        onKeyDown={e => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSend();
                                setTimeout(() => {
                                    if (chatInputRef.current) {
                                        chatInputRef.current.style.height = 'auto';
                                    }
                                }, 0);
                            }
                        }}
                        placeholder={trialActive ? (hasActiveDraft ? 'Nhập yêu cầu sửa draft, ví dụ: Rút gọn còn 2 task' : 'Nhập yêu cầu, ví dụ: Rang 120kg Arabica trước 17:00 hôm nay') : 'Dùng thử đã hết hạn'}
                        disabled={!trialActive || loading}
                        rows={1}
                    />`;

if (content.includes(targetStr)) {
    content = content.replace(targetStr, replacementStr);
    fs.writeFileSync(filePath, content, 'utf8');
    console.log('Fixed CreateTaskPage.tsx textarea auto-resize');
} else {
    console.log('Could not find target textarea string in CreateTaskPage.tsx');
}
