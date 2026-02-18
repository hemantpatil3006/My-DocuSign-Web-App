import React, { useRef, useState, useEffect } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import { X, Check, Trash2, PenTool, Type, Loader2, Calendar, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';

const SignatureModal = ({ isOpen, onClose, onSave, signerName = '' }) => {
    const sigCanvas = useRef(null);
    const containerRef = useRef(null);
    const [activeTab, setActiveTab] = useState('draw'); // 'draw' | 'type' | 'date' | 'place'
    const [typedName, setTypedName] = useState(signerName);
    const [selectedFont, setSelectedFont] = useState('Dancing Script');
    const [includeDetails, setIncludeDetails] = useState(false);
    const [location, setLocation] = useState('');
    const [dateValue, setDateValue] = useState(new Date().toISOString().split('T')[0]);

    useEffect(() => {
        if (isOpen && signerName) {
            setTypedName(signerName);
        }
    }, [isOpen, signerName]);

    const fonts = [
        { name: 'Dancing Script', family: '"Dancing Script", cursive' },
        { name: 'Great Vibes', family: '"Great Vibes", cursive' },
        { name: 'Sacramento', family: '"Sacramento", cursive' },
        { name: 'Allura', family: '"Allura", cursive' },
        { name: 'Alex Brush', family: '"Alex Brush", cursive' },
        { name: 'Mrs Saint Delafield', family: '"Mrs Saint Delafield", cursive' },
        { name: 'Pinyon Script', family: '"Pinyon Script", cursive' },
        { name: 'Parisienne', family: '"Parisienne", cursive' },
        { name: 'Satisfy', family: '"Satisfy", cursive' },
        { name: 'Kaushan Script', family: '"Kaushan Script", cursive' },
        { name: 'Cookie', family: '"Cookie", cursive' },
        { name: 'Courgette', family: '"Courgette", cursive' },
        { name: 'Yellowtail', family: '"Yellowtail", cursive' },
        { name: 'Marck Script', family: '"Marck Script", cursive' },
        { name: 'Bad Script', family: '"Bad Script", cursive' },
        { name: 'Meddon', family: '"Meddon", cursive' },
        { name: 'Homemade Apple', family: '"Homemade Apple", cursive' },
        { name: 'La Belle Aurore', family: '"La Belle Aurore", cursive' },
    ];

    useEffect(() => {
        if (activeTab === 'draw' && isOpen) {
            const timer = setTimeout(() => {
                const canvas = sigCanvas.current?.getCanvas();
                const container = containerRef.current;
                
                if (canvas && container) {
                    const dpr = window.devicePixelRatio || 1;
                    const rect = container.getBoundingClientRect();
                    
                    // Set internal dimensions with scale factor
                    canvas.width = rect.width * dpr;
                    canvas.height = rect.height * dpr;
                    
                    // Scale context to match
                    const ctx = canvas.getContext('2d');
                    ctx.scale(dpr, dpr);
                    
                    // EXPLICIT SHADOW SUPPRESSION at initialization
                    ctx.shadowColor = 'transparent';
                    ctx.shadowBlur = 0;
                    ctx.shadowOffsetX = 0;
                    ctx.shadowOffsetY = 0;
                    ctx.clearRect(0, 0, rect.width, rect.height);
                    
                    // Ensure the canvas looks correct in the layout
                    canvas.style.width = `${rect.width}px`;
                    canvas.style.height = `${rect.height}px`;
                }
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [activeTab, isOpen]);

    if (!isOpen) return null;

    const clear = () => {
        if (sigCanvas.current) {
            sigCanvas.current.clear();
        }
    };

    const generateCompositeCanvas = (baseCanvasOrImage) => {
        // Create a temporary high-resolution canvas for the composite image
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        // Define dimensions (Standard size for signatures)
        canvas.width = 600;
        canvas.height = 300;

        const dpr = window.devicePixelRatio || 1;
        const width = 600 * dpr;
        // Base signature height + Details height
        const sigHeight = 80 * dpr; // Reduced from 100 to minimize gap
        const detailsHeight = 70 * dpr; // Tight fit for 2 lines of text
        const totalHeight = includeDetails ? sigHeight + detailsHeight : sigHeight;

        // Update canvas dimensions based on DPR and content
        canvas.width = width;
        canvas.height = totalHeight;
        
        // Clear
        ctx.clearRect(0, 0, width, totalHeight);
        ctx.shadowColor = 'transparent';

        // Draw Base Signature - Center it vertically in its section
        if (baseCanvasOrImage) {
            // Draw image centered in the top section
            // We can scale it to fit nicely if needed, but drawing 0,0 is fine if we just crop height
            ctx.drawImage(baseCanvasOrImage, 0, 0, width, sigHeight); 
        }

        // Draw Details if enabled
        if (includeDetails) {
            // Separator Line
            ctx.beginPath();
            ctx.moveTo(40 * dpr, sigHeight);
            ctx.lineTo(width - (40 * dpr), sigHeight);
            ctx.strokeStyle = '#e2e8f0'; // slate-200
            ctx.lineWidth = 1 * dpr;
            ctx.stroke();

            // Text Setup
            ctx.textAlign = 'center'; // CENTERED
            ctx.textBaseline = 'top';
            ctx.fillStyle = '#334155'; // slate-700
            
            // const padding = 30 * dpr; // No longer needed for x
            const lineHeight = 30 * dpr; // Compacting lines
            let currentY = sigHeight + (2 * dpr); // Minimal padding

            // Name
            ctx.font = `bold ${22 * dpr}px sans-serif`; // Slightly smaller for compactness
            ctx.fillText(`Digitally Signed by: ${typedName || 'Unknown'}`, width / 2, currentY);
            currentY += lineHeight;

            // Date & Time
            ctx.font = `${18 * dpr}px sans-serif`;
            const now = new Date();
            const dateStr = now.toLocaleDateString();
            const timeStr = now.toLocaleTimeString();
            ctx.fillText(`Date: ${dateStr} ${timeStr}`, width / 2, currentY);

            
            // Location id available (though typically location is separate tab, if we want it here we can add)
             if (location && activeTab === 'date') { 
                // Context specific logic
             }
        }
        
        return canvas.toDataURL('image/png');
    };
    
    const generateStampCanvas = (type) => {
        const dpr = window.devicePixelRatio || 1;
        const fontSize = 10;
        
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        
        const text = type === 'date' ? dateValue : (location || 'Location');
        
        // Measure with scaled font - using normal weight instead of bold
        ctx.font = `${fontSize * dpr}px sans-serif`;
        const metrics = ctx.measureText(text);
        
        const paddingX = 5 * dpr;
        const paddingY = 2 * dpr;
        
        const width = metrics.width + (paddingX * 2);
        const height = (fontSize * 1.2 * dpr) + (paddingY * 3); // Reduced from 1.5 to 1.2 for tighter height
        
        
        // Resize canvas to fit content
        canvas.width = width;
        canvas.height = height;
        
        // Context resets on resize, restore settings
        ctx.clearRect(0, 0, width, height);
        ctx.fillStyle = '#1e293b'; 
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.font = `${fontSize * dpr}px sans-serif`;
        
        ctx.fillText(text, width / 2, height / 2);

        return canvas.toDataURL('image/png');
    };

    const save = () => {
        if (activeTab === 'draw') {
             if (sigCanvas.current.isEmpty()) {
                toast.error('Please draw your signature first');
                return;
            }
            if (includeDetails && !typedName) {
                toast.error('Please enter your name for the digital signature details');
                return;
            }
            
            const rawCanvas = sigCanvas.current.getCanvas();
            const resultDataUrl = generateCompositeCanvas(rawCanvas);
            onSave(resultDataUrl);

        } else if (activeTab === 'type') {
            if (!typedName) {
                toast.error('Please type your name');
                return;
            }
            
            // Generate Text Signature Canvas
            const textCanvas = document.createElement('canvas');
            // High res for text
            textCanvas.width = 1200; 
            textCanvas.height = 400;
            const ctx = textCanvas.getContext('2d');
            
            ctx.clearRect(0, 0, textCanvas.width, textCanvas.height);
            ctx.font = `160px ${selectedFont}`; 
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(typedName, textCanvas.width / 2, textCanvas.height / 2);
            
            // Pass to composite generator if details needed, else just return
            if (includeDetails) {
                 const resultDataUrl = generateCompositeCanvas(textCanvas);
                 onSave(resultDataUrl);
            } else {
                 onSave(textCanvas.toDataURL('image/png'));
            }

        } else if (activeTab === 'date') {
            if (!dateValue) {
                toast.error('Please select a date');
                return;
            }
            onSave(generateStampCanvas('date'));
        } else if (activeTab === 'place') {
            if (!location) {
                toast.error('Please enter a location');
                return;
            }
            onSave(generateStampCanvas('place'));
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm transition-opacity p-4">
            <div className="w-full max-w-lg bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50 shrink-0">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100">Create Signature</h3>
                    <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                        <X size={20} />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex p-2 bg-slate-50 dark:bg-slate-800 m-4 mb-2 rounded-xl border border-slate-200 dark:border-slate-700 shrink-0 overflow-x-auto gap-1">
                    {['draw', 'type', 'date', 'place'].map(tab => (
                        <button 
                            key={tab}
                            className={`flex-1 min-w-[80px] flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-bold transition-all ${
                                activeTab === tab
                                ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm ring-1 ring-slate-200 dark:ring-slate-600' 
                                : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                            }`}
                            onClick={() => setActiveTab(tab)}
                        >
                            {tab === 'draw' && <PenTool size={16} />}
                            {tab === 'type' && <Type size={16} />}
                            {tab === 'date' && <Calendar size={16} />}
                            {tab === 'place' && <MapPin size={16} />}
                            <span className="capitalize">{tab}</span>
                        </button>
                    ))}
                </div>

                {/* Content */}
                <div className="px-6 pb-2 mb-2 flex-1 overflow-hidden flex flex-col">
                    {activeTab === 'draw' && (
                        <div className="flex flex-col h-full">
                            <div 
                                ref={containerRef}
                                className="relative rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 flex-1 min-h-[200px] overflow-hidden group hover:border-indigo-300 dark:hover:border-indigo-500/50 transition-colors"
                            >
                                <SignatureCanvas 
                                    ref={sigCanvas} 
                                    penColor={document.documentElement.classList.contains('dark') ? 'white' : 'black'} 
                                    minWidth={0.5}
                                    maxWidth={2.5}
                                    velocityFilterWeight={0.7}
                                    canvasProps={{ className: 'w-full h-full cursor-crosshair' }} 
                                    backgroundColor="rgba(0,0,0,0)"
                                />
                                <div className="absolute top-2 left-2 text-xs text-slate-400 dark:text-slate-500 pointer-events-none font-medium">Draw in the box above</div>
                                 <button 
                                    onClick={clear} 
                                    className="absolute bottom-3 right-3 bg-white dark:bg-slate-700 p-2 rounded-lg shadow-sm border border-slate-200 dark:border-slate-600 text-red-500 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 transition-colors"
                                    title="Clear Signature"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            
                            <div className="mt-4 flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30">
                                <input 
                                    type="checkbox" 
                                    id="includeDetailsDraw"
                                    checked={includeDetails}
                                    onChange={(e) => setIncludeDetails(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="includeDetailsDraw" className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer flex-1">
                                    Include Name, Date & Time status
                                </label>
                            </div>
                            
                            {includeDetails && (
                                <div className="mt-2 animate-slide-up">
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-1 block">Your Name</label>
                                    <input
                                        type="text"
                                        value={typedName}
                                        onChange={(e) => setTypedName(e.target.value)}
                                        placeholder="Enter your full name"
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-sm font-medium text-slate-800 dark:text-slate-200"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'type' && (
                        <div className="flex flex-col h-full">
                            <input
                                type="text"
                                placeholder="Type your name..."
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-bold text-slate-800 dark:text-slate-100 text-lg shrink-0 mb-4"
                                autoFocus
                            />
                            
                            <div className="flex-1 overflow-hidden flex flex-col min-h-0">
                                <div className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider mb-2 ml-1 shrink-0">Select Style</div>
                                <div className="grid grid-cols-1 gap-3 overflow-y-auto pr-2 max-h-[160px] scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-slate-700 scrollbar-track-transparent">
                                    {fonts.map((font) => (
                                        <button 
                                            key={font.name}
                                            onClick={() => setSelectedFont(font.name)}
                                            className={`w-full p-4 rounded-xl border transition-all text-center relative overflow-hidden shrink-0 ${
                                                selectedFont === font.name 
                                                ? 'border-indigo-600 bg-indigo-50/50 dark:bg-indigo-900/30 ring-1 ring-indigo-600 text-indigo-900 dark:text-indigo-300' 
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                                            }`}
                                        >
                                            <span style={{ fontFamily: font.family, fontSize: '1.75rem' }}>
                                                {typedName || 'Signature Preview'}
                                            </span>
                                            {selectedFont === font.name && (
                                                <div className="absolute top-2 right-2 text-indigo-600 dark:text-indigo-400">
                                                    <Check size={16} />
                                                </div>
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            
                            <div className="mt-4 flex items-center gap-3 bg-indigo-50/50 dark:bg-indigo-900/20 p-3 rounded-xl border border-indigo-100 dark:border-indigo-900/30 shrink-0">
                                <input 
                                    type="checkbox" 
                                    id="includeDetailsType"
                                    checked={includeDetails}
                                    onChange={(e) => setIncludeDetails(e.target.checked)}
                                    className="w-5 h-5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                                />
                                <label htmlFor="includeDetailsType" className="text-sm font-bold text-slate-700 dark:text-slate-300 select-none cursor-pointer flex-1">
                                    Include Name, Date & Time status
                                </label>
                            </div>
                        </div>
                    )}

                    {activeTab === 'date' && (
                        <div className="flex flex-col h-full justify-center">
                            <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Select Date</label>
                                    <input 
                                        type="date"
                                        value={dateValue}
                                        onChange={(e) => setDateValue(e.target.value)}
                                        className="w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-200 font-bold"
                                    />
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                                    <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-1">PREVIEW</div>
                                    <div className="font-bold text-2xl text-slate-800 dark:text-slate-200 font-sans border-2 border-slate-800 dark:border-slate-200 p-2 inline-block">
                                        {dateValue}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'place' && (
                        <div className="flex flex-col h-full justify-center">
                             <div className="bg-slate-50 dark:bg-slate-800 p-6 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col gap-4">
                                <div>
                                    <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 block">Location</label>
                                    <input 
                                        type="text"
                                        value={location}
                                        onChange={(e) => setLocation(e.target.value)}
                                        placeholder="e.g. New York, USA"
                                        className="w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-slate-800 dark:text-slate-200 font-bold"
                                        autoFocus
                                    />
                                </div>
                                <div className="p-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-center">
                                    <div className="text-xs text-slate-400 dark:text-slate-500 font-bold mb-1">PREVIEW</div>
                                    <div className="font-bold text-xl text-slate-800 dark:text-slate-200 font-sans border-2 border-slate-800 dark:border-slate-200 p-2 px-4 inline-block min-w-[150px]">
                                        {location || 'Location Name'}
                                    </div>
                                </div>
                             </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-end gap-3 shrink-0 bg-white dark:bg-slate-900">
                    <button 
                        onClick={onClose}
                        className="px-5 py-2.5 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-xl transition-colors"
                    >
                        Cancel
                    </button>
                    <button 
                        onClick={save}
                        className="px-6 py-2.5 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] flex items-center gap-2"
                    >
                        <Check size={18} />
                        Apply {activeTab === 'draw' || activeTab === 'type' ? 'Signature' : 'Stamp'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SignatureModal;
