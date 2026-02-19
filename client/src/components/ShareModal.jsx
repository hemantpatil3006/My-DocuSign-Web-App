import React, { useState } from 'react';
import { X, Send, User, Mail, Shield, Loader2, CheckCircle } from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const ShareModal = ({ isOpen, onClose, documentId, documentName, onSuccess }) => {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [role, setRole] = useState('Signer');
    const [isSending, setIsSending] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [invitationLink, setInvitationLink] = useState('');
    const [emailStatus, setEmailStatus] = useState('none'); // 'none', 'sent', 'failed'


    const handleSend = async (e) => {
        e.preventDefault();
        if (!name || !email || !role) {
            toast.error('All fields are required');
            return;
        }

        setIsSending(true);
        try {
            const res = await api.post(`/docs/invite/${documentId}`, { name, email, role });
            const { invitation, emailSent } = res.data;
            
            setInvitationLink(invitation.link);
            setIsSuccess(true);
            
            if (emailSent === false) {
                setEmailStatus('failed');
                toast.error('Link generated, but email failed');
            } else {
                setEmailStatus('sent');
                toast.success('Invitation sent successfully!');
            }
            
            if (onSuccess) onSuccess();
        } catch (error) {
            console.error('Share error:', error);
            toast.error(error.response?.data?.message || 'Failed to send invitation');
        } finally {
            setIsSending(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 z-[100] flex items-center justify-center p-4 backdrop-blur-sm">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                <div className="bg-indigo-600 px-6 py-4 flex justify-between items-center text-white">
                    <h3 className="text-lg font-bold flex items-center gap-2">
                        <Send size={18} /> {isSuccess ? (emailStatus === 'failed' ? 'Invitation Saved' : 'Invitation Sent') : 'Invite Guest'}
                    </h3>
                    <button onClick={onClose} className="text-white/80 hover:text-white transition-colors bg-white/10 p-1 rounded-lg hover:bg-white/20">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6">
                    {isSuccess ? (
                        <div className="text-center py-4 space-y-4">
                            <div className="flex justify-center">
                                {emailStatus === 'failed' ? (
                                    <div className="bg-amber-100 p-4 rounded-full">
                                        <Mail size={40} className="text-amber-500" />
                                    </div>
                                ) : (
                                    <CheckCircle size={60} className="text-green-500 animate-bounce-subtle" />
                                )}
                            </div>
                            <div>
                                <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                                    {emailStatus === 'failed' ? 'Email Delivery Failed' : 'Success!'}
                                </h4>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">
                                    {emailStatus === 'failed' 
                                        ? `The link for ${email} is ready, but the email couldn't be sent.` 
                                        : `Invitation sent to ${email}`}
                                </p>
                                {emailStatus === 'failed' && (
                                    <div className="mt-2 text-xs font-bold text-amber-600 bg-amber-50 py-1 px-3 rounded-full inline-block border border-amber-100">
                                        PLEASE SHARE THE LINK MANUALLY
                                    </div>
                                )}
                            </div>
                            <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-3 rounded-xl">
                                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2">Direct Link</p>
                                <div className="flex gap-2">
                                    <input 
                                        readOnly 
                                        value={invitationLink} 
                                        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs px-3 py-2 rounded-lg w-full font-mono text-slate-600 dark:text-slate-300 focus:outline-none"
                                    />
                                    <button 
                                        onClick={() => {
                                            navigator.clipboard.writeText(invitationLink);
                                            toast.success('Link copied!');
                                        }}
                                        className="bg-indigo-600 text-white px-3 py-2 rounded-lg text-xs font-bold hover:bg-indigo-700 transition-colors shrink-0"
                                    >
                                        Copy
                                    </button>
                                </div>
                            </div>
                            <button 
                                onClick={onClose}
                                className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 py-3 rounded-xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors mt-4"
                            >
                                Done
                            </button>
                        </div>
                    ) : (
                        <form onSubmit={handleSend} className="space-y-5">
                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Recipient Name</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                                        <User size={18} />
                                    </div>
                                    <input 
                                        required
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        placeholder="Full Name"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-slate-700 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Email Address</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                                        <Mail size={18} />
                                    </div>
                                    <input 
                                        required
                                        type="email"
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="email@example.com"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-slate-700 dark:text-slate-200"
                                    />
                                </div>
                            </div>

                            <div className="space-y-1">
                                <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider ml-1">Assign Role</label>
                                <div className="relative">
                                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500">
                                        <Shield size={18} />
                                    </div>
                                    <select 
                                        value={role}
                                        onChange={(e) => setRole(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all font-medium text-slate-700 dark:text-slate-200 appearance-none cursor-pointer"
                                    >
                                        <option value="Signer">Signer (Can place signature)</option>
                                        <option value="Witness">Witness (Can confirm/sign)</option>
                                        <option value="Approver">Approver (Can sign and approve)</option>
                                        <option value="Viewer">Viewer (Read-only)</option>
                                    </select>
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500">
                                        <svg width="12" height="8" viewBox="0 0 12 8" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 1L6 6L11 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                                        </svg>
                                    </div>
                                </div>
                                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 ml-1 italic">
                                    {role === 'Signer' && 'Allowed to place their own signature on the document.'}
                                    {role === 'Witness' && 'Witnesses the signing process and confirms.'}
                                    {role === 'Approver' && 'Reviews the document and gives final approval.'}
                                    {role === 'Viewer' && 'Has read-only access to view the document.'}
                                </p>
                            </div>

                            <button 
                                disabled={isSending}
                                className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none disabled:opacity-70 disabled:cursor-not-allowed mt-2"
                            >
                                {isSending ? (
                                    <>Sending... <Loader2 size={20} className="animate-spin" /></>
                                ) : (
                                    <>Send Invitation <Send size={18} /></>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ShareModal;
