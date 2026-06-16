const fs = require('fs');
const file = 'src/pages/GroupDetailPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const statesToAdd = `
    const [chatExpanded, setChatExpanded] = useState(false);
    const [showVideoCall, setShowVideoCall] = useState(false);
    const [chatAttachment, setChatAttachment] = useState<File | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
`;
content = content.replace(
    /const \[showChatTokens, setShowChatTokens\] = useState\(false\);/,
    `const [showChatTokens, setShowChatTokens] = useState(false);${statesToAdd}`
);

const handleSendChatOld = /const handleSendChat = async \(\) => {[\s\S]*?loadChatMessages\(\);\s*};/;
const handleSendChatNew = `const handleSendChat = async () => {
        if (!id || (!chatInput.trim() && !chatAttachment)) return;
        
        let messageContent = chatInput.trim();
        if (chatAttachment) {
            messageContent = messageContent ? \`\${messageContent} [Đính kèm: \${chatAttachment.name}]\` : \`[Đính kèm: \${chatAttachment.name}]\`;
        }

        await chatService.sendMessage(id, messageContent, chatTab === 'dm' && dmUserId ? dmUserId : undefined);
        setChatInput('');
        setChatAttachment(null);
        loadChatMessages();
    };`;
content = content.replace(handleSendChatOld, handleSendChatNew);

content = content.replace(
    /<div style=\{\{ position: 'fixed', right: 0, top: 0, width: 380, height: '100vh', background: '#fff', boxShadow: '-4px 0 24px rgba\(0,0,0,0\.1\)', zIndex: 100, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0' \}\}>/,
    `<div style={{ position: 'fixed', right: 0, top: 0, width: chatExpanded ? 600 : 380, height: '100vh', background: '#fff', boxShadow: '-4px 0 24px rgba(0,0,0,0.1)', zIndex: 100, display: 'flex', flexDirection: 'column', borderLeft: '1px solid #e2e8f0', transition: 'width 0.3s ease' }}>`
);

const headerOldRegex = /<button onClick=\{\(\) => setShowChatTokens\(prev => !prev\)\} style=\{\{ background: showChatTokens \? '#f9f1e3' : '#f8fafc'[\s\S]*?<\/button>/;
const headerMatch = content.match(headerOldRegex);
if (headerMatch) {
    const headerNew = `<button onClick={() => setShowVideoCall(true)} style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', color: '#10b981', display: 'flex', alignItems: 'center' }} title="Gọi video"><ion-icon name="videocam-outline"></ion-icon></button>
                            <button onClick={() => setChatExpanded(!chatExpanded)} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748b', display: 'flex', alignItems: 'center' }} title={chatExpanded ? "Thu nhỏ" : "Mở rộng"}>
                                <ion-icon name={chatExpanded ? "contract-outline" : "expand-outline"}></ion-icon>
                            </button>
                            ${headerMatch[0]}`;
    content = content.replace(headerOldRegex, headerNew);
}

const chatInputRegex = /\{\/\* Chat input \*\/\}[\s\S]*?<div style=\{\{ padding: '12px 16px', borderTop: '1px solid #e2e8f0'[\s\S]*?<\/div>/;
const chatInputMatch = content.match(chatInputRegex);
if (chatInputMatch) {
    // Extract the inner HTML
    const originalInputDiv = chatInputMatch[0];
    // We insert attachment logic right before the input container
    const modifiedInputDiv = originalInputDiv.replace(
        /<input value=\{chatInput\}/,
        `<input type="file" ref={fileInputRef} style={{ display: 'none' }} onChange={e => { if(e.target.files && e.target.files[0]) setChatAttachment(e.target.files[0]) }} />
                                <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: 24, display: 'flex', alignItems: 'center' }} title="Đính kèm file/ảnh">
                                    <ion-icon name="attach-outline"></ion-icon>
                                </button>
                                <input value={chatInput}`
    );
    const finalChatInput = `{/* Chat input */}
                            {chatAttachment && (
                                <div style={{ padding: '8px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: '#333' }}>
                                        <ion-icon name="document-text-outline" style={{ color: '#d4a574', fontSize: 18 }}></ion-icon>
                                        <span style={{ maxWidth: 200, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{chatAttachment.name}</span>
                                    </div>
                                    <button onClick={() => setChatAttachment(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', display: 'flex' }}><ion-icon name="close-circle-outline" style={{ fontSize: 18 }}></ion-icon></button>
                                </div>
                            )}
                            ${modifiedInputDiv.replace('{/* Chat input */}', '').trim()}`;
                            
    content = content.replace(chatInputRegex, finalChatInput);
}

const modalOld = /\{\/\* ===== MODALS \(preserved\) ===== \*\/\}/;
const videoCallModal = `
            {/* Video Call Modal */}
            {showVideoCall && (
                <div style={{ position: 'fixed', inset: 0, background: '#111827', zIndex: 9999, display: 'flex', flexDirection: 'column' }}>
                    {/* Header */}
                    <div style={{ padding: '24px', display: 'flex', justifyContent: 'space-between', color: '#fff' }}>
                        <h2 style={{ margin: 0, fontWeight: 500, fontSize: 18 }}>Cuộc gọi nhóm {team?.name}</h2>
                        <button onClick={() => setShowVideoCall(false)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 28, cursor: 'pointer', display: 'flex' }}><ion-icon name="expand"></ion-icon></button>
                    </div>
                    
                    {/* Main Content */}
                    <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative' }}>
                        <div style={{ width: 160, height: 160, borderRadius: '50%', background: '#374151', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '4px solid #4b5563' }}>
                            <ion-icon name="person" style={{ fontSize: 80, color: '#9ca3af' }}></ion-icon>
                        </div>
                        <div style={{ position: 'absolute', bottom: 40, color: '#fff', fontSize: 20, fontWeight: 500 }}>Đang gọi...</div>
                    </div>

                    {/* Controls */}
                    <div style={{ padding: '32px', display: 'flex', justifyContent: 'center', gap: 24, background: 'linear-gradient(transparent, rgba(0,0,0,0.8))' }}>
                        <button style={{ width: 64, height: 64, borderRadius: '50%', background: '#374151', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ion-icon name="mic-outline"></ion-icon></button>
                        <button style={{ width: 64, height: 64, borderRadius: '50%', background: '#374151', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ion-icon name="videocam-outline"></ion-icon></button>
                        <button onClick={() => setShowVideoCall(false)} style={{ width: 64, height: 64, borderRadius: '50%', background: '#ef4444', border: 'none', color: '#fff', fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><ion-icon name="call-outline" style={{ transform: 'rotate(135deg)' }}></ion-icon></button>
                    </div>
                </div>
            )}
`;
content = content.replace(modalOld, '{/* ===== MODALS (preserved) ===== */}' + videoCallModal);

fs.writeFileSync(file, content, 'utf8');
