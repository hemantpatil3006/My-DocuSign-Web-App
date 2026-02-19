import React, { useEffect, useState, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Document, Page, pdfjs } from 'react-pdf';
import { DndContext, useDraggable, MouseSensor, TouchSensor, useSensor, useSensors, PointerSensor } from '@dnd-kit/core';
import api from '../services/api';
import SignatureModal from '../components/SignatureModal';
import ShareModal from '../components/ShareModal';
import { Save, FileCheck, History, ArrowLeft, Plus, X, Trash2, Share2, Download, AlertCircle, Shield, PenTool, Loader2, UserPlus, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import ThemeToggle from '../components/ThemeToggle';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const DraggableSignature = ({ sig, pageNumber, onDelete, isReadOnly, onEdit, onResize }) => {
    const { attributes, listeners, setNodeRef, transform } = useDraggable({
        id: sig.id,
        disabled: isReadOnly,
    });
    
    const [localDim, setLocalDim] = useState({ width: sig.width, height: sig.height });
    const isResizing = useRef(false);
    const dimsRef = useRef({ width: sig.width, height: sig.height });

    useEffect(() => {
        setLocalDim({ width: sig.width, height: sig.height });
        dimsRef.current = { width: sig.width, height: sig.height };
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
            className={`absolute group z-50 transition-colors pointer-events-auto ${
                isReadOnly 
                ? 'pointer-events-none' 
                : 'border-2 border-dashed border-indigo-400/50 hover:border-indigo-600 bg-indigo-50/10 hover:bg-indigo-50/30'
            }`}
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
                    <div className="w-full h-full flex items-center justify-center text-indigo-600 text-[10px] font-bold text-center pointer-events-none uppercase tracking-wider">
                        Place Here
                    </div>
                )}

                {!isReadOnly && (
                    <>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDelete(sig.id);
                            }}
                            onMouseDown={(e) => e.stopPropagation()}
                            onTouchStart={(e) => e.stopPropagation()}
                            className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg dark:shadow-none hover:bg-red-600 transition-colors z-[60] scale-0 group-hover:scale-100 transition-transform"
                            title="Delete"
                        >
                            <X size={12} strokeWidth={3} />
                        </button>

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

const DocumentView = () => {
    const { id } = useParams();
    const [document, setDocument] = useState(null);
    const [error, setError] = useState(null);
    const [numPages, setNumPages] = useState(null);
    const [signatures, setSignatures] = useState([]);
    const [pageNumber, setPageNumber] = useState(1);
    const [pdfWidth, setPdfWidth] = useState(800);
    const [renderedPageHeight, setRenderedPageHeight] = useState(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [currentSignatureId, setCurrentSignatureId] = useState(null);
    const [auditLogs, setAuditLogs] = useState([]);
    const [isFinalizing, setIsFinalizing] = useState(false);
    const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState(false);
    const [mobileTab, setMobileTab] = useState('signatories'); // 'signatories' | 'audit'
    
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

    const [isDraggingOver, setIsDraggingOver] = useState(false);

    const handleDragEnd = async (event) => {
        const { active, delta } = event;
        if (!active) return;

        const sig = signatures.find(s => s.id === active.id);
        if (!sig) return;

        // Calculate final positions based on current render scale
        const newX = sig.x + delta.x;
        const newY = sig.y + delta.y;

        const actualWidth = pdfContentRef.current.offsetWidth || pdfWidth;
        const actualHeight = renderedPageHeight || pdfContentRef.current.offsetHeight;

        // Ensure signature stays within document bounds
        const clampedX = Math.max(0, Math.min(newX, actualWidth - sig.width));
        const clampedY = Math.max(0, Math.min(newY, actualHeight - sig.height));

        // Update local state immediately for visual snappiness
        setSignatures(prev => prev.map(s => 
            s.id === sig.id ? { ...s, x: clampedX, y: clampedY } : s
        ));

        // Sync normalized coordinates (800px base) to backend
        try {
            const scale = 800 / actualWidth;
            const normalizedX = clampedX * scale;
            const normalizedY = clampedY * scale;

            // Extract real ID if it's a combined temp/real ID string
            const cleanId = sig.id.toString().split('base64')[0].substring(0, 24);
            await api.put(`/signatures/${cleanId}`, {
                x: normalizedX,
                y: normalizedY,
                page: pageNumber
            });
        } catch (error) {
            console.error('Position sync error:', error);
        }
    };

    const getFileUrl = () => {
        if (!document) return null;
        const relativeUrl = document.status === 'Signed' && document.signedUrl ? document.signedUrl : document.originalUrl;
        const encodedPath = relativeUrl.split('/').map(part => encodeURIComponent(part)).join('/');
        return `${import.meta.env.VITE_BASE_URL || 'http://localhost:5001'}/${encodedPath}`;
    };

    const fetchDoc = async () => {
        try {
            const res = await api.get(`/docs/${id}`);
            setDocument(res.data);
        } catch (error) {
            console.error('Error fetching document:', error);
            setError(error.response?.data?.message || error.message || 'Failed to load document');
        }
    };

    const fetchAuditLogs = async () => {
        try {
            const res = await api.get(`/audit/${id}`);
            setAuditLogs(res.data);
        } catch (error) {
            console.error('Error fetching audit logs:', error);
        }
    };

    const fetchSignatures = async (currentWidth = pdfWidth) => {
        try {
            const res = await api.get(`/signatures/${id}`);
            const scale = currentWidth / 800;
            
            const mappedSigs = res.data.map(s => {
                const clampedX = Math.max(0, Math.min(s.x, 800));
                const clampedY = Math.max(0, Math.min(s.y, 2000));
                
                return {
                    ...s,
                    id: s._id,
                    page: s.page,
                    x: clampedX * scale,
                    y: clampedY * scale,
                    width: (s.width || 150) * scale,
                    height: (s.height || 60) * scale,
                    signatureData: s.signatureData
                };
            });
            setSignatures(mappedSigs);
        } catch (error) {
            console.error('Error fetching signatures:', error);
        }
    };

    const updatePdfWidth = () => {
        if (pdfWrapperRef.current) {
            const wrapperWidth = pdfWrapperRef.current.offsetWidth;
            const padding = window.innerWidth < 768 ? 32 : 64; // p-4 vs p-8
            const availableWidth = wrapperWidth - padding;
            const newWidth = Math.min(availableWidth, 1000); // Max width limit for large screens
            setPdfWidth(newWidth);
        }
    };

    useEffect(() => {
        updatePdfWidth();
        window.addEventListener('resize', updatePdfWidth);
        return () => window.removeEventListener('resize', updatePdfWidth);
    }, []);

    // Re-fetch/re-scale signatures when width changes
    useEffect(() => {
        if (id) fetchSignatures(pdfWidth);
    }, [pdfWidth, id]);

    const activeInvitation = document?.invitations?.find(inv => {
        const isPending = inv.status === 'Pending';
        // Fallback check if virtual isn't perfectly delivered
        const isExpired = inv.isExpired || (inv.expiresAt && new Date(inv.expiresAt) < new Date());
        return isPending && !isExpired;
    });

    useEffect(() => {
        fetchDoc();
        fetchAuditLogs();
        fetchSignatures();
    }, [id]);

    useEffect(() => {
        if (pdfWidth && document) {
            fetchSignatures(pdfWidth);
        }
    }, [pdfWidth]);

    const onDocumentLoadSuccess = ({ numPages }) => {
        setNumPages(numPages);
    };

    const onPageLoadSuccess = (page) => {
        const { height } = page;
        if (height > 0) {
            setRenderedPageHeight(height);
        }
    };

    const handleDragStartSource = (e) => {
        e.dataTransfer.setData('text/plain', 'signature');
    };

    const handleDragOver = (e) => {
        if (document.status !== 'Pending') return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'copy';
    };

    const createSignatureAt = async (clientX, clientY) => {
        if (!pdfContentRef.current) return;
        
        const rect = pdfContentRef.current.getBoundingClientRect();
        const mouseX = clientX - rect.left;
        const mouseY = clientY - rect.top;
        
        // Calculate actual dimensions for clamping
        const actualWidth = pdfContentRef.current.offsetWidth || pdfWidth;
        const actualHeight = renderedPageHeight || pdfContentRef.current.offsetHeight;

        // Center the 150x60 signature on the click coordinate for "Exactly where I place" feel
        // Clamp to stay within the rendered PDF page area
        const x = Math.max(0, Math.min(mouseX - 75, actualWidth - 150)); 
        const y = Math.max(0, Math.min(mouseY - 30, actualHeight - 60));  

        const scale = 800 / actualWidth;
        const normalizedX = x * scale;
        const normalizedY = y * scale;
        const normalizedWidth = 150 * scale;
        const normalizedHeight = 60 * scale;

        // Create new signature always (allow multiple)
        const userEmail = document.owner?.email || '';
        const ownerId = document.owner?._id || document.owner;
        const tempId = 'temp-' + Date.now();
        const newSig = {
            id: tempId,
            x,
            y,
            page: pageNumber,
            width: 150,
            height: 60,
            signatureData: null,
            user: ownerId,
            signerEmail: userEmail // Store for consistent matching
        };
        
        setSignatures(prev => [...prev, newSig]);
        setCurrentSignatureId(tempId);

        try {
            const res = await api.post('/signatures', {
                documentId: id,
                page: pageNumber,
                x: normalizedX,
                y: normalizedY,
                width: normalizedWidth,
                height: normalizedHeight,
                signatureData: null,
                signerEmail: userEmail // Pass current user email for backend sync
            });
            
            const realId = res.data._id.toString();
            const realSig = { ...res.data, id: realId, x, y, width: 150, height: 60, user: ownerId };

            setSignatures(prev => {
                const otherSigs = prev.filter(s => s.id !== tempId && s.id !== realId);
                return [...otherSigs, realSig];
            });
            
            setCurrentSignatureId(realId);
            setIsModalOpen(true);
            fetchAuditLogs();
        } catch (error) {
            console.error('Error saving new signature:', error);
            setSignatures(prev => prev.filter(s => s.id !== tempId));
        }
    };

    const handleDrop = async (e) => {
        if (document.status !== 'Pending') return;
        e.preventDefault();
        setIsDraggingOver(false);
        console.log('Drop event captured at:', e.clientX, e.clientY);
        createSignatureAt(e.clientX, e.clientY);
    };
    
    const handleSaveSignature = async (dataUrl) => {
        if (!currentSignatureId) return;

        // Optimistic update
        setSignatures(prev => prev.map(sig => 
            sig.id === currentSignatureId ? { ...sig, signatureData: dataUrl } : sig
        ));
        setIsModalOpen(false);
        
        try {
            const cleanId = currentSignatureId.toString().split('base64')[0].substring(0, 24);
            await api.put(`/signatures/${cleanId}`, {
                signatureData: dataUrl
            });
            fetchAuditLogs();
        } catch (error) {
            console.error('Error saving signature data:', error);
            toast.error('Failed to save signature');
            fetchSignatures(); 
        }
    };
    
    const finalizeDocument = async () => {
        setIsFinalizing(true);
        const loadToast = toast.loading('Finalizing document...');
        try {
            await api.post('/signatures/finalize', { documentId: id });
            toast.success('Document finalized!', { id: loadToast });
            window.location.reload();
        } catch (error) {
            console.error('Error finalizing:', error);
            toast.error(error.response?.data?.message || 'Failed to finalize document', { id: loadToast });
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleDownload = async () => {
        try {
            const response = await api.get(`/docs/download/${id}`, {
                responseType: 'blob'
            });

            const blob = new Blob([response.data], { type: 'application/pdf' });
            const url = window.URL.createObjectURL(blob);
            const link = window.document.createElement('a');
            link.href = url;
            
            const filename = document.status === 'Signed' 
                ? `signed-${document.filename}` 
                : document.filename;
            
            link.setAttribute('download', filename);
            window.document.body.appendChild(link);
            link.click();
            
            link.parentNode.removeChild(link);
            window.URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Download error:', error);
            toast.error('Failed to download document');
        }
    };

    useEffect(() => {
        const updateWidth = () => {
             if (pdfWrapperRef.current) {
                const width = pdfWrapperRef.current.clientWidth;
                // Enforce minimum width of 600px for legibility on mobile, max 1000px for desktop
                // This ensures horizontal scrolling appears on small screens instead of crushing the PDF
                const targetWidth = Math.max(width - 32, 600);
                setPdfWidth(Math.min(targetWidth, 1200));
             }
        };
        
        updateWidth();
        window.addEventListener('resize', updateWidth);

        return () => window.removeEventListener('resize', updateWidth);
    }, [pageNumber]);

    const [isShareModalOpen, setIsShareModalOpen] = useState(false);

    const handleShare = () => {
        setIsShareModalOpen(true);
    };

    const handleReject = async () => {
        if (!window.confirm('Are you sure you want to reject this document?')) return;
        try {
            await api.post(`/docs/reject/${id}`);
            setDocument(prev => ({ ...prev, status: 'Rejected' }));
            fetchAuditLogs();
        } catch (error) {
            console.error('Error rejecting:', error);
            alert('Failed to reject document');
        }
    };

    if (error) {
        return (
            <div className="min-h-screen bg-red-50 text-red-600 p-4 flex flex-col items-center justify-center">
                <AlertCircle size={48} className="mb-4" />
                <h2 className="text-xl font-bold mb-2">Error Loading Document</h2>
                <p className="font-mono text-sm bg-red-100 p-3 rounded">{error}</p>
                <button onClick={() => window.location.reload()} className="mt-6 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-bold">
                    Retry
                </button>
            </div>
        );
    }

    const handleResize = async (id, newWidth, newHeight) => {
        // 1. Optimistic Update
        setSignatures(prev => prev.map(s => 
            s.id === id ? { ...s, width: newWidth, height: newHeight } : s
        ));
        
        // 2. API Update
        try {
            const cleanId = id.toString().split('base64')[0].substring(0, 24);
            // Don't update temp signatures on backend yet
            if (!id.toString().startsWith('temp-')) {
                 await api.put(`/signatures/${cleanId}`, {
                    width: newWidth,
                    height: newHeight
                });
            }
        } catch (error) {
            console.error('Error resizing signature:', error);
            toast.error('Failed to save resize');
            // Revert? simpler to just warn for now
        }
    };

    if (!document) return (
        <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center gap-4">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <p className="text-slate-500 font-medium">Loading Document...</p>
        </div>
    );



    return (
        <div className="h-screen bg-slate-50 dark:bg-slate-950 font-sans flex flex-col transition-colors duration-300">
            <SignatureModal 
                isOpen={isModalOpen} 
                onClose={() => setIsModalOpen(false)} 
                onSave={handleSaveSignature}
                signerName={document?.owner?.name || ''}
            />

            <ShareModal 
                isOpen={isShareModalOpen} 
                onClose={() => setIsShareModalOpen(false)} 
                documentId={id} 
                documentName={document.filename}
                onSuccess={() => {
                    fetchDoc();
                    fetchAuditLogs();
                    fetchSignatures();
                }}
            />

            <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 shadow-sm z-30 p-2 md:p-4 flex justify-between items-center shrink-0 sticky top-0 transition-colors duration-300">
                <div className="flex items-center gap-1 md:gap-3 min-w-0">
                    <button 
                        onClick={() => window.location.href = '/dashboard'}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full transition-colors text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 shrink-0"
                        title="Back to Dashboard"
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div className="flex flex-col min-w-0">
                        <h1 className="text-xs md:text-lg font-bold text-slate-800 dark:text-slate-100 truncate max-w-[100px] md:max-w-md" title={document.filename}>{document.filename}</h1>
                        <div className="flex items-center gap-2">
                             <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider font-bold border ${
                                document.status === 'Signed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' : 
                                (document.status === 'Rejected' && (!document.invitations || document.invitations.length === 0)) ? 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800' :
                                document.status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' : 
                                'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                            }`}>
                                {(document.status === 'Rejected' && (!document.invitations || document.invitations.length === 0)) ? 'Pending' : document.status}
                            </span>
                        </div>
                    </div>
                </div>
                
                <div className="flex items-center gap-2 md:gap-3 shrink-0 ml-2">
                    <ThemeToggle />
                    {(document.status === 'Pending' || (document.status === 'Rejected' && (!document.invitations || document.invitations.length === 0))) && (
                        <>
                            {!activeInvitation ? (
                                <>
                                    <button 
                                        onClick={handleShare} 
                                        className="hidden md:flex items-center gap-2 px-3 py-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors text-sm font-bold border border-indigo-200"
                                        title="Invite Guests"
                                    >
                                        <UserPlus size={16} /> Invite Guest
                                    </button>
                                    <button 
                                        onClick={handleShare} 
                                        className="md:hidden p-2 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors border border-indigo-200"
                                        title="Share for Signing"
                                    >
                                        <Share2 size={18} />
                                    </button>
                                    <div 
                                        draggable
                                        onDragStart={handleDragStartSource}
                                        className="hidden md:flex items-center cursor-move bg-indigo-50 text-indigo-700 px-3 py-2 rounded-lg border border-indigo-200 hover:bg-indigo-100 transition-colors text-sm font-bold select-none"
                                        title="Drag to place signature"
                                    >
                                        <PenTool size={14} className="mr-2" /> Drag Signature
                                    </div>
                                    <button 
                                        onClick={() => {
                                            // Place signature in center of visible view for mobile
                                            if (pdfContentRef.current && pdfWrapperRef.current) {
                                                const rect = pdfContentRef.current.getBoundingClientRect();
                                                const wrapperRect = pdfWrapperRef.current.getBoundingClientRect();
                                                
                                                // Center of wrapper relative to viewport
                                                const centerX = wrapperRect.left + wrapperRect.width / 2;
                                                const centerY = wrapperRect.top + wrapperRect.height / 2;
                                                
                                                // Ensure placement starts within bounds
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
                                    <button 
                                        onClick={handleReject} 
                                        className="hidden md:flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50/50 hover:bg-red-50 rounded-lg transition-all text-sm font-bold border border-red-100 active:scale-[0.98]"
                                        title="Reject Document"
                                    >
                                        <X size={16} /> Reject
                                    </button>
                                    <button
                                        onClick={finalizeDocument}
                                        disabled={isFinalizing}
                                        className="flex items-center bg-green-600 text-white px-3 md:px-4 py-2 rounded-lg hover:bg-green-700 transition-all text-xs md:text-sm font-bold shadow-lg shadow-green-200 dark:shadow-none active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed"
                                    >
                                        {isFinalizing ? (
                                            <>
                                                <Loader2 size={14} className="mr-1 md:mr-2 animate-spin" />
                                                <span className="hidden sm:inline">Processing...</span>
                                                <span className="sm:hidden">...</span>
                                            </>
                                        ) : (
                                            <>
                                                <FileCheck size={14} className="mr-1 md:mr-2" />
                                                Finish
                                            </>
                                        )}
                                    </button>
                                </>
                            ) : (
                                <div className="flex flex-col items-end">
                                    {/* Desktop Full Badge */}
                                    <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 text-[11px] font-bold">
                                        <Clock size={14} className="animate-pulse" />
                                        <span>GUEST SESSION ACTIVE</span>
                                    </div>
                                    <span className="hidden md:block text-[9px] text-slate-400 mt-1 mr-1">Owner actions locked until guest signs</span>
                                    
                                    {/* Mobile Compact Badge */}
                                    <div className="md:hidden flex items-center gap-1.5 px-2 py-1 bg-amber-50 text-amber-600 rounded-lg border border-amber-100 text-[10px] font-bold">
                                         <Clock size={12} className="animate-pulse" />
                                         <span>Guest Active</span>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                    {document.status === 'Signed' && (
                        <div className="flex items-center gap-2">
                             <Link to="/dashboard" className="hidden md:flex items-center px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-sm font-bold transition-colors">
                                <Plus size={16} className="mr-2" /> New
                            </Link>
                            <button 
                                onClick={handleDownload}
                                className="hidden md:flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none text-sm font-bold transition-all active:scale-[0.98]"
                            >
                                <Download size={16} className="mr-2" /> Download
                            </button>
                            <button 
                                onClick={handleDownload}
                                className="md:hidden p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98]"
                                title="Download"
                            >
                                <Download size={20} />
                            </button>
                        </div>
                    )}
                    
                    {document.status === 'Pending' && signatures.length > 0 && !activeInvitation && (
                        <button 
                            onClick={async (e) => {
                                e.stopPropagation();
                                if (window.confirm('Delete all your signatures and start over?')) {
                                    try {
                                        await api.delete(`/signatures/all/${id}`);
                                        setSignatures([]);
                                        fetchAuditLogs();
                                    } catch (e) {
                                        console.error(e);
                                        toast.error('Failed to clear signatures');
                                    }
                                }
                            }}
                            className="p-2 text-red-500 hover:bg-red-50 rounded-lg transition-colors border border-red-100 md:hidden"
                            title="Clear All Signatures"
                        >
                            <Trash2 size={20} />
                        </button>
                    )}

                    <button 
                        onClick={() => setIsMobileSidebarOpen(true)}
                        className="lg:hidden p-2 hover:bg-slate-100 rounded-lg transition-colors text-slate-500"
                        title="Show Details"
                    >
                        <History size={20} />
                    </button>
                </div>
            </div>

            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative">
                
                <div className="flex-1 overflow-auto p-4 md:p-8 relative touch-pan-x touch-pan-y scroll-smooth bg-slate-100/50 dark:bg-slate-900/50 transition-colors duration-300" ref={pdfWrapperRef}>
                    <div 
                        className="relative mx-auto shadow-[0_20px_50px_rgba(0,0,0,0.08)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.3)] rounded-lg overflow-visible bg-white dark:bg-slate-800 mb-8 md:mb-32 w-fit border border-slate-200/50 dark:border-slate-700 transition-shadow hover:shadow-[0_25px_60px_rgba(0,0,0,0.12)]" 
                        ref={pdfContentRef}
                    >
                        <Document
                            file={getFileUrl()}
                            onLoadSuccess={onDocumentLoadSuccess}
                            onLoadError={(error) => console.error('PDF Load Error:', error)}
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
                                    onLoadSuccess={(page) => {
                                        onPageLoadSuccess(page);
                                    }}
                                    renderTextLayer={false}
                                    renderAnnotationLayer={false}
                                />

                                <div 
                                    className={`absolute inset-0 z-[45] transition-all duration-300 pointer-events-auto ${
                                        document.status === 'Pending' && !activeInvitation
                                        ? `cursor-crosshair ${isDraggingOver ? 'bg-indigo-500/20 ring-4 ring-indigo-500/50 ring-inset' : 'hover:bg-indigo-500/5'}` 
                                        : 'cursor-not-allowed opacity-0'
                                    }`}
                                    onDragOver={handleDragOver}
                                    onDragEnter={() => document.status === 'Pending' && setIsDraggingOver(true)}
                                    onDragLeave={() => setIsDraggingOver(false)}
                                    onDrop={handleDrop}
                                    onClick={(e) => {
                                        if (document.status === 'Pending' && !isModalOpen) {
                                            createSignatureAt(e.clientX, e.clientY);
                                        }
                                    }}
                                />
                                
                                <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
                                    <div className="absolute inset-0 z-[50] pointer-events-none overflow-hidden">
                                        <div className="pointer-events-none w-full h-full relative">
                                            {document.status !== 'Signed' && signatures.filter(s => Number(s.page) === Number(pageNumber)).map((sig) => (
                                                <DraggableSignature 
                                                    key={sig.id} 
                                                    sig={sig} 
                                                    pageNumber={pageNumber}
                                                    isReadOnly={document.status !== 'Pending' || !!activeInvitation}
                                                    onResize={handleResize}
                                                    onDelete={(id) => {
                                                        if (activeInvitation) return;
                                                        const cleanId = id.toString().split('base64')[0].substring(0, 24);
                                                        api.delete(`/signatures/${cleanId}`).then(() => fetchSignatures());
                                                    }}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                </DndContext>
                            </div>
                        </Document>

                        {document.status === 'Pending' && signatures.length > 0 && !activeInvitation && (
                            <button 
                                onClick={async (e) => {
                                    e.stopPropagation();
                                    if (window.confirm('Delete all your signatures and start over?')) {
                                        try {
                                            await api.delete(`/signatures/all/${id}`);
                                            setSignatures([]);
                                            fetchAuditLogs();
                                        } catch (e) {
                                            console.error(e);
                                            toast.error('Failed to clear signatures');
                                        }
                                    }
                                }}
                                className="absolute top-4 right-4 z-[60] flex items-center gap-2 px-3 py-2 bg-white/90 backdrop-blur-sm border-2 border-red-500 text-red-600 rounded-xl hover:bg-red-500 hover:text-white transition-all font-bold shadow-lg dark:shadow-none text-xs uppercase tracking-wider"
                            >
                                <X size={14} strokeWidth={3} /> Clear All
                            </button>
                        )}
                    </div>
                </div>

                <div 
                    className={`fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-[100] lg:hidden transition-opacity duration-300 ${isMobileSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
                    onClick={() => setIsMobileSidebarOpen(false)}
                />

                <div className={`
                    bg-white border-t lg:border-t-0 lg:border-l border-slate-200 flex flex-col shadow-[-4px_0_20px_rgba(0,0,0,0.02)] z-[110] lg:z-20 shrink-0 
                    fixed lg:relative inset-y-0 right-0 w-[85%] sm:w-80 lg:w-80 h-full 
                    transition-transform duration-300 ease-in-out
                    ${isMobileSidebarOpen ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'}
                `}>
                    {/* Mobile Header for Sidebar */}
                    <div className="lg:hidden px-4 py-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex bg-slate-100 p-1 rounded-lg w-full">
                            <button 
                                onClick={() => setMobileTab('signatories')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mobileTab === 'signatories' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Signatories
                            </button>
                            <button 
                                onClick={() => setMobileTab('audit')}
                                className={`flex-1 py-1.5 text-xs font-bold rounded-md transition-all ${mobileTab === 'audit' ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'}`}
                            >
                                Audit Trail
                            </button>
                        </div>
                        <button onClick={() => setIsMobileSidebarOpen(false)} className="ml-4 p-2 text-slate-400 hover:text-slate-600">
                            <X size={20} />
                        </button>
                    </div>
                    {/* Signatory Status Section */}
                    <div className={`flex flex-col border-b border-slate-100 overflow-hidden ${mobileTab !== 'signatories' && 'hidden lg:flex'}`}>
                        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-2 sticky top-0 z-10">
                            <UserPlus size={16} className="text-slate-400" />
                            <h2 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Signatory Status</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3">
                            {!document.invitations || document.invitations.length === 0 ? (
                                <p className="text-slate-400 text-sm italic text-center py-4">No guests invited yet.</p>
                            ) : (
                                document.invitations.map((inv, idx) => {
                                    const isCompleted = inv.status === 'Completed' || document.signatures?.some(s => s.signerEmail === inv.email && s.signatureData);
                                    const isRejected = inv.status === 'Rejected';
                                    const isExpired = inv.isExpired && !isCompleted && !isRejected;
                                    
                                    return (
                                        <div key={idx} className={`bg-slate-50/50 border rounded-xl p-3 flex flex-col gap-2 ${isExpired ? 'border-red-100 opacity-80' : 'border-slate-100'} transition-all hover:bg-white group`}>
                                            <div className="flex justify-between items-start">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-slate-800 truncate max-w-[140px]">{inv.name}</span>
                                                    <span className="text-[10px] text-slate-400 font-medium truncate max-w-[140px]">{inv.email}</span>
                                                </div>
                                                <div className="flex flex-col items-end gap-1">
                                                    <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tighter border ${
                                                        isCompleted ? 'bg-green-50 text-green-700 border-green-100' : 
                                                        isRejected ? 'bg-red-50 text-red-700 border-red-100' :
                                                        isExpired ? 'bg-red-50 text-red-700 border-red-100' :
                                                        'bg-amber-50 text-amber-600 border-amber-100'
                                                    }`}>
                                                        {isRejected ? 'REJECTED' : isExpired ? 'EXPIRED' : inv.role}
                                                    </span>
                                                </div>
                                            </div>
                                            <div className="flex items-center justify-between mt-1">
                                                <div className={`flex items-center gap-1.5 text-[10px] font-bold ${
                                                    isCompleted ? 'text-green-600' : 
                                                    isRejected ? 'text-red-600' :
                                                    isExpired ? 'text-red-500' : 
                                                    'text-amber-500'
                                                }`}>
                                                    {isCompleted ? <CheckCircle size={12} /> : isRejected ? <X size={12} /> : isExpired ? <AlertCircle size={12} /> : <Clock size={12} />}
                                                    {isCompleted ? 'Action Completed' : isRejected ? 'Document Rejected' : isExpired ? 'Invitation Expired' : 'Pending Action'}
                                                </div>
                                                
                                                {!isCompleted && (
                                                    <div className="flex gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-opacity">
                                                        {inv.status === 'Pending' && inv.token && (
                                                            <button 
                                                                onClick={() => {
                                                                    const link = `${window.location.origin}/sign/${inv.token}`;
                                                                    navigator.clipboard.writeText(link);
                                                                    toast.success('Guest link copied!');
                                                                }}
                                                                title="Copy Link"
                                                                className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors border border-indigo-100 bg-white"
                                                            >
                                                                <Share2 size={12} />
                                                            </button>
                                                        )}
                                                        <button 
                                                            onClick={async () => {
                                                                if (!window.confirm(`Revoke invitation for ${inv.name}?`)) return;
                                                                try {
                                                                    await api.delete(`/docs/invite/${inv._id}`);
                                                                    toast.success('Invitation revoked');
                                                                    fetchDoc();
                                                                } catch (err) {
                                                                    console.error(err);
                                                                    toast.error('Failed to revoke invitation');
                                                                }
                                                            }}
                                                            title="Revoke Invitation"
                                                            className="p-1.5 text-red-600 hover:bg-red-50 rounded-md transition-colors border border-red-100 bg-white"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    </div>

                    {/* Audit Trail Section */}
                    <div className={`flex flex-col flex-1 overflow-hidden ${mobileTab !== 'audit' && 'hidden lg:flex'}`}>
                        <div className="bg-slate-50 border-b border-slate-100 px-4 py-3 flex items-center gap-2 sticky top-0 z-10">
                            <History size={16} className="text-slate-400" />
                            <h2 className="font-bold text-slate-700 text-xs uppercase tracking-wide">Audit Trail</h2>
                        </div>
                        <div className="flex-1 overflow-y-auto p-5 space-y-6">
                            {auditLogs.length === 0 ? (
                                <div className="text-center py-10">
                                    <p className="text-slate-400 text-sm italic">No activity recorded yet.</p>
                                </div>
                            ) : (
                                auditLogs.map((log) => (
                                    <div key={log._id} className="relative pl-5 border-l-2 border-indigo-100 last:border-transparent pb-1">
                                        <div className="absolute -left-[5px] top-1.5 w-2.5 h-2.5 rounded-full bg-indigo-500 ring-4 ring-white shadow-sm"></div>
                                        <div className="flex flex-col">
                                            <span className="font-bold text-xs text-indigo-700 uppercase mb-0.5 tracking-wider">{log.action}</span>
                                            <span className="text-[10px] text-slate-400 font-medium mb-1">{new Date(log.createdAt).toLocaleString()}</span>
                                            <p className="text-xs text-slate-600 truncate max-w-[200px] font-medium">
                                                by <span className="text-slate-900" title={log.userEmail}>
                                                    {log.signerName || log.user?.name || log.userEmail || 'Guest'}
                                                </span>
                                            </p>
                                            <p className="text-[10px] text-slate-400 mt-1 font-mono bg-slate-50 inline-block px-1 rounded w-fit">IP: {log.ipAddress}</p>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>

            </div>

             {/* Footer / Pagination */}
            {numPages && (
                 <div className="bg-white border-t border-slate-200 px-4 py-3 flex justify-center items-center gap-4 z-30 shrink-0">
                    <button 
                        disabled={pageNumber <= 1} 
                        onClick={() => setPageNumber(p => p - 1)}
                        className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 rounded-full transition-colors"
                    >
                        <ArrowLeft size={18} />
                    </button>
                    <span className="text-sm font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-md min-w-[3rem] text-center">
                        {pageNumber} / {numPages}
                    </span>
                    <button 
                        disabled={pageNumber >= numPages} 
                        onClick={() => setPageNumber(p => p + 1)}
                        className="p-2 text-slate-500 hover:bg-slate-100 hover:text-indigo-600 disabled:opacity-30 rounded-full transition-colors"
                    >
                         <ArrowLeft className="rotate-180" size={18} />
                    </button>
                </div>
            )}
        </div>
    );
};

export default DocumentView;
