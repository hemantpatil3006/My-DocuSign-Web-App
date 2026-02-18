import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import api from '../services/api';
import { X, UploadCloud, FileText, AlertCircle } from 'lucide-react';

const UploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
    const { register, handleSubmit, reset, watch, formState: { errors } } = useForm();
    
    const [uploading, setUploading] = useState(false);
    const [dragActive, setDragActive] = useState(false);

    const selectedFile = watch('file');
    const fileName = selectedFile?.[0]?.name;

    if (!isOpen) return null;

    const onSubmit = async (data) => {
        if (!data.file[0]) return;

        const formData = new FormData();
        formData.append('file', data.file[0]);

        setUploading(true);
        try {
            await api.post('/docs/upload', formData);
            
            onUploadSuccess();
            reset();
            onClose();
        } catch (error) {
            console.error('Full Upload Error Object:', error);
            alert(`Upload failed: ${error.response?.data?.message || error.message}`);
        } finally {
            setUploading(false);
        }
    };

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/50 backdrop-blur-sm transition-opacity">
            <div className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 p-0 transform transition-all">
                <div className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
                    <h3 className="text-lg font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                        <UploadCloud className="text-indigo-600 dark:text-indigo-400" size={20} /> Upload Document
                    </h3>
                    <button onClick={onClose} className="text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 transition-colors p-1 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                        <X size={20} />
                    </button>
                </div>
                
                <form onSubmit={handleSubmit(onSubmit)} className="p-6">
                    <div 
                        className={`relative border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center text-center transition-colors ${
                            dragActive ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30' : 'border-slate-300 dark:border-slate-700 hover:border-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                        }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrag}
                    >
                        <div className={`p-3 rounded-full mb-3 ${fileName ? 'bg-green-100 dark:bg-green-900/30' : 'bg-indigo-50 dark:bg-indigo-900/30'}`}>
                            <FileText className={fileName ? 'text-green-600 dark:text-green-400' : 'text-indigo-600 dark:text-indigo-400'} size={32} />
                        </div>
                        
                        {fileName ? (
                            <div className="animate-slide-up">
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200 mb-1">
                                    {fileName}
                                </p>
                                <p className="text-xs text-green-600 dark:text-green-400 font-medium">Ready to upload</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                                    Click to upload or drag and drop
                                </p>
                                <p className="text-xs text-slate-400 dark:text-slate-500">PDF files only (max 10MB)</p>
                            </>
                        )}
                        

                        <input
                            type="file"
                            accept="application/pdf"
                            {...register('file', { required: 'Please select a file' })}
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                    </div>
                    
                    {errors.file && (
                        <div className="mt-2 flex items-center gap-1 text-red-500 dark:text-red-400 text-xs font-medium bg-red-50 dark:bg-red-900/20 p-2 rounded-lg">
                            <AlertCircle size={14} /> {errors.file.message}
                        </div>
                    )}

                    <div className="mt-6 flex justify-end gap-3">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-sm font-bold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            disabled={uploading}
                            className="px-6 py-2 text-sm font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-lg shadow-indigo-200 dark:shadow-none transition-all active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            {uploading ? (
                                <>
                                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                                    Uploading...
                                </>
                            ) : (
                                'Upload'
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default UploadModal;
