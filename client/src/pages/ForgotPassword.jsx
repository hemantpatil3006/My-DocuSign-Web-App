import React from 'react';
import { useForm } from 'react-hook-form';
import { Link } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const schema = z.object({
    email: z.string().email("Please enter a valid email address"),
});

const ForgotPassword = () => {
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data) => {
        try {
            const response = await api.post('/auth/forgot-password', { email: data.email });
            toast.success(response.data.message || 'Reset link sent!');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to send reset link');
        }
    };

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-300">
            <div className="absolute top-4 right-4 z-10 animate-fade-in">
                <ThemeToggle />
            </div>

            <div className="absolute top-0 w-full h-full bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-indigo-100/40 via-slate-50 to-slate-50 dark:from-indigo-950/40 dark:via-slate-950 dark:to-slate-950 pointer-events-none"></div>

            <div className="relative bg-white dark:bg-slate-900 p-8 md:p-10 rounded-2xl shadow-[0_20px_50px_rgba(79,70,229,0.1)] dark:shadow-none w-full max-w-md border border-slate-100 dark:border-slate-800 animate-slide-up">
                <div className="flex justify-center mb-6">
                    <div className="bg-indigo-50 dark:bg-indigo-900/20 p-4 rounded-2xl shadow-sm rotate-3">
                        <Mail className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>
                
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Forgot Password?</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                        Enter your email address and we'll send you a link to reset your password.
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="group">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">Email Address</label>
                        <input
                            {...register('email')}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-slate-700 dark:text-slate-200"
                            placeholder="you@company.com"
                        />
                        {errors.email && <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-1 font-medium">{errors.email.message}</p>}
                    </div>
                    
                    <button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full bg-indigo-600 text-white py-3.5 rounded-xl font-bold hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-indigo-200 dark:shadow-none mt-2 disabled:opacity-70 disabled:cursor-not-allowed group"
                    >
                        {isSubmitting ? (
                            <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                        ) : (
                            <>
                                Send Reset Link <ArrowRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 text-center">
                    <Link to="/login" className="inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 font-bold hover:text-indigo-700 dark:hover:text-indigo-300 transition-colors">
                        <ArrowLeft size={16} /> Back to Sign In
                    </Link>
                </div>
                
                <div className="mt-6 flex justify-center">
                     <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                        <ShieldCheck size={12} className="text-indigo-400" /> 
                        Security link expires in 1 hour
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ForgotPassword;
