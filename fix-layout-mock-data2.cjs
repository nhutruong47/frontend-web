const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'components', 'Layout.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Add imports
if (!content.includes("import { teamService, notificationService }")) {
    content = content.replace("import { useAuth } from '../context/AuthContext';", "import { useAuth } from '../context/AuthContext';\nimport { teamService, notificationService } from '../services/groupService';\nimport type { AppNotification } from '../types/types';");
}

// Remove the mock notifications block completely
content = content.replace(/const \[notifications\] = useState\(\[\s*\{[\s\S]*?\}\s*\]\);/m, "");
// Remove the mock messageGroups block completely
content = content.replace(/const \[messageGroups\] = useState\(\[\s*\{[\s\S]*?\}\s*\]\);/m, "");

// Find where to insert our new state. Right after const msgRef...
const anchor = "const msgRef = useRef<HTMLDivElement>(null);";
const newState = `
    const [notifications, setNotifications] = useState<AppNotification[]>([]);
    const [messageGroups, setMessageGroups] = useState<any[]>([]);

    useEffect(() => {
        if (user) {
            teamService.getMyTeams().then(teams => {
                const mapped = teams.map(t => ({
                    id: t.id,
                    name: t.name,
                    avatar: \`https://ui-avatars.com/api/?name=\${encodeURIComponent(t.name)}&background=0284c7&color=fff\`,
                    lastMessage: t.description || 'Nhấn để mở đoạn chat của xưởng',
                    time: new Date(t.createdAt).toLocaleDateString('vi-VN'),
                    unreadCount: 0,
                    isActive: false
                }));
                setMessageGroups(mapped);
            }).catch(console.error);

            notificationService.getAll().then(setNotifications).catch(console.error);
        }
    }, [user]);
`;
content = content.replace(anchor, anchor + "\n" + newState);

// Fix read
content = content.replace(/!n\.isRead/g, "!n.read");
content = content.replace(/notif\.isRead/g, "notif.read");

// Update rendering for displayNotifications.map
const oldNotifBlock = `<div className="fb-notif-avatar-wrapper">
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
                                                </div>`;

const newNotifBlock = `<div className="fb-notif-avatar-wrapper">
                                                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 18, fontWeight: 700 }}>
                                                        <Bell size={24} color="#fff" />
                                                    </div>
                                                </div>
                                                <div className="fb-notif-content">
                                                    <p>
                                                        <strong>Hệ thống</strong> {notif.message}
                                                    </p>
                                                    <span className="fb-notif-time">{new Date(notif.createdAt).toLocaleDateString('vi-VN')}</span>
                                                </div>`;
content = content.replace(oldNotifBlock, newNotifBlock);

// Replace onClick inside displayNotifications
content = content.replace(
    `<div key={notif.id} className={\`fb-notification-item \${notif.read ? 'read' : 'unread'}\`}>`,
    `<div key={notif.id} className={\`fb-notification-item \${notif.read ? 'read' : 'unread'}\`} onClick={() => {
        if (!notif.read) {
            notificationService.markAsRead(notif.id).then(() => {
                setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
            });
        }
    }} style={{cursor: 'pointer'}}>`
);

fs.writeFileSync(filePath, content, 'utf8');
console.log("Fixed Layout.tsx");
