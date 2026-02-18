import React, { useEffect, useState, useCallback } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { Plus, LogOut, FileText, Search, Clock, CheckCircle, XCircle, MoreVertical, LayoutGrid, List as ListIcon, File, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import UploadModal from '../components/UploadModal';
import ThemeToggle from '../components/ThemeToggle';

const Dashboard = () => {
    const { user, logout } = useAuth();
    
    const [documents, setDocuments] = useState([]);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [viewMode, setViewMode] = useState('grid');
    const [filterStatus, setFilterStatus] = useState('All');

    const fetchDocuments = useCallback(async () => {
        try {
            const res = await api.get('/docs');
            setDocuments(res.data);
        } catch (error) {
            console.error('Error fetching documents:', error);
        }
    }, []); // Empty dependency array means this function is memoized once

    useEffect(() => {
        fetchDocuments();
    }, [fetchDocuments]); // Add fetchDocuments to useEffect's dependency array

    const getEffectiveStatus = (doc) => {
        if (doc.status === 'Rejected' && (!doc.invitations || doc.invitations.length === 0)) {
            return 'Pending';
        }
        return doc.status;
    };

    const getStatusIcon = (status) => {
        switch(status) {
            case 'Signed': return <CheckCircle size={14} className="mr-1" />;
            case 'Rejected': return <XCircle size={14} className="mr-1" />;
            default: return <Clock size={14} className="mr-1" />;
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 font-sans transition-colors duration-300">
            <UploadModal 
                isOpen={isUploadModalOpen} 
                onClose={() => setIsUploadModalOpen(false)} 
                onUploadSuccess={fetchDocuments}
            />
            
            <nav className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30 transition-colors duration-300">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="flex justify-between h-16">
                        <div className="flex items-center gap-2">
                             <div className="bg-indigo-600 p-2 rounded-lg">
                                <FileText className="h-5 w-5 text-white" />
                             </div>
                        <span className="text-xl font-bold text-slate-800 dark:text-slate-100 tracking-tight">Docu<span className="text-indigo-600 dark:text-indigo-400">Sign</span> SaaS</span>
                        </div>
                        
                        <div className="flex items-center gap-6">
                            <ThemeToggle />
                            <div className="hidden md:flex flex-col items-end">
                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{user?.name}</span>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500 capitalize">{user?.role || 'User'} Workspace</span>
                            </div>
                            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-700 hidden md:block"></div>
                            <button
                                onClick={logout}
                                className="flex items-center gap-2 text-slate-500 dark:text-slate-400 hover:text-red-600 dark:hover:text-red-400 transition-colors text-sm font-medium px-3 py-2 rounded-md hover:bg-red-50 dark:hover:bg-red-900/20"
                            >
                                <LogOut size={18} />
                                <span className="hidden sm:inline">Logout</span>
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Dashboard</h1>
                        <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage and track your documents</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={() => setIsUploadModalOpen(true)}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2.5 rounded-xl font-bold transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                        >
                            <Plus size={20} />
                            <span>New Document</span>
                        </button>
                    </div>
                </div>

                <div className="flex flex-col md:flex-row gap-4 mb-6 justify-between items-center bg-white dark:bg-slate-900 p-2 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm transition-colors duration-300">
                    <div className="flex flex-col sm:flex-row gap-2 w-full md:w-auto">
                        <div className="relative w-full sm:w-80">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input 
                                type="text"
                                placeholder="Search documents..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-medium text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        
                        <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 overflow-x-auto">
                             {['All', 'Pending', 'Signed', 'Rejected'].map(status => (
                                <button
                                    key={status}
                                    onClick={() => setFilterStatus(status)}
                                    className={`px-4 py-1.5 rounded-md text-xs font-bold transition-all whitespace-nowrap ${
                                        filterStatus === status 
                                        ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm' 
                                        : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'
                                    }`}
                                >
                                    {status}
                                </button>
                             ))}
                        </div>
                    </div>

                    <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-lg shrink-0 self-end md:self-center">
                        <button 
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-md transition-all ${viewMode === 'grid' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                            title="Grid View"
                        >
                            <LayoutGrid size={18} />
                        </button>
                        <button 
                            onClick={() => setViewMode('list')}
                             className={`p-2 rounded-md transition-all ${viewMode === 'list' ? 'bg-white dark:bg-slate-700 text-indigo-600 dark:text-indigo-400 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200'}`}
                             title="List View"
                        >
                            <ListIcon size={18} />
                        </button>
                    </div>
                </div>

                {(() => {
                    const filteredDocs = documents.filter(doc => {
                        const matchesSearch = doc.filename.toLowerCase().includes(searchTerm.toLowerCase());
                        const effectiveStatus = getEffectiveStatus(doc);
                        const matchesStatus = filterStatus === 'All' || effectiveStatus === filterStatus;
                        return matchesSearch && matchesStatus;
                    });

                    if (filteredDocs.length === 0) {
                        return (
                            <div className="text-center py-20 bg-white dark:bg-slate-900 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700">
                                <div className="bg-slate-50 dark:bg-slate-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                                    <File className="text-slate-400" size={32} />
                                </div>
                                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-200">No documents found</h3>
                                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 mb-6">Upload a new document to get started</p>
                                <button
                                    onClick={() => setIsUploadModalOpen(true)}
                                    className="text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 text-sm"
                                >
                                    Upload Document
                                </button>
                            </div>
                        );
                    }

                    return (
                        <>
                            {viewMode === 'grid' ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {filteredDocs.map((doc) => {
                                        const status = getEffectiveStatus(doc);
                                        return (
                                            <Link 
                                                to={`/documents/${doc._id}`} 
                                                key={doc._id}
                                                className="group bg-white dark:bg-slate-800/50 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 hover:shadow-xl hover:shadow-indigo-500/10 dark:hover:shadow-none hover:border-indigo-200 dark:hover:border-indigo-500/30 transition-all duration-300 flex flex-col h-full relative overflow-hidden"
                                            >
                                                <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                                                
                                                <div className="flex justify-between items-start mb-4">
                                                    <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900/40 transition-colors">
                                                        <FileText className="text-indigo-600 dark:text-indigo-400" size={24} />
                                                    </div>
                                                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border flex items-center ${
                                                        status === 'Signed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                                        status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                                        'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                    }`}>
                                                        {getStatusIcon(status)}
                                                        {status}
                                                    </span>
                                                </div>
                                                
                                                <h3 className="font-bold text-slate-800 dark:text-slate-100 text-lg mb-1 truncate" title={doc.filename}>{doc.filename}</h3>
                                                
                                                <div className="flex flex-col gap-1.5 mb-4">
                                                    {doc.invitations && doc.invitations.length > 0 ? (
                                                        <div className="flex flex-wrap gap-1">
                                                            {doc.invitations.map((inv, idx) => {
                                                                const isSigned = doc.signatures?.some(s => s.signerEmail === inv.email && s.hasSignature) || inv.status === 'Completed';
                                                                return (
                                                                    <div key={idx} className={`text-[9px] px-1.5 py-0.5 rounded flex items-center gap-1 ${
                                                                        isSigned 
                                                                        ? 'bg-green-50 text-green-600 border border-green-100 dark:bg-green-900/20 dark:text-green-400 dark:border-green-800' 
                                                                        : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-800'
                                                                    }`}>
                                                                        {isSigned ? <CheckCircle size={8} /> : <Clock size={8} />}
                                                                        <span className="font-bold uppercase tracking-tighter">{inv.role}:</span>
                                                                        <span className="font-medium truncate max-w-[60px]">{inv.name}</span>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>
                                                    ) : (
                                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">No guests invited</p>
                                                    )}
                                                    
                                                    {doc.status === 'Pending' && doc.invitations?.some(i => i.status === 'Pending') && (
                                                        <p className="text-[10px] text-amber-500 dark:text-amber-400 font-bold flex items-center gap-1">
                                                            <AlertCircle size={10} />
                                                            Pending from: {doc.invitations.filter(i => i.status === 'Pending').map(i => i.role).join(', ')}
                                                        </p>
                                                    )}
                                                </div>
                                                
                                                <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-400 dark:text-slate-500">
                                                    <span className="flex items-center gap-1">
                                                        <Clock size={12} />
                                                        {new Date(doc.createdAt).toLocaleDateString()}
                                                    </span>
                                                    <span className="font-medium group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">View Details &rarr;</span>
                                                </div>
                                            </Link>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm transition-colors duration-300">
                                    <div className="hidden md:block overflow-x-auto">
                                        <table className="w-full text-left border-collapse">
                                            <thead>
                                                <tr className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800">
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Document Name</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Date Created</th>
                                                    <th className="px-6 py-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider text-right">Actions</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                                {filteredDocs.map((doc) => {
                                                    const status = getEffectiveStatus(doc);
                                                    return (
                                                        <tr key={doc._id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors group">
                                                            <td className="px-6 py-4">
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400"><FileText size={16} /></div>
                                                                    <Link to={`/documents/${doc._id}`} className="font-medium text-slate-700 dark:text-slate-200 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                                                                        {doc.filename}
                                                                    </Link>
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4">
                                                                <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full border inline-flex items-center ${
                                                                    status === 'Signed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                                                    status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                                                    'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                                }`}>
                                                                    {getStatusIcon(status)}
                                                                    {status}
                                                                </span>
                                                            </td>
                                                            <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                                                                {new Date(doc.createdAt).toLocaleDateString()}
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <Link to={`/documents/${doc._id}`} className="text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300">View</Link>
                                                            </td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>

                                    <div className="md:hidden flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                                        {filteredDocs.map((doc) => {
                                            const status = getEffectiveStatus(doc);
                                            return (
                                                <Link 
                                                    key={doc._id} 
                                                    to={`/documents/${doc._id}`}
                                                    className="p-4 active:bg-slate-50 dark:active:bg-slate-800/50 transition-colors"
                                                >
                                                    <div className="flex items-center justify-between mb-2">
                                                        <div className="flex items-center gap-3">
                                                            <div className="p-2 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg text-indigo-600 dark:text-indigo-400"><FileText size={18} /></div>
                                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate max-w-[180px]">{doc.filename}</span>
                                                        </div>
                                                        <span className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border inline-flex items-center ${
                                                            status === 'Signed' ? 'bg-green-100 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                                            status === 'Rejected' ? 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800' :
                                                            'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800'
                                                        }`}>
                                                            {status}
                                                        </span>
                                                    </div>
                                                    <div className="flex items-center justify-between text-[10px] text-slate-400 dark:text-slate-500 font-medium ml-11">
                                                        <span>{new Date(doc.createdAt).toLocaleDateString()}</span>
                                                        <span className="text-indigo-600 dark:text-indigo-400 font-bold">View Details &rarr;</span>
                                                    </div>
                                                </Link>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </>
                    );
                })()}
            </main>
        </div>
    );
};

export default Dashboard;
