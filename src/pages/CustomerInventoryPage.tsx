import { useState } from 'react';
import { useParams } from 'react-router-dom';

export default function CustomerInventoryPage() {
    const { id } = useParams();

    // Placeholder
    return (
        <div className="dashboard-page">
            <header className="page-header">
                <div className="page-title-wrap">
                    <ion-icon name="archive-outline" class="page-icon"></ion-icon>
                    <h1 className="page-title">Nguyên liệu khách gửi</h1>
                </div>
            </header>
            <div className="page-content">
                <div style={{ background: '#fff', padding: 24, borderRadius: 16 }}>
                    <h3>Quản lý nguyên liệu do khách hàng cung cấp</h3>
                    <p style={{ color: '#64748b' }}>Theo dõi tồn kho riêng biệt theo từng khách hàng để phục vụ các đơn hàng gia công hoặc rang xay.</p>
                    <table className="data-table" style={{ marginTop: 20 }}>
                        <thead>
                            <tr>
                                <th>Khách hàng</th>
                                <th>Nguyên liệu</th>
                                <th>Tồn kho</th>
                                <th>Đơn vị</th>
                                <th>Thao tác</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td>Công ty A</td>
                                <td>Arabica</td>
                                <td>3000</td>
                                <td>kg</td>
                                <td><button className="btn btn-sm btn-outline">Cập nhật</button></td>
                            </tr>
                            <tr>
                                <td>Công ty B</td>
                                <td>Robusta</td>
                                <td>5000</td>
                                <td>kg</td>
                                <td><button className="btn btn-sm btn-outline">Cập nhật</button></td>
                            </tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
