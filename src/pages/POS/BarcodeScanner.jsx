import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeScanner, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { FiCamera, FiImage, FiX } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function BarcodeScanner({ onScan, onClose }) {
    const [activeTab, setActiveTab] = useState('camera');
    const [scanning, setScanning] = useState(false);
    const scannerRef = useRef(null);
    const fileInputRef = useRef(null);

    // Camera Effect
    useEffect(() => {
        if (activeTab === 'camera') {
            const scanner = new Html5QrcodeScanner(
                "reader",
                {
                    fps: 10,
                    qrbox: { width: 250, height: 250 },
                    aspectRatio: 1.0,
                    formatsToSupport: [Html5QrcodeSupportedFormats.EAN_13, Html5QrcodeSupportedFormats.CODE_128, Html5QrcodeSupportedFormats.UPC_A]
                },
                /* verbose= */ false
            );

            scanner.render(onScanSuccess, onScanFailure);
            scannerRef.current = scanner;

            return () => {
                scanner.clear().catch(error => console.error("Failed to clear html5-qrcode scanner. ", error));
            };
        }
    }, [activeTab]);

    const onScanSuccess = (decodedText, decodedResult) => {
        onScan(decodedText);
        // Optional: close on success? Or just beep
        // onClose();
    };

    const onScanFailure = (error) => {
        // console.warn(`Code scan error = ${error}`);
    };

    // File Handler
    const handleFileChange = async (e) => {
        if (e.target.files.length === 0) return;

        const imageFile = e.target.files[0];
        const html5QrCode = new Html5Qrcode("file-reader");

        try {
            setScanning(true);
            const decodedText = await html5QrCode.scanFile(imageFile, true);
            onScan(decodedText);
            toast.success(`تم قراءة الباركود: ${decodedText}`);
        } catch (err) {
            toast.error('فشل قراءة الباركود من الصورة. تأكد من وضوحه.');
            console.error(err);
        } finally {
            setScanning(false);
            html5QrCode.clear();
        }
    };

    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal" onClick={e => e.stopPropagation()} style={{ maxWidth: '500px' }}>
                <div className="modal-header">
                    <h3 className="modal-title">مسح الباركود</h3>
                    <button className="btn btn-ghost btn-icon" onClick={onClose}><FiX /></button>
                </div>

                <div className="tabs" style={{ marginBottom: '16px', borderBottom: '1px solid var(--border-color)' }}>
                    <button
                        className={`tab ${activeTab === 'camera' ? 'active' : ''}`}
                        onClick={() => setActiveTab('camera')}
                        style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                    >
                        <FiCamera /> الكاميرا
                    </button>
                    <button
                        className={`tab ${activeTab === 'image' ? 'active' : ''}`}
                        onClick={() => setActiveTab('image')}
                        style={{ flex: 1, justifyContent: 'center', padding: '12px' }}
                    >
                        <FiImage /> رفع صورة
                    </button>
                </div>

                <div className="modal-body" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>

                    {activeTab === 'camera' && (
                        <div id="reader" style={{ width: '100%' }}></div>
                    )}

                    {activeTab === 'image' && (
                        <div style={{ textAlign: 'center', width: '100%' }}>
                            <div id="file-reader" style={{ display: 'none' }}></div>
                            <div
                                className="upload-zone"
                                onClick={() => fileInputRef.current.click()}
                                style={{
                                    border: '2px dashed var(--border-color)',
                                    borderRadius: '12px',
                                    padding: '40px',
                                    cursor: 'pointer',
                                    background: 'var(--bg-main)',
                                    marginBottom: '20px'
                                }}
                            >
                                <FiImage style={{ fontSize: '48px', color: 'var(--text-secondary)', marginBottom: '16px' }} />
                                <p>اضغط لرفع صورة تحتوي على باركود</p>
                                <p style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>يدعم JPG, PNG</p>
                            </div>
                            <input
                                type="file"
                                accept="image/*"
                                ref={fileInputRef}
                                style={{ display: 'none' }}
                                onChange={handleFileChange}
                            />
                            {scanning && <div className="spinner"></div>}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
