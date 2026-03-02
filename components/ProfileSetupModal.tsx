import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Calendar, Phone, Hash } from 'lucide-react';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';

interface ProfileSetupModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ProfileSetupModal: React.FC<ProfileSetupModalProps> = ({ isOpen, onClose }) => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    // Form State
    const [formData, setFormData] = useState({
        childName: '',
        childSurname: '',
        childAge: '',
        childDobYear: '',
        parentPhone: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Use user from context or direct auth fallback
        const currentUser = user || auth.currentUser;

        if (!currentUser) {
            setError("Ошибка: Пользователь не найден. Попробуйте войти заново.");
            return;
        }

        setLoading(true);
        try {
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Превышено время ожидания. Проверьте интернет или настройки Firebase.")), 15000)
            );

            // Race setDoc against timeout
            await Promise.race([
                setDoc(doc(db, "users", currentUser.uid), {
                    ...formData,
                    email: currentUser.email,
                    uid: currentUser.uid,
                    createdAt: serverTimestamp(),
                    profileCompleted: true
                }),
                timeoutPromise
            ]);

            // Close modal and redirect to dashboard
            onClose();
            navigate('/dashboard');
        } catch (error: any) {
            console.error("Error saving profile:", error);
            setError("Ошибка: " + (error.message || "Не удалось сохранить"));
        } finally {
            setLoading(false);
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
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-[60]"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="fixed inset-0 z-[60] flex items-center justify-center p-4 pointer-events-none"
                    >
                        <div className="bg-[#1a1a1a] rounded-2xl w-full max-w-lg overflow-hidden border border-sparta-gold/30 shadow-[0_0_60px_rgba(212,175,55,0.15)] pointer-events-auto relative">
                            {/* Decorative Glow */}
                            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-gradient-to-r from-transparent via-sparta-gold to-transparent" />

                            <div className="p-8">
                                <div className="text-center mb-6">
                                    <h2 className="font-russo text-2xl text-white mb-2">
                                        Добро пожаловать в команду!
                                    </h2>
                                    <p className="text-white/50 text-sm font-manrope">
                                        Заполните данные спортсмена для продолжения
                                    </p>
                                </div>

                                {error && (
                                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
                                        <p className="text-red-500 text-sm text-center">{error}</p>
                                    </div>
                                )}

                                <form onSubmit={handleSubmit} className="space-y-4 font-manrope">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-white/40 mb-1 block pl-1">Имя ребенка</label>
                                            <div className="relative">
                                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                                                <input
                                                    type="text"
                                                    name="childName"
                                                    value={formData.childName}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all font-bold"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-white/40 mb-1 block pl-1">Фамилия</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    name="childSurname"
                                                    value={formData.childSurname}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all font-bold"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="text-xs text-white/40 mb-1 block pl-1">Возраст</label>
                                            <div className="relative">
                                                <Hash className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                                                <input
                                                    type="number"
                                                    name="childAge"
                                                    value={formData.childAge}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label className="text-xs text-white/40 mb-1 block pl-1">Год рождения</label>
                                            <div className="relative">
                                                <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                                                <input
                                                    type="number"
                                                    name="childDobYear"
                                                    value={formData.childDobYear}
                                                    onChange={handleChange}
                                                    placeholder="2015"
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all"
                                                    required
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="text-xs text-white/40 mb-1 block pl-1">Телефон родителя</label>
                                        <div className="relative">
                                            <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30 w-4 h-4" />
                                            <input
                                                type="tel"
                                                name="parentPhone"
                                                value={formData.parentPhone}
                                                onChange={handleChange}
                                                placeholder="+7 (___) ___-__-__"
                                                className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 transition-all tracking-wider"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <button
                                        type="submit"
                                        disabled={loading}
                                        className="w-full mt-6 bg-sparta-gold text-black font-russo text-lg py-4 rounded-xl hover:bg-yellow-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-sparta-gold/20 disabled:opacity-50"
                                    >
                                        {loading ? 'Сохранение...' : 'Завершить регистрацию'}
                                    </button>
                                </form>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default ProfileSetupModal;
