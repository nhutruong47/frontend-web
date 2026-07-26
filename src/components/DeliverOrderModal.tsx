import React, { useState } from 'react';
import { uploadFile } from '../services/fileService';

interface DeliverOrderModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (proofImageUrls: string[]) => Promise<void>;
}

export default function DeliverOrderModal({ isOpen, onClose, onSubmit }: DeliverOrderModalProps) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [files, setFiles] = useState<File[]>([]);
    const [uploading, setUploading] = useState(false);

    if (!isOpen) return null;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            setFiles(Array.from(e.target.files));
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        setUploading(true);
        
        try {
            const uploadedUrls = [];
            for (const file of files) {
                const url = await uploadFile(file);
                uploadedUrls.push(url);
            }
            setUploading(false);
            
            await onSubmit(uploadedUrls);
            onClose();
        } catch (err: any) {
            setUploading(false);
            setError(err.response?.data?.error || err.message || 'Lỗi cập nhật');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
            <div className="bg-white rounded-lg p-6 w-full max-w-md shadow-xl">
                <h2 className="text-xl font-bold mb-4">Xác Nhận Đã Giao Hàng</h2>
                {error && <div className="mb-4 text-red-600 bg-red-50 p-3 rounded">{error}</div>}
                
                <form onSubmit={handleSubmit} className="space-y-4">
                    <p className="text-sm text-gray-600">
                        Vui lòng tải lên hình ảnh bằng chứng giao hàng (nếu có).
                    </p>
                    
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Hình ảnh đính kèm</label>
                        <input 
                            type="file" 
                            multiple 
                            accept="image/*"
                            onChange={handleFileChange}
                            className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                        />
                        {files.length > 0 && (
                            <p className="text-xs text-gray-500 mt-1">Đã chọn {files.length} file</p>
                        )}
                    </div>

                    <div className="pt-2 flex justify-end space-x-3">
                        <button type="button" onClick={onClose} disabled={loading}
                            className="px-4 py-2 border rounded text-gray-600 hover:bg-gray-50">
                            Hủy
                        </button>
                        <button type="submit" disabled={loading}
                            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 flex items-center">
                            {uploading ? 'Đang tải ảnh...' : (loading ? 'Đang xử lý...' : 'Xác nhận giao hàng')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
