import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { teamService } from '../services/groupService';

export default function InventoryPage() {
    const { id } = useParams();
    const [inventoryItems, setInventoryItems] = useState<any[]>([]);

    // Placeholder
    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div className="page-title-wrap">
                    <ion-icon name="layers-outline" class="page-icon"></ion-icon>
                    <h1 className="page-title">Kho nguyên liệu (Chính)</h1>
                </div>
            </header>
            <div className="page-content">
                <div style={{ background: '#fff', padding: 24, borderRadius: 16 }}>
                    <h3>Quản lý nguyên liệu xưởng cung cấp</h3>
                    <p style={{ color: '#64748b' }}>Chỉ bao gồm hạt cà phê (Arabica, Robusta...). Không bao gồm vật tư phụ, bao bì.</p>
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
                            {/* Dummy data for market demo */}
                            <tr>
                                <td>Arabica</td>
                                <td>5000</td>
                                <td>kg</td>
                                <td><button className="btn btn-sm btn-outline">Nhập kho</button></td>
                            </tr>
                            <tr>
                                <td>Robusta</td>
                                <td>8000</td>
                                <td>kg</td>
                                <td><button className="btn btn-sm btn-outline">Nhập kho</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
