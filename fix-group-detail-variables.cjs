const fs = require('fs');
const path = require('path');

const groupPage = path.join(__dirname, 'src/pages/GroupDetailPage.tsx');
let content = fs.readFileSync(groupPage, 'utf8');

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
        setTaskFilter(isAdmin ? 'all' : 'my');
    }, [team?.id, user?.id, isAdmin]);
`;

const replacePoint = `    useEffect(() => { dmUserIdRef.current = dmUserId; }, [dmUserId]);\n        setTaskFilter(isAdmin ? 'all' : 'my');\n    }, [team?.id, user?.id, isAdmin]);`;
if (content.includes(replacePoint)) {
    content = content.replace(replacePoint, `    useEffect(() => { dmUserIdRef.current = dmUserId; }, [dmUserId]);\n\n${restoreStr}`);
    fs.writeFileSync(groupPage, content, 'utf8');
    console.log('Fixed variables');
} else {
    // try a more fuzzy approach
    const lines = content.split('\\n');
    const idx = lines.findIndex(l => l.includes('useEffect(() => { dmUserIdRef.current = dmUserId; }, [dmUserId]);'));
    if (idx > -1) {
        // remove the broken lines
        let endIdx = idx + 1;
        while(endIdx < lines.length && !lines[endIdx].includes('useEffect(() => {')) {
            if (lines[endIdx].includes('setTaskFilter(')) {
                // remove
            }
            endIdx++;
        }
        // we can just splice the restoreStr at idx + 1
        lines.splice(idx + 1, 3, restoreStr);
        fs.writeFileSync(groupPage, lines.join('\\n'), 'utf8');
        console.log('Fuzzy Fixed variables');
    } else {
        console.log('Failed to find replace point');
    }
}
