const fs = require('fs');
const file = 'src/pages/AdminPage.tsx';
let content = fs.readFileSync(file, 'utf8');

const regex = /{active === 'workflow'[\\s\\S]*?{active === 'reports'[\\s\\S]*?<\\/>\\s*}\\s*\\)/;

const replacement = `{active === 'audit' && (
        <section className="admin-card">
          <div className="admin-card-head"><div><h3>Audit Log</h3><p>Theo dõi ai đăng nhập, tạo đơn hàng, sửa batch, xóa dữ liệu và đổi quyền.</p></div></div>
          <div className="admin-toolbar"><label><Search size={16} /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="Tìm user, hành động, IP..." /></label><button type="button" className="admin-button admin-button-soft"><Filter size={16} /> Nâng cao</button></div>
          <div className="admin-table-wrap"><table className="admin-table"><thead><tr><th>User</th><th>Hành động</th><th>Đối tượng</th><th>Thời gian</th><th>IP</th></tr></thead><tbody>{auditLogs.filter(item => \`\${item.user} \${item.action} \${item.ip}\`.toLowerCase().includes(query.toLowerCase())).map(item => <tr key={\`\${item.user}-\${item.time}\`}><td>{item.user}</td><td>{item.action}</td><td>{item.target}</td><td>{item.time}</td><td>{item.ip}</td></tr>)}</tbody></table></div>
        </section>
      )}

      {active === 'support' && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h3>Support Center</h3>
              <p>Ticket mới, Đang xử lý, Đã giải quyết, Quá hạn SLA, Kỹ thuật, AI, Thanh toán, Tài khoản, Đề xuất tính năng.</p>
            </div>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Tiêu đề</th>
                  <th>Phân loại</th>
                  <th>Trạng thái</th>
                  <th>SLA</th>
                  <th>Phụ trách</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {supportTickets.map((ticket, index) => (
                  <tr key={index}>
                    <td><strong>{ticket.title}</strong></td>
                    <td>{ticket.category}</td>
                    <td><StatusBadge value={ticket.status} /></td>
                    <td><StatusBadge value={ticket.sla} /></td>
                    <td>{ticket.owner}</td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button">Xem chi tiết</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {active === 'notifications' && (
        <section className="admin-card">
          <div className="admin-card-head">
            <div>
              <h3>Notification Center</h3>
              <p>Gửi thông báo toàn hệ thống, Free, Pro, Enterprise và xem lịch sử thông báo.</p>
            </div>
            <button type="button" className="admin-button admin-button-primary"><BellRing size={16} /> Soạn thông báo</button>
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Đối tượng</th>
                  <th>Tiêu đề</th>
                  <th>Thời gian gửi</th>
                  <th>Kết quả</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {notificationHistory.map((noti, index) => (
                  <tr key={index}>
                    <td><strong>{noti.target}</strong></td>
                    <td>{noti.title}</td>
                    <td>{noti.time}</td>
                    <td><StatusBadge value={noti.result} /></td>
                    <td>
                      <div className="admin-row-actions">
                        <button type="button">Xem</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}`;

content = content.replace(regex, replacement);
fs.writeFileSync(file, content, 'utf8');
