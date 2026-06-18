const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'Layout.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Add imports
if (!content.includes("import { teamService, notificationService }")) {
    content = content.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\nimport { teamService, notificationService } from '../services/groupService';\nimport type { AppNotification } from '../types/types';");
}

// 2. Replace mock state with real state and useEffect
const mockStateStart = content.indexOf('// Mock notifications');
const mockStateEndRegex = /\]\);\s*\n\s*useEffect\(\(\) => \{/m;
const mockStateEndMatch = content.match(mockStateEndRegex);

if (mockStateStart !== -1 && mockStateEndMatch) {
    const mockStateEnd = mockStateEndMatch.index;
    
    const newStateStr = `    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [messageGroups, setMessageGroups] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            // Load actual teams to display in messages dropdown
            teamService.getMyTeams().then(teams => {
                const mapped = teams.map(t => ({
                    id: t.id,
                    name: t.name,
                    avatar: \`https://ui-avatars.com/api/?name=\${encodeURIComponent(t.name)}&background=0284c7&color=fff\`,
                    lastMessage: t.description || 'Nhấn để mở đoạn chat của nhóm',
                    time: new Date(t.createdAt).toLocaleDateString('vi-VN'),
                    unreadCount: 0, // Not available directly in getMyTeams
                    isActive: false
                }));
                setMessageGroups(mapped);
            }).catch(console.error);

            // Load actual notifications
            notificationService.getAll().then(setNotifications).catch(console.error);
        }
    }, [user]);

    `;
    
    content = content.substring(0, mockStateStart) + newStateStr + content.substring(mockStateEndMatch.index + mockStateEndMatch[0].length - 17); // -17 to keep useEffect(() => {
}

// 3. Fix unread property from isRead to read
content = content.replace(/!n.isRead/g, "!n.read");
content = content.replace(/notif.isRead/g, "notif.read");

// 4. Update JSX rendering for notifications
const notifRenderStart = content.indexOf('{displayNotifications.map(notif => (');
const notifRenderEnd = content.indexOf('</div>', content.indexOf('</div>', content.indexOf('</div>', notifRenderStart) + 1) + 1); // rough guess, better to replace just the inner block

// Replace inside displayNotifications.map
const oldNotifItem = `                                            <div key={notif.id} className={\`fb-notification-item \${notif.isRead ? 'read' : 'unread'}\`}>
                                                <div className="fb-notif-avatar-wrapper">
                                                    <img src={notif.avatar} alt="avatar" className="fb-notif-avatar" />
                                                    <div className="fb-notif-badge" style={{ backgroundColor: notif.badgeColor }}>
                                                        {notif.badgeIcon}
                                                    </div>
                                                </div>
                                                <div className="fb-notif-content">
                                                    <p>
                                                        <strong>{notif.userName}</strong> {notif.action}
                                                    </p>
                                                    <span className="fb-notif-time">{notif.time}</span>
                                                </div>
                                                {!notif.isRead && <div className="fb-notif-unread-dot"></div>}
                                            </div>`;

// But wait, the file already changed isRead to read via regex above, so we must match the modified string
const oldNotifItemModified = `                                            <div key={notif.id} className={\`fb-notification-item \${notif.read ? 'read' : 'unread'}\`}>
                                                <div className="fb-notif-avatar-wrapper">
                                                    <img src={notif.avatar} alt="avatar" className="fb-notif-avatar" />
                                                    <div className="fb-notif-badge" style={{ backgroundColor: notif.badgeColor }}>
                                                        {notif.badgeIcon}
                                                    </div>
                                                </div>
                                                <div className="fb-notif-content">
                                                    <p>
                                                        <strong>{notif.userName}</strong> {notif.action}
                                                    </p>
                                                    <span className="fb-notif-time">{notif.time}</span>
                                                </div>
                                                {!notif.read && <div className="fb-notif-unread-dot"></div>}
                                            </div>`;

const newNotifItem = `                                            <div key={notif.id} className={\`fb-notification-item \${notif.read ? 'read' : 'unread'}\`} onClick={() => {
                                                if (!notif.read) {
                                                    notificationService.markAsRead(notif.id).then(() => {
                                                        setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
                                                    });
                                                }
                                                // If there's a related taskId, maybe navigate to it? 
                                                // The backend might not send URL, but we have taskId
                                                if (notif.taskId) {
                                                    setShowNotifications(false);
                                                }
                                            }} style={{cursor: 'pointer'}}>
                                                <div className="fb-notif-avatar-wrapper">
                                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                                                        <Bell size={24} color="#fff" />
                                                    </div>
                                                </div>
                                                <div className="fb-notif-content">
                                                    <p>
                                                        <strong>Hệ thống</strong> {notif.message}
                                                    </p>
                                                    <span className="fb-notif-time">{new Date(notif.createdAt).toLocaleDateString('vi-VN')}</span>
                                                </div>
                                                {!notif.read && <div className="fb-notif-unread-dot"></div>}
                                            </div>`;

content = content.replace(oldNotifItemModified, newNotifItem);
// Also try replacing the original just in case
content = content.replace(oldNotifItem, newNotifItem);

fs.writeFileSync(filePath, content, 'utf8');
console.log('Fixed Layout.tsx mock data');
