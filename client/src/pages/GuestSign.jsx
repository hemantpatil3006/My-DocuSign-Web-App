import React, { useEffect, useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { DndContext, useDraggable, MouseSensor, TouchSensor, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import api from '../services/api';
import SignatureModal from '../components/SignatureModal';
import { FileCheck, ArrowRight, X, AlertCircle, Download, PenTool, CheckCircle, Shield, Loader2, Menu } from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import toast from 'react-hot-toast';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const DraggableSignature = ({ sig, pageNumber, onDelete, onResize, disabled }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: sig.id,
        disabled: disabled
    });

    const [localDim, setLocalDim] = useState({ width: sig.width, height: sig.height });
    const isResizing = useRef(false);

    useEffect(() => {
        setLocalDim({ width: sig.width, height: sig.height });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sig.width, sig.height]);

    const style = {
        transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
        left: sig.x,
        top: sig.y,
        width: localDim.width,
        height: localDim.height,
        boxSizing: 'border-box',
        touchAction: 'none',
    };
    
    const dimsRef = useRef({ width: sig.width, height: sig.height });
    
    const handleResizeStart = (e) => {
        e.preventDefault();
        e.stopPropagation();
        
        const isTouch = e.type === 'touchstart';
        const clientX = isTouch ? e.touches[0].clientX : e.clientX;
        const clientY = isTouch ? e.touches[0].clientY : e.clientY;
        
        const startW = localDim.width;
        const startH = localDim.height;
        
        const onMove = (moveEvent) => {
            const moveClientX = isTouch ? moveEvent.touches[0].clientX : moveEvent.clientX;
            const moveClientY = isTouch ? moveEvent.touches[0].clientY : moveEvent.clientY;
            
            const w = Math.max(50, startW + (moveClientX - clientX));
            const h = Math.max(20, startH + (moveClientY - clientY));
            setLocalDim({ width: w, height: h });
            dimsRef.current = { width: w, height: h };
        };
        
        const onEnd = () => {
            if (isTouch) {
                window.removeEventListener('touchmove', onMove);
                window.removeEventListener('touchend', onEnd);
            } else {
                window.removeEventListener('mousemove', onMove);
                window.removeEventListener('mouseup', onEnd);
            }
            onResize(sig.id, dimsRef.current.width, dimsRef.current.height);
        };
        
        if (isTouch) {
            window.addEventListener('touchmove', onMove, { passive: false });
            window.addEventListener('touchend', onEnd);
        } else {
            window.addEventListener('mousemove', onMove);
            window.addEventListener('mouseup', onEnd);
        }
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            className="absolute group z-50 pointer-events-auto p-1 border-2 border-dashed border-indigo-400/50 hover:border-indigo-600 bg-indigo-50/10 hover:bg-indigo-50/30 rounded-lg transition-all"
            {...listeners}
            {...attributes}
        >
            {sig.signatureData ? (
                <img 
                    src={sig.signatureData} 
                    alt="Signature" 
                    className="w-full h-full object-contain pointer-events-none select-none" 
                    draggable={false}
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center text-indigo-600 text-[10px] font-bold uppercase pointer-events-none tracking-wider">
                    Place Here
                </div>
            )}
            {!disabled && (
                <>
                    <button
                        onClick={(e) => { e.stopPropagation(); onDelete(sig.id); }}
                        onMouseDown={(e) => e.stopPropagation()}
                        onTouchStart={(e) => e.stopPropagation()}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors z-[60] scale-0 group-hover:scale-100 transition-transform"
                    >
                        <X size={12} strokeWidth={3} />
                    </button>
                    
                    {/* Resize Handle */}
                    <div
                        onMouseDown={handleResizeStart}
                        onTouchStart={handleResizeStart}
                        className="absolute -bottom-1.5 -right-1.5 w-4 h-4 bg-indigo-600 rounded-full cursor-nwse-resize shadow-md z-[60] scale-0 group-hover:scale-100 transition-transform border-2 border-white"
                        title="Resize"
                    ></div>
                </>
            )}
        </div>
    );
};

const guestInfoSchema = z.object({
    name: z.string().min(2, "Name must be at least 2 characters"),
    email: z.string().email("Please enter a valid email address"),
});

const GuestSign = () => {
    const { token } = useParams();
    const [docData, setDocData] = useState(null);
    const [signatures, setSignatures] = useState([]);
    
    const [signerInfo, setSignerInfo] = useState(() => {
        const stored = localStorage.getItem(`guestInfo_${token}`);
        return stored ? JSON.parse(stored) : { name: '', email: '' };
    });
    
    
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [pageNumber, setPageNumber] = useState(1);
    const [numPages, setNumPages] = useState(null);
    const [pdfWidth, setPdfWidth] = useState(800);
    const [renderedPageHeight, setRenderedPageHeight] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSignatureId, setCurrentSignatureId] = useState(null);
    const [isFinalized, setIsFinalized] = useState(false);
    const [isInfoSubmitted, setIsInfoSubmitted] = useState(false);
    const [guestRole, setGuestRole] = useState('Signer');
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);

    const [error, setError] = useState(null);

    const { register: infoRegister, handleSubmit: handleInfoSubmit, formState: { errors: infoErrors } } = useForm({
        resolver: zodResolver(guestInfoSchema),
    });

    const onInfoSubmit = (data) => {
        setSignerInfo(data);
        localStorage.setItem(`guestInfo_${token}`, JSON.stringify(data));
        toast.success(`Welcome, ${data.name}`);
    };

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: {
                distance: 8,
            },
        }),
        useSensor(TouchSensor, {
            activationConstraint: {
                delay: 200,
                tolerance: 5,
            },
        })
    );

    const pdfWrapperRef = useRef(null);
    const pdfContentRef = useRef(null);

    const handleDragEnd = async (event) => {
        if (!['Signer', 'Witness', 'Approver'].includes(guestRole)) return;
        
        const { active, delta } = event;
        if (!active) return;

        const sig = signatures.find(s => s.id === active.id);
        if (!sig) return;

        const newX = sig.x + delta.x;
        const newY = sig.y + delta.y;
        const actualWidth = pdfContentRef.current.offsetWidth || pdfWidth;
        const actualHeight = renderedPageHeight || pdfContentRef.current.offsetHeight;

        const clampedX = Math.max(0, Math.min(newX, actualWidth - sig.width));
        const clampedY = Math.max(0, Math.min(newY, actualHeight - sig.height));

        setSignatures(prev => prev.map(s => 
            s.id === sig.id ? { ...s, x: clampedX, y: clampedY } : s
        ));

        try {
            const scale = 800 / actualWidth;
            const normalizedX = clampedX * scale;
            const normalizedY = clampedY * scale;

            const cleanId = sig.id.toString().split('base64')[0].substring(0, 24);
            await api.put(`/signatures/${cleanId}?token=${token}`, {
                x: normalizedX,
                y: normalizedY,
                page: pageNumber
            });
        } catch (error) {
            console.error('Position sync error:', error);
            toast.error('Failed to sync position');
        }
    };

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    useEffect(() => {
        const updateWidth = () => {
             if (pdfWrapperRef.current) {
                const width = pdfWrapperRef.current.clientWidth;
                // Use actual container width on mobile, enforce minimum only on larger screens
                const targetWidth = Math.max(width - 32, 600);
                setPdfWidth(Math.min(targetWidth, 1200));
             }
        };
        updateWidth();
    }, [pageNumber]);

    useEffect(() => {
        const updateWidth = () => {
             if (pdfWrapperRef.current) {
                const width = pdfWrapperRef.current.clientWidth;
                // Use actual container width on mobile, enforce minimum only on larger screens
                const targetWidth = Math.max(width - 32, 600);
                setPdfWidth(Math.min(targetWidth, 1200));
             }
        };
        
        updateWidth(); // Initial call
        window.addEventListener('resize', updateWidth);
        // const timer = setTimeout(updateWidth, 100); // Removed timeout as updateWidth is called immediately

        return () => {
            window.removeEventListener('resize', updateWidth);
            // clearTimeout(timer);
        };
    }, []);

    useEffect(() => {
        const fetchDoc = async () => {
            try {
                const res = await api.get(`/docs/public/${token}`);
                setDocData(res.data);
                setGuestRole(res.data.guestRole || 'Signer');
                
                // Pre-fill information if available from invitation
                if (res.data.guestName && res.data.guestEmail) {
                    setSignerInfo({ name: res.data.guestName, email: res.data.guestEmail });
                    setIsInfoSubmitted(true);
                }

                const sigRes = await api.get(`/signatures/${res.data._id}?token=${token}`);
                const scale = pdfWidth / 800;
                setSignatures(sigRes.data.map(s => ({ 
                    ...s, 
                    id: s._id, 
                    x: s.x * scale, 
                    y: s.y * scale,
                    width: (s.width || 150) * scale,
                    height: (s.height || 60) * scale
                })));

                if (res.data.status === 'Signed') {
                    setIsFinalized(true);
                }
            } catch (error) {
                console.error('Error fetching document:', error);
                if (error.response?.status === 410) {
                    setError('This invitation link has expired. Please ask the owner to send a new invitation.');
                } else if (error.response?.status === 404) {
                    setError('Invalid link or document not found. Please check your link or ask the owner for a new one.');
                } else {
                    setError(error.response?.data?.message || 'Failed to load document');
                }
            }
        };
        fetchDoc();
    }, [token, pdfWidth]);

    const handleSaveSignature = async (signatureData) => {
        const sig = signatures.find(s => s.id === currentSignatureId);
        if (!sig) return;

        try {
            const actualWidth = pdfContentRef.current?.offsetWidth || pdfWidth;
            const scale = 800 / actualWidth;
            const normalizedX = sig.x * scale;
            const normalizedY = sig.y * scale;

            await api.put(`/signatures/${sig.id}?token=${token}`, {
                signatureData,
                page: pageNumber,
                x: normalizedX,
                y: normalizedY
            });

            setSignatures(prev => prev.map(s => 
                s.id === currentSignatureId ? { ...s, signatureData } : s
            ));
            setIsModalOpen(false);
            toast.success('Signature updated');
        } catch (err) {
            console.error(err);
            toast.error('Failed to save signature');
        }
    };

    const createSignatureAt = async (clientX, clientY) => {
        if (!['Signer', 'Witness', 'Approver'].includes(guestRole)) return;
        if (!pdfContentRef.current) return;
        
        const rect = pdfContentRef.current.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        const actualWidth = pdfContentRef.current.offsetWidth || pdfWidth;
        const actualHeight = renderedPageHeight || pdfContentRef.current.offsetHeight;

        const x = Math.max(0, Math.min(mouseX - 75, actualWidth - 150));
        const y = Math.max(0, Math.min(mouseY - 30, actualHeight - 60));

        const scale = 800 / actualWidth;
        const normalizedX = x * scale;
        const normalizedY = y * scale;

        try {
            const res = await api.post(`/signatures?token=${token}`, {
                documentId: docData._id,
                page: pageNumber,
                x: Number(normalizedX),
                y: Number(normalizedY),
                width: Number(150 * scale),
                height: Number(60 * scale),
                signerEmail: signerInfo.email,
                signerName: signerInfo.name
            });
            const newSig = { ...res.data, id: res.data._id, x, y, width: 150, height: 60 };
            setSignatures(prev => [...prev, newSig]);
            setCurrentSignatureId(newSig.id);
            setIsModalOpen(true);
        } catch (err) {
            console.error('Placement error:', err);
            toast.error(err.response?.data?.message || 'Could not place signature');
        }
    };

    const handleResize = async (id, newWidth, newHeight) => {
        if (!['Signer', 'Witness', 'Approver'].includes(guestRole)) return;
        setSignatures(prev => prev.map(s => 
            s.id === id ? { ...s, width: newWidth, height: newHeight } : s
        ));
        
        try {
            const cleanId = id.toString().split('base64')[0].substring(0, 24);
            if (token) {
                 await api.put(`/signatures/${cleanId}?token=${token}`, {
                    width: newWidth,
                    height: newHeight
                });
            }
        } catch (error) {
            console.error('Error resizing signature:', error);
            toast.error('Failed to save resize');
        }
    };

    const handleFinalize = async () => {
        setIsFinalizing(true);
        const loadToast = toast.loading('Finalizing document...');
        try {
            console.log(`[DEBUG] handleFinalize: Starting for doc ${docData._id} with token: ${!!token}`);
            const finalizeData = {
                documentId: docData._id,
                signerEmail: signerInfo.email,
                signerName: signerInfo.name,
                token // Including token in body for extra redundancy
            };
            const endpoint = `/signatures/finalize${token ? `?token=${token}` : ''}`;
            console.log(`[DEBUG] handleFinalize: POST to ${endpoint}`);
            
            await api.post(endpoint, finalizeData);
            console.log('[DEBUG] handleFinalize: Success');
            toast.success('Document finalized!', { id: loadToast });
            setIsFinalized(true);
        } catch (err) {
            console.error(err);
            toast.error(err.response?.data?.message || 'Error finalizing document', { id: loadToast });
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleReject = async () => {
        if (!window.confirm('Are you sure you want to reject this document?')) return;
        try {
            await api.post(`/docs/reject/${docData._id}?token=${token}&signerEmail=${signerInfo.email}&signerName=${signerInfo.name}`);
            setDocData(prev => ({ ...prev, status: 'Rejected' }));
            toast.success('Document rejected');
        } catch (error) {
            console.error('Error rejecting:', error);
            toast.error('Failed to reject document');
        }
    };

    const handleDownload = async () => {
        try {
            const res = await api.get(`/docs/download/${docData._id}?token=${token}&signerEmail=${signerInfo.email}&signerName=${signerInfo.name}`, {
                responseType: 'blob'
            });
            const url = window.URL.createObjectURL(new Blob([res.data]));
            const link = window.document.createElement('a');
            link.href = url;
            link.setAttribute('download', `signed-${docData.filename}`);
            window.document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (err) {
            console.error(err);
            toast.error('Download failed');
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center border border-slate-100 animate-slide-up">
                    <div className="flex justify-center mb-6">
                        <div className="bg-red-50 p-4 rounded-full ring-8 ring-red-50/50">
                            <AlertCircle className="w-12 h-12 text-red-500" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 mb-4">Link Error</h2>
                    <p className="text-slate-600 mb-8 leading-relaxed">
                        {error}
                    </p>
                    <button 
                        onClick={() => window.location.reload()}
                        className="w-full bg-slate-800 text-white py-3.5 rounded-xl font-bold hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    if (!docData) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
                 <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                 <p className="text-slate-500 font-medium animate-pulse">Loading Document...</p>
            </div>
        );
    }

    if (isFinalized) {
        return (
            <div className="min-h-screen bg-slate-50 overflow-hidden relative flex items-center justify-center p-4">
                 <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-indigo-50/50 to-transparent pointer-events-none"></div>

                <div className="relative bg-white/80 backdrop-blur-xl p-10 rounded-3xl shadow-[0_20px_60px_-15px_rgba(0,0,0,0.1)] w-full max-w-lg border border-white/50 animate-slide-up text-center">
                    <div className="flex justify-center mb-8">
                        <div className="bg-green-50 p-6 rounded-full ring-8 ring-green-50/50 shadow-inner">
                            <CheckCircle className="w-16 h-16 text-green-500" />
                        </div>
                    </div>
                    <h2 className="text-3xl font-extrabold text-slate-900 mb-4 tracking-tight">Successfully Signed!</h2>
                    <p className="text-slate-500 mb-8 text-lg leading-relaxed">
                        Thank you, <span className="font-semibold text-slate-800">{signerInfo.name}</span>.<br/>
                        The document has been securely locked and an audit trail has been generated.
                    </p>
                    
                    <div className="space-y-4">
                        <button 
                            onClick={handleDownload}
                            className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-3 shadow-lg shadow-indigo-200 dark:shadow-none group"
                        >
                            Download Signed Copy 
                            <Download size={20} className="group-hover:translate-y-0.5 transition-transform" />
                        </button>
                    </div>

                    <div className="mt-8 pt-8 border-t border-slate-100">
                        <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                            <Shield size={14} className="text-indigo-400" /> 
                            Securely verified via Labmentix Project Audit Trail
                        </p>
                    </div>
                </div>
            </div>
        );
    }


    if (!isInfoSubmitted) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 relative overflow-hidden">
                <div className="absolute top-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-slate-50 pointer-events-none"></div>

                <div className="relative bg-white p-8 md:p-10 rounded-2xl shadow-[0_20px_50px_rgba(79,70,229,0.1)] w-full max-w-md border border-slate-100 animate-slide-up">
                    <div className="flex justify-center mb-8">
                        <div className="bg-indigo-50 p-4 rounded-2xl shadow-sm rotate-3 transform transition-transform hover:rotate-6">
                            <PenTool className="w-10 h-10 text-indigo-600" />
                        </div>
                    </div>
                    <h2 className="text-2xl font-bold text-center text-slate-800 mb-2">Welcome to Signing</h2>
                    <p className="text-center text-slate-500 mb-8 text-sm leading-relaxed">
                        Please confirm your identity to proceed with the <br/>
                        <span className="text-indigo-600 font-semibold">Secure Digital Signature</span> process.
                    </p>
                    <form onSubmit={handleInfoSubmit(onInfoSubmit)} className="space-y-5">
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-indigo-600 transition-colors">Full Name</label>
                            <input 
                                {...infoRegister('name')}
                                className={`w-full px-5 py-3.5 bg-slate-50 border ${infoErrors.name ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700`}
                                placeholder="e.g. John Doe"
                            />
                            {infoErrors.name && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{infoErrors.name.message}</p>}
                        </div>
                        <div className="group">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-indigo-600 transition-colors">Email Address</label>
                            <input 
                                {...infoRegister('email')}
                                className={`w-full px-5 py-3.5 bg-slate-50 border ${infoErrors.email ? 'border-red-400' : 'border-slate-200'} rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 font-medium text-slate-700`}
                                placeholder="e.g. john@example.com"
                            />
                            {infoErrors.email && <p className="text-xs text-red-500 mt-1 ml-1 font-medium">{infoErrors.email.message}</p>}
                        </div>
                        <button type="submit" className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none mt-2">
                            Proceed to Document <ArrowRight size={20} />
                        </button>
                    </form>
                </div>
            </div>
        );
    }

    return (
        <div className="h-screen bg-slate-100/50 dark:bg-slate-900/50 flex flex-col font-sans transition-colors duration-300">
            <SignatureModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSave={handleSaveSignature} signerName={signerInfo.name} />
            
            <header className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/60 dark:border-slate-800 px-3 md:px-6 py-4 flex justify-between items-center shadow-sm z-30 shrink-0 sticky top-0 transition-colors duration-300">
                <div className="flex items-center gap-2 md:gap-4 min-w-0">
                    <h1 className="font-bold text-slate-800 dark:text-slate-100 text-sm md:text-xl truncate max-w-[120px] md:max-w-md" title={docData.filename}>{docData.filename}</h1>
                    <span className={`hidden md:inline-flex px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-widest border ${
                        docData.status === 'Signed' ? 'bg-green-50 text-green-700 border-green-100 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                        docData.status === 'Rejected' ? 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                        'bg-amber-50 text-amber-600 border-amber-100/50 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                    }`}>
                        {guestRole} Mode
                    </span>
                </div>
                <div className="flex items-center gap-3">
                   <ThemeToggle />
                   {docData.status === 'Pending' && (
                       <button 
                           onClick={handleReject} 
                           className="hidden md:flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50/50 hover:bg-red-50 rounded-lg transition-all text-sm font-bold border border-red-100 active:scale-[0.98]"
                           title="Reject Document"
                       >
                           <X size={18} /> Reject
                       </button>
                   )}
                    {docData.status === 'Pending' && (guestRole === 'Approver' || (['Signer', 'Witness'].includes(guestRole) && (signatures.length > 0 || signatures.some(s => s.signatureData)))) && (
                        <button 
                            onClick={handleFinalize} 
                            disabled={isFinalizing}
                            className={`${guestRole === 'Approver' ? 'bg-green-600 hover:bg-green-700 shadow-green-200' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'} text-white px-3 md:px-6 py-2.5 rounded-lg font-bold text-xs md:text-base active:scale-[0.98] transition-all flex items-center gap-2 shadow-lg dark:shadow-none animate-slide-up disabled:opacity-70 disabled:cursor-not-allowed`}
                        >
                            {isFinalizing ? (
                                <>{guestRole === 'Approver' ? 'Approving...' : 'Finalizing...'} <Loader2 className="animate-spin" size={14} /></>
                            ) : (
                                <>{guestRole === 'Approver' ? 'Sign & Approve' : (guestRole === 'Witness' ? 'Witness & Confirm' : 'Finish & Sign')} <CheckCircle size={14} /></>
                            )}
                        </button>
                    )}
                    {docData.status === 'Pending' && ['Signer', 'Witness', 'Approver'].includes(guestRole) && (
                         <button 
                             onClick={() => {
                                 // Place signature in center of visible view for mobile
                                 if (pdfContentRef.current && pdfWrapperRef.current) {
                                     const rect = pdfContentRef.current.getBoundingClientRect();
                                     const wrapperRect = pdfWrapperRef.current.getBoundingClientRect();
                                     
                                     const centerX = wrapperRect.left + wrapperRect.width / 2;
                                     const centerY = wrapperRect.top + wrapperRect.height / 2;
                                     
                                     createSignatureAt(centerX, centerY);
                                     
                                     toast.success('Signature added! Drag to position.', {
                                         icon: '👆',
                                         duration: 3000
                                     });
                                 }
                             }}
                             className="md:hidden p-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200 active:scale-95"
                             title="Tap to Add Signature"
                         >
                             <PenTool size={20} />
                         </button>
                    )}
                    <button 
                         onClick={() => setIsMobileSidebarOpen(true)}
                         className="md:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                    >
                        <Menu size={24} />
                    </button>
                </div>
            </header>

            <main ref={pdfWrapperRef} className="flex-1 overflow-auto p-4 md:p-8 flex flex-col items-center bg-slate-100 dark:bg-slate-900 relative scroll-smooth transition-colors duration-300">
                {['Signer', 'Witness', 'Approver'].includes(guestRole) && (
                    <div className="hidden md:flex sticky top-4 z-[40] mb-8 w-full max-w-2xl bg-white/95 backdrop-blur-md border-2 border-indigo-100 text-slate-700 px-6 py-4 rounded-2xl shadow-[0_15px_40px_rgba(79,70,229,0.12)] items-center gap-4 animate-bounce-subtle shrink-0">
                        <div className="bg-indigo-50 p-3 rounded-xl shrink-0 ring-4 ring-indigo-50/50">
                            <PenTool size={20} className="text-indigo-600" />
                        </div>
                        <div className="flex-1">
                            <p className="text-sm md:text-base font-semibold leading-tight">
                                <span className="text-slate-400 block text-xs uppercase tracking-wider mb-1">Action Required</span>
                                {guestRole === 'Approver' 
                                    ? <>Welcome, {signerInfo.name}. Please <span className="text-indigo-600">review, manage signatures</span> if needed, and click <span className="text-indigo-600 underline decoration-2 underline-offset-4">Sign & Approve</span>.</>
                                    : <>Welcome, {signerInfo.name}. <span className="text-indigo-600 underline decoration-2 underline-offset-4">Click anywhere</span> on the document to place your signature.</>
                                }
                            </p>
                        </div>
                        {signatures.length > 0 && (
                            <div className="bg-green-50 text-green-700 text-xs font-bold px-3 py-1.5 rounded-lg border border-green-100 flex items-center gap-1.5 whitespace-nowrap">
                                <CheckCircle size={14} /> {signatures.length} {guestRole === 'Witness' ? 'Witnessed' : (guestRole === 'Approver' ? 'Fields' : 'Signed')}
                            </div>
                        )}
                    </div>
                )}
                {guestRole === 'Viewer' && (
                    <div className="hidden md:flex sticky top-4 z-[40] mb-8 w-full max-w-xl bg-white/90 backdrop-blur-md border border-slate-100 text-slate-700 px-5 py-3 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.06)] items-center gap-4 shrink-0">
                        <div className="bg-slate-100 p-2 rounded-full shrink-0">
                            <Shield size={16} className="text-slate-600" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                                <span className="text-slate-400">Welcome, {signerInfo.name}.</span> You have <span className="font-bold text-slate-600">Read-Only</span> access to this document.
                            </p>
                        </div>
                    </div>
                )}

                {/* PDF Container */}
                <div 
                    className="relative mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-lg overflow-visible bg-white dark:bg-slate-800 mb-8 md:mb-32 w-fit border border-slate-200/50 dark:border-slate-700 transition-shadow hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)]" 
                    ref={pdfContentRef} 
                >
                    <Document
                        file={`${import.meta.env.VITE_BASE_URL || 'http://localhost:5001'}/${docData.originalUrl}`}
                        onLoadSuccess={onDocumentLoadSuccess}
                        loading={
                            <div className="p-32 flex flex-col items-center justify-center gap-3 text-slate-400">
                                <div className="w-8 h-8 border-2 border-indigo-200 border-t-indigo-600 rounded-full animate-spin"></div>
                                <span className="text-sm font-medium">Rendering PDF...</span>
                            </div>
                        }
                    >
                        <div className="relative group/pdf">
                            <Page 
                                pageNumber={pageNumber} 
                                width={pdfWidth} 
                                onLoadSuccess={(page) => setRenderedPageHeight(page.height)}
                                renderTextLayer={false}
                                renderAnnotationLayer={false}
                                className="transition-opacity duration-300"
                            />
                            
                            {/* Click Capture Overlay */}
                            <div 
                                className={`absolute inset-0 z-[45] transition-colors ${
                                    docData.status === 'Pending' && ['Signer', 'Witness', 'Approver'].includes(guestRole)
                                    ? 'cursor-crosshair pointer-events-auto hover:bg-indigo-500/5' 
                                    : 'pointer-events-none'
                                }`}
                                onClick={(e) => {
                                    if (docData.status === 'Pending' && !isModalOpen && ['Signer', 'Witness', 'Approver'].includes(guestRole)) {
                                        createSignatureAt(e.clientX, e.clientY);
                                    }
                                }}
                            />

                            <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                <div className="absolute inset-0 z-[50] pointer-events-none">
                                    <div className="w-full h-full relative pointer-events-none">
                                        {docData.status !== 'Signed' && signatures.filter(s => Number(s.page) === Number(pageNumber)).map(sig => (
                                            <DraggableSignature 
                                                key={sig.id}
                                                sig={sig} 
                                                pageNumber={pageNumber} 
                                                onResize={handleResize}
                                                onDelete={async (id) => {
                                                    if (!['Signer', 'Witness', 'Approver'].includes(guestRole)) return;
                                                    try {
                                                        const cleanId = id.toString().split('base64')[0].substring(0, 24);
                                                        if (cleanId.length === 24) {
                                                            await api.delete(`/signatures/${cleanId}?token=${token}`);
                                                        }
                                                        setSignatures(prev => prev.filter(s => s.id !== id));
                                                        toast.success('Signature removed');
                                                    } catch (err) {
                                                        console.error('Delete error:', err);
                                                        toast.error(err.response?.data?.message || 'Failed to remove signature');
                                                    }
                                                }}
                                                disabled={!['Signer', 'Witness', 'Approver'].includes(guestRole)}
                                            />
                                        ))}
                                    </div>
                                </div>
                            </DndContext>
                        </div>
                    </Document>
                    
                    {numPages > 1 && (
                        <div className="flex items-center justify-center gap-4 p-4 bg-white border-t border-slate-100 select-none">
                            <button disabled={pageNumber <= 1} onClick={() => setPageNumber(p => p - 1)} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 rounded-full transition-colors">
                                <ArrowRight className="rotate-180" size={20} />
                            </button>
                            <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md">
                                {pageNumber} / {numPages}
                            </span>
                            <button disabled={pageNumber >= numPages} onClick={() => setPageNumber(p => p + 1)} className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 rounded-full transition-colors">
                                <ArrowRight size={20} />
                            </button>
                        </div>
                    )}
                </div>
            </main>

            {/* Mobile Sidebar Overlay */}
            <div 
                className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] md:hidden transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                onClick={() => setIsMobileSidebarOpen(false)}
            />

            {/* Mobile Sidebar Drawer */}
            <div className={`
                fixed inset-y-0 right-0 w-[85%] sm:w-80 bg-white shadow-2xl z-[110] md:hidden 
                transition-transform duration-300 ease-in-out flex flex-col
                ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full'}
            `}>
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                    <h2 className="font-bold text-lg text-slate-800">Menu</h2>
                    <button onClick={() => setIsMobileSidebarOpen(false)} className="p-2 text-slate-400 hover:bg-slate-100 rounded-lg transition-colors">
                        <X size={20} />
                    </button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-4 space-y-6">
                    {/* Status Card (moved from sticky header) */}
                    <div className="bg-indigo-50/50 p-4 rounded-xl border border-indigo-100/50">
                        <h3 className="font-bold text-indigo-900 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                             <PenTool size={16} /> My Status
                        </h3>
                        <p className="text-sm text-slate-600 mb-3 leading-relaxed">
                            Welcome, <span className="font-semibold text-slate-900">{signerInfo.name}</span>.
                            {guestRole === 'Approver' 
                                ? " Please review and approve."
                                : guestRole === 'Viewer' 
                                ? " You have read-only access." 
                                : " Click anywhere to sign."}
                        </p>
                        <div className="inline-block px-3 py-1 bg-white rounded-lg text-xs font-bold text-indigo-600 border border-indigo-100 shadow-sm">
                            Role: {guestRole}
                        </div>
                    </div>

                    {/* Document Info */}
                    <div>
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Document Details</h3>
                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 space-y-3">
                            <div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Filename</div>
                                <div className="font-medium text-slate-800 text-sm break-all">{docData.filename}</div>
                            </div>
                            <div>
                                <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">Status</div>
                                <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide border ${
                                    docData.status === 'Signed' ? 'bg-green-100 text-green-700 border-green-200' :
                                    docData.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200' :
                                    'bg-amber-100 text-amber-700 border-amber-200'
                                }`}>
                                    {docData.status}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Quick Actions if any */}
                    {docData.status === 'Pending' && (
                       <div>
                           <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">Actions</h3>
                           <button 
                               onClick={() => {
                                   setIsMobileSidebarOpen(false);
                                   handleReject();
                               }}
                               className="w-full flex items-center justify-center gap-2 px-4 py-3 text-red-600 bg-red-50 hover:bg-red-100 rounded-xl transition-all text-sm font-bold border border-red-100"
                           >
                               <X size={16} /> Reject Document
                           </button>
                       </div>
                   )}
                </div>
                
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-xs text-slate-400 text-center">
                    <div className="flex items-center justify-center gap-1 mb-1">
                        <Shield size={12} /> Secure Signing
                    </div>
                    IP Tracked for Security
                </div>
            </div>
            
            <footer className="bg-white border-t border-slate-100 px-6 py-3 flex items-center justify-between text-xs text-slate-400 font-medium">
                <div className="flex items-center gap-1">
                    <Shield size={12} className="text-indigo-400" />
                    Powered by Labmentix SecureSign
                </div>
                <div className="flex items-center gap-2"><AlertCircle size={14} /> IP Tracked for Security</div>
            </footer>
        </div>
    );
};

export default GuestSign;
