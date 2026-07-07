import { useState } from 'react';

interface InventoryItem {
    id: string;
    name: string;
    stock: number;
    unit: string;
}

export default function InventoryPage() {
    const [items] = useState<InventoryItem[]>([]);
    const [showImport, setShowImport] = useState(false);

    const handleImport = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Real backend wiring goes here. The page-level call site is
        // inventoryService.import(...) once the API is connected.
    };

    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div className="page-title-wrap">
                    <ion-icon name="layers-outline" className="page-icon"></ion-icon>
                    <h1 className="page-title">Kho nguyên liệu (Chính)</h1>
                </div>
                {items.length > 0 && (
                    <button
                        className="btn btn-primary"
                        onClick={() => setShowImport(true)}
                    >
                        <ion-icon name="add-circle-outline" style={{ marginRight: 6 }}></ion-icon>
                        Nhập kho
                    </button>
                )}
            </header>
            <div className="page-content">
                <div className="inventory-card">
                    <header className="inventory-card-header">
                        <h3>Quản lý nguyên liệu xưởng cung cấp</h3>
                        <p className="inventory-card-subtitle">
                            Chỉ bao gồm hạt cà phê (Arabica, Robusta, v.v.). Không bao gồm vật tư phụ, bao bì.
                        </p>
                    </header>

                    {items.length === 0 ? (
                        <div className="inventory-empty-state">
                            <div className="inventory-empty-illustration">
                                <ion-icon name="cube-outline"></ion-icon>
                            </div>
                            <h4 className="inventory-empty-title">
                                Chưa có sản phẩm hoặc nguyên liệu trong kho
                            </h4>
                            <p className="inventory-empty-hint">
                                Bắt đầu bằng cách nhập kho lô hàng đầu tiên hoặc tạo sản phẩm mới cho nhóm của bạn.
                            </p>
                            <div className="inventory-empty-actions">
                                <button
                                    className="btn btn-primary"
                                    onClick={() => setShowImport(true)}
                                >
                                    <ion-icon name="add-circle-outline" style={{ marginRight: 6 }}></ion-icon>
                                    Nhập kho
                                </button>
                                <button
                                    className="btn btn-outline"
                                    onClick={() => {/* route to product create */ }}
                                >
                                    <ion-icon name="add-outline" style={{ marginRight: 6 }}></ion-icon>
                                    Thêm sản phẩm
                                </button>
                            </div>
                        </div>
                    ) : (
                        <table className="data-table">
                            <thead>
                                <tr>
                                    <th>Tên nguyên liệu</th>
                                    <th>Tồn kho</th>
                                    <th>Đơn vị</th>
                                    <th>Thao tác</th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((it) => (
                                    <tr key={it.id}>
                                        <td>{it.name}</td>
                                        <td>{it.stock}</td>
                                        <td>{it.unit}</td>
                                        <td>
                                            <button className="btn btn-sm btn-outline">Nhập kho</button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>

                {showImport && (
                    <div className="modal-overlay" onClick={() => setShowImport(false)}>
                        <div className="modal" onClick={(e) => e.stopPropagation()}>
                            <div className="modal-header">
                                <h3>Nhập kho</h3>
                                <button
                                    className="modal-close"
                                    onClick={() => setShowImport(false)}
                                    aria-label="Đóng"
                                >
                                    <ion-icon name="close-outline"></ion-icon>
                                </button>
                            </div>
                            <form onSubmit={handleImport} className="modal-body">
                                {/* Form fields wired to inventoryService.import(...) in a follow-up */}
                                <p style={{ color: 'var(--text-secondary)' }}>
                                    Form nhập kho sẽ được kết nối với <code>POST /api/inventory</code>.
                                </p>
                                <div className="modal-actions">
                                    <button type="button" className="btn btn-outline" onClick={() => setShowImport(false)}>
                                        Hủy
                                    </button>
                                    <button type="submit" className="btn btn-primary">
                                        Lưu
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}