import React from 'react';
import { useForm } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Lock, ArrowRight, ShieldCheck, Eye, EyeOff } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import ThemeToggle from '../components/ThemeToggle';

const schema = z.object({
    password: z.string().min(6, "Password must be at least 6 characters"),
    confirmPassword: z.string().min(6, "Confirm password must match")
}).refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
});

const ResetPassword = () => {
    const { token } = useParams();
    const navigate = useNavigate();
    const [showPassword, setShowPassword] = React.useState(false);
    
    const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
        resolver: zodResolver(schema),
    });

    const onSubmit = async (data) => {
        try {
            const response = await api.post(`/auth/reset-password/${token}`, { password: data.password });
            toast.success(response.data.message || 'Password reset successfully!');
            navigate('/login');
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to reset password');
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
                        <Lock className="w-8 h-8 text-indigo-600 dark:text-indigo-400" />
                    </div>
                </div>
                
                <div className="text-center mb-8">
                    <h2 className="text-2xl font-extrabold text-slate-800 dark:text-slate-100 tracking-tight">Reset Password</h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                        Enter your new secure password below.
                    </p>
                </div>

                <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                    <div className="group">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">New Password</label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                {...register('password')}
                                className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-slate-700 dark:text-slate-200"
                                placeholder="••••••••"
                            />
                            <button
                                type="button"
                                onClick={() => setShowPassword(!showPassword)}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                        {errors.password && <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-1 font-medium">{errors.password.message}</p>}
                    </div>

                    <div className="group">
                        <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2 ml-1 group-focus-within:text-indigo-600 dark:group-focus-within:text-indigo-400 transition-colors">Confirm Password</label>
                        <input
                            type="password"
                            {...register('confirmPassword')}
                            className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:bg-white dark:focus:bg-slate-900 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-500 font-medium text-slate-700 dark:text-slate-200"
                            placeholder="••••••••"
                        />
                        {errors.confirmPassword && <p className="text-xs text-red-500 dark:text-red-400 mt-1 ml-1 font-medium">{errors.confirmPassword.message}</p>}
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
                                Update Password <ArrowRight size={20} className="group-hover:translate-x-0.5 transition-transform" />
                            </>
                        )}
                    </button>
                </form>

                <div className="mt-6 flex justify-center">
                     <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                        <ShieldCheck size={12} className="text-indigo-400" /> 
                        Your security is our top priority
                    </p>
                </div>
            </div>
        </div>
    );
};

export default ResetPassword;
