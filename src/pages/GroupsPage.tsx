import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { teamService } from '../services/groupService';
import type { Team } from '../types/types';

export default function GroupsPage() {
  const navigate = useNavigate();
  const [groups, setGroups] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const totalMembers = useMemo(
    () => groups.reduce((sum, group) => sum + (group.memberCount || group.members?.length || 0), 0),
    [groups],
  );

  const publishedCount = useMemo(
    () => groups.filter(group => group.isPublished).length,
    [groups],
  );

  const loadGroups = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await teamService.getMyTeams();
      setGroups(data);
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Không thể tải danh sách nhóm.');
      setGroups([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadGroups();
  }, []);

  const resetCreateForm = () => {
    setName('');
    setDescription('');
    setError('');
  };

  const openCreateModal = () => {
    resetCreateForm();
    setShowCreateModal(true);
  };

  const closeCreateModal = () => {
    if (saving) return;
    setShowCreateModal(false);
    resetCreateForm();
  };

  const handleCreateGroup = async (event: FormEvent) => {
    event.preventDefault();
    if (!name.trim()) {
      setError('Vui lòng nhập tên nhóm.');
      return;
    }

    setSaving(true);
    setError('');
    try {
      const created = await teamService.create({
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setGroups(current => [created, ...current.filter(group => group.id !== created.id)]);
      setShowCreateModal(false);
      resetCreateForm();
      navigate(`/groups/${created.id}`);
    } catch (err: any) {
      setError(err?.response?.data?.error || err?.response?.data?.message || 'Không thể tạo nhóm mới.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="page-container" style={{ padding: '28px 24px' }}>
      <header className="page-header glass-panel" style={{ marginBottom: 20, padding: 24 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>Nhóm xưởng</h1>
            <p className="page-subtitle" style={{ margin: '6px 0 0' }}>
              Quản lý nhóm xưởng, thành viên, mục tiêu và hoạt động sản xuất.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={loadGroups} disabled={loading}>
              <ion-icon name="refresh-outline" style={{ fontSize: 16 }}></ion-icon>
              {loading ? 'Đang tải...' : 'Làm mới'}
            </button>
            <button type="button" className="btn btn-primary" onClick={openCreateModal}>
              <ion-icon name="add-circle-outline" style={{ fontSize: 16 }}></ion-icon>
              Tạo nhóm mới
            </button>
          </div>
        </div>
      </header>

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div className="glass-panel premium-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Tổng nhóm</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{groups.length}</div>
        </div>
        <div className="glass-panel premium-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Thành viên</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{totalMembers}</div>
        </div>
        <div className="glass-panel premium-card" style={{ padding: 18 }}>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Đang lên Marketplace</div>
          <div style={{ fontSize: 24, fontWeight: 800 }}>{publishedCount}</div>
        </div>
      </section>

      {error && !showCreateModal && (
        <div className="form-error" style={{ marginBottom: 16 }}>
          <ion-icon name="alert-circle-outline"></ion-icon>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-state glass-panel" style={{ padding: '64px 20px' }}>
          <div className="btn-spinner" />
          <p>Đang tải danh sách nhóm...</p>
        </div>
      ) : groups.length === 0 ? (
        <div className="empty-state glass-panel" style={{ padding: '72px 20px', borderStyle: 'dashed' }}>
          <div className="empty-icon">
            <span className="icon-container glow" style={{ width: 64, height: 64, fontSize: 36 }}>
              <ion-icon name="business-outline"></ion-icon>
            </span>
          </div>
          <h2 style={{ margin: '0 0 8px' }}>Chưa có nhóm xưởng</h2>
          <p>Tạo nhóm đầu tiên để quản lý thành viên, mục tiêu, task và đơn hàng.</p>
          <button type="button" className="btn btn-primary" onClick={openCreateModal}>
            <ion-icon name="add-circle-outline" style={{ fontSize: 16 }}></ion-icon>
            Tạo nhóm mới
          </button>
        </div>
      ) : (
        <>
          <section style={{ marginBottom: 20 }}>
            <h2 className="section-title" style={{ fontSize: 18, marginBottom: 12 }}>Nhóm của bạn</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
              {groups.map(group => (
                <article key={group.id} className="premium-card glass-panel" style={{ padding: 18 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <h3 style={{ margin: 0, color: 'var(--text-primary)' }}>{group.name}</h3>
                      <p style={{ margin: '8px 0 0', color: 'var(--text-secondary)', minHeight: 42 }}>
                        {group.description || 'Chưa có mô tả.'}
                      </p>
                    </div>
                    <span className="badge badge-info" style={{ whiteSpace: 'nowrap' }}>
                      {group.memberCount || group.members?.length || 0} thành viên
                    </span>
                  </div>

                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 16 }}>
                    <button type="button" className="btn btn-primary" onClick={() => navigate(`/groups/${group.id}`)}>
                      <ion-icon name="open-outline" style={{ fontSize: 16 }}></ion-icon>
                      Vào nhóm
                    </button>
                    <button type="button" className="btn btn-secondary" onClick={() => navigate(`/groups/${group.id}`)}>
                      <ion-icon name="settings-outline" style={{ fontSize: 16 }}></ion-icon>
                      Quản lý
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section>
            <h2 className="section-title" style={{ fontSize: 18, marginBottom: 12 }}>Tất cả nhóm</h2>
            <div className="glass-panel table-container" style={{ overflowX: 'auto' }}>
              <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th>Tên</th>
                    <th>Mô tả</th>
                    <th>Thành viên</th>
                    <th>Marketplace</th>
                    <th style={{ textAlign: 'right' }}>Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {groups.map(group => (
                    <tr key={group.id}>
                      <td className="td-name">{group.name}</td>
                      <td className="td-desc">{group.description || 'Chưa có mô tả'}</td>
                      <td>{group.memberCount || group.members?.length || 0}</td>
                      <td>
                        <span className={`badge ${group.isPublished ? 'badge-success' : 'badge-info'}`}>
                          {group.isPublished ? 'Đang hiển thị' : 'Chưa đăng'}
                        </span>
                      </td>
                      <td>
                        <div className="td-actions" style={{ justifyContent: 'flex-end' }}>
                          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/groups/${group.id}`)}>
                            Chi tiết
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </>
      )}

      {showCreateModal && (
        <div className="modal-overlay" onClick={closeCreateModal}>
          <div className="modal" onClick={event => event.stopPropagation()} style={{ maxWidth: 520 }}>
            <div className="modal-header" style={{ padding: 0, paddingBottom: 16, marginBottom: 18 }}>
              <h2>Tạo nhóm xưởng mới</h2>
              <button type="button" className="modal-close" onClick={closeCreateModal} aria-label="Đóng">
                <ion-icon name="close-outline"></ion-icon>
              </button>
            </div>

            <form onSubmit={handleCreateGroup} className="auth-form">
              {error && (
                <div className="form-error">
                  <ion-icon name="alert-circle-outline"></ion-icon>
                  {error}
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Tên nhóm *</label>
                <input
                  className="form-input"
                  style={{ paddingLeft: 14 }}
                  value={name}
                  onChange={event => setName(event.target.value)}
                  placeholder="VD: Xưởng rang Đà Lạt"
                  autoFocus
                />
              </div>

              <div className="form-group">
                <label className="form-label">Mô tả</label>
                <textarea
                  className="form-input form-textarea"
                  style={{ paddingLeft: 14 }}
                  value={description}
                  onChange={event => setDescription(event.target.value)}
                  placeholder="Mô tả ngắn về xưởng, năng lực hoặc khu vực..."
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={closeCreateModal} disabled={saving}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Đang tạo...' : 'Tạo nhóm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
