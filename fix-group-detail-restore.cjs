const fs = require('fs');
const path = require('path');

const groupPage = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(groupPage, 'utf8');

// The exact string we need to restore:
const restoreStr = `    useEffect(() => { showChatRef.current = showChat; }, [showChat]);

    // Online presence + DM previews
    const [onlineUsers, setOnlineUsers] = useState<string[]>([]);
    const [dmPreviews, setDmPreviews] = useState<ChatMsg[]>([]);

    const currentMember = team?.members?.find(m => m.userId === user?.id);
    const isSystemAdmin = user?.role === 'ADMIN';
    const isAdmin = currentMember?.groupRole === 'ADMIN' || currentMember?.groupRole === 'OWNER' || team?.ownerId === user?.id;
    const isManager = !isSystemAdmin && isAdmin;

    // Attendance
    const [attendanceLoading, setAttendanceLoading] = useState(false);
    const [attendance, setAttendance] = useState<any>(null);
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [attendanceHistory, setAttendanceHistory] = useState<any[]>([]);

    useEffect(() => {
        if (user && id) {
            attendanceService.getTodayAttendance(user.id, id).then(data => {
                if (data) setAttendance(data);
            }).catch(() => {});
        }
    }, [user, id]);

    const handleCheckIn = async () => {
        if (!user || !id) return;
        setAttendanceLoading(true);
        try {
            const data = await attendanceService.checkIn(user.id, id);
            setAttendance(data);
        } catch (e: any) {
            alert(e.response?.data || "Lỗi check-in");
        } finally {
            setAttendanceLoading(false);
        }
    };

    const handleCheckOut = async () => {
        if (!user || !id) return;
        setAttendanceLoading(true);
        try {
            const data = await attendanceService.checkOut(user.id, id);
            setAttendance(data);
        } catch (e: any) {
            alert(e.response?.data || "Lỗi check-out");
        } finally {
            setAttendanceLoading(false);
        }
    };

    const loadHistory = async () => {
        if (!user || !id) return;
        try {
            const data = await attendanceService.getHistory(user.id, id);
            setAttendanceHistory(data);
            setShowHistoryModal(true);
        } catch (e) {}
    };

    useEffect(() => {
        if (!team || !user) return;
`;

// Find where to insert it: it should replace from `useEffect(() => { dmUserIdRef.current = dmUserId; }, [dmUserId]);` to `setTaskFilter(isAdmin ? 'all' : 'my');` but keeping `setTaskFilter`

const targetRegex = /useEffect\(\(\) => \{ dmUserIdRef\.current = dmUserId; \}, \[dmUserId\]\);\s*setTaskFilter\(isAdmin \? 'all' : 'my'\);\s*\}, \[team\?\.id, user\?\.id, isAdmin\]\);/;

content = content.replace(targetRegex, `useEffect(() => { dmUserIdRef.current = dmUserId; }, [dmUserId]);\n\n${restoreStr}        setTaskFilter(isAdmin ? 'all' : 'my');\n    }, [team?.id, user?.id, isAdmin]);`);

fs.writeFileSync(groupPage, content, 'utf8');
console.log('Restored GroupDetailPage.tsx');
