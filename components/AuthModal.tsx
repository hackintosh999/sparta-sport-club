import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Mail, Lock, User, Chrome, Calendar } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { linkStudentToGroup } from '../utils/studentLinking';

interface AuthModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess?: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onSuccess }) => {
    const [isLogin, setIsLogin] = useState(true);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');

    // New Fields
    const [childName, setChildName] = useState('');
    const [childAge, setChildAge] = useState('');
    const [phone, setPhone] = useState('');

    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const { signInWithGoogle } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            if (isLogin) {
                await signInWithEmailAndPassword(auth, email, password);
                // Optional: Check linking on login if needed, or rely on Registration
            } else {
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;
                await updateProfile(user, { displayName: name });

                // Create User Document with Extended Data
                await setDoc(doc(db, 'users', user.uid), {
                    email: user.email,
                    role: 'user',
                    status: 'active',
                    parentName: name,
                    childName: childName,
                    childAge: parseInt(childAge) || 0,
                    parentPhone: phone,
                    balance: 0,
                    bonuses: 0,
                    createdAt: serverTimestamp()
                });

                // Attempt Auto-Linking
                await linkStudentToGroup(user.uid, childName, parseInt(childAge) || 0, phone, user.email || '');
            }
            if (onSuccess) onSuccess();
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleGoogleSignIn = async () => {
        try {
            await signInWithGoogle();
            if (onSuccess) onSuccess();
            onClose();
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-md overflow-hidden border border-sparta-gold/20 shadow-[0_0_50px_rgba(212,175,55,0.1)] pointer-events-auto relative">
                            {/* Decorative Glow */}
                            <div className="absolute -top-20 -right-20 w-40 h-40 bg-sparta-gold/10 blur-[50px] rounded-full" />
                            <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-sparta-gold/10 blur-[50px] rounded-full" />

                            <button onClick={onClose} className="absolute top-4 right-4 text-white/30 hover:text-white transition-colors z-10">
                                <X size={24} />
                            </button>

                            <div className="p-8">
                                <h2 className="font-russo text-2xl text-white mb-6 text-center">
                                    {isLogin ? 'Вход в аккаунт' : 'Регистрация'}
                                </h2>

                                <div className="flex gap-4 mb-6 bg-white/5 p-1 rounded-xl">
                                    <button
                                        onClick={() => setIsLogin(true)}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${isLogin ? 'bg-sparta-gold text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                                    >
                                        Вход
                                    </button>
                                    <button
                                        onClick={() => setIsLogin(false)}
                                        className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${!isLogin ? 'bg-sparta-gold text-black shadow-lg' : 'text-white/50 hover:text-white'}`}
                                    >
                                        Регистрация
                                    </button>
                                </div>

                                <form onSubmit={handleSubmit} className="space-y-4 font-manrope">
                                    {!isLogin && (
                                        <>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                                                <input
                                                    type="text"
                                                    placeholder="Ваше имя (Родитель)"
                                                    value={name}
                                                    onChange={(e) => setName(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all"
                                                    required={!isLogin}
                                                />
                                            </div>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                                                <input
                                                    type="text"
                                                    placeholder="Имя ребенка"
                                                    value={childName}
                                                    onChange={(e) => setChildName(e.target.value)}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all"
                                                    required={!isLogin}
                                                />
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                <div className="relative">
                                                    <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                                                    <input
                                                        type="number"
                                                        placeholder="Возраст ребенка"
                                                        value={childAge}
                                                        onChange={(e) => setChildAge(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all"
                                                        required={!isLogin}
                                                    />
                                                </div>
                                                <div className="relative">
                                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5 flex items-center justify-center font-bold text-xs">📞</div>
                                                    <input
                                                        type="tel"
                                                        placeholder="Телефон"
                                                        value={phone}
                                                        onChange={(e) => setPhone(e.target.value)}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all"
                                                        required={!isLogin}
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    )}
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                                        <input
                                            type="email"
                                            placeholder="Email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all"
                                            required
                                        />
                                    </div>
                                    <div className="relative">
                                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-5 h-5" />
                                        <input
                                            type="password"
                                            placeholder="Пароль"
                                            value={password}
                                            onChange={(e) => setPassword(e.target.value)}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all"
                                            required
                                        />
                                    </div>

                                    {error && <p className="text-red-500 text-xs text-center">{error}</p>}

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full bg-sparta-gold text-black font-bold py-3 rounded-xl hover:bg-yellow-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-sparta-gold/20 disabled:opacity-50"
                                    >
                                        {loading ? 'Загрузка...' : (isLogin ? 'Войти' : 'Создать аккаунт')}
                                    </button>
                                </form>

                                <div className="mt-6">
                                    <div className="relative flex py-2 items-center">
                                        <div className="flex-grow border-t border-white/10"></div>
                                        <span className="flex-shrink-0 mx-4 text-white/30 text-xs">Или продолжить через</span>
                                        <div className="flex-grow border-t border-white/10"></div>
                                    </div>

                                    <button
                                        onClick={handleGoogleSignIn}
                                        className="w-full mt-2 bg-white text-black py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-gray-100 transition-all"
                                    >
                                        <Chrome className="w-5 h-5" />
                                        Google
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default AuthModal;
