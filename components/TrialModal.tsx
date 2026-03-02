import React, { useState } from 'react';
import { X, Check } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface TrialModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const TrialModal: React.FC<TrialModalProps> = ({ isOpen, onClose }) => {
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [formData, setFormData] = useState({
        childSurname: '',
        childName: '',
        childAge: '',
        parentName: '',
        parentPhone: '',
        email: ''
    });

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await addDoc(collection(db, "requests"), {
                ...formData,
                createdAt: serverTimestamp(),
                status: 'new'
            });
            setIsSubmitted(true);
        } catch (error) {
            console.error("Error adding document: ", error);
            alert("Ошибка при отправке. Проверьте соединение.");
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
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

                            <button
                                onClick={onClose}
                                className="absolute top-4 right-4 p-2 text-white/30 hover:text-white rounded-full transition-colors z-10"
                            >
                                <X size={24} />
                            </button>

                            <div className="p-8 relative z-0">
                                {!isSubmitted ? (
                                    <>
                                        <h2 className="font-russo text-2xl text-white mb-2 text-center">
                                            Первое занятие <span className="text-sparta-gold">бесплатно</span>
                                        </h2>
                                        <p className="text-white/50 text-center text-sm mb-6 font-manrope">
                                            Оставьте заявку, и мы свяжемся с вами в течение 15 минут для уточнения деталей.
                                        </p>

                                        <form onSubmit={handleSubmit} className="space-y-3 font-manrope">
                                            <div className="flex gap-3">
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-white/70 mb-1 ml-1">Фамилия ребенка</label>
                                                    <input
                                                        type="text"
                                                        name="childSurname"
                                                        required
                                                        value={formData.childSurname}
                                                        onChange={handleChange}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all"
                                                        placeholder="Иванов"
                                                    />
                                                </div>
                                                <div className="flex-1">
                                                    <label className="block text-xs font-medium text-white/70 mb-1 ml-1">Имя ребенка</label>
                                                    <input
                                                        type="text"
                                                        name="childName"
                                                        required
                                                        value={formData.childName}
                                                        onChange={handleChange}
                                                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all"
                                                        placeholder="Иван"
                                                    />
                                                </div>
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-white/70 mb-1 ml-1">Возраст ребенка</label>
                                                <input
                                                    type="number"
                                                    name="childAge"
                                                    required
                                                    value={formData.childAge}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all"
                                                    placeholder="7"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-white/70 mb-1 ml-1">Имя родителя</label>
                                                <input
                                                    type="text"
                                                    name="parentName"
                                                    required
                                                    value={formData.parentName}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all"
                                                    placeholder="Алексей"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-white/70 mb-1 ml-1">Номер телефона родителя</label>
                                                <input
                                                    type="tel"
                                                    name="parentPhone"
                                                    required
                                                    value={formData.parentPhone}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all"
                                                    placeholder="+7 (999) 000-00-00"
                                                />
                                            </div>

                                            <div>
                                                <label className="block text-xs font-medium text-white/70 mb-1 ml-1">
                                                    Почта <span className="text-white/30 text-[10px] font-normal">(по желанию)</span>
                                                </label>
                                                <input
                                                    type="email"
                                                    name="email"
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-white/20 focus:outline-none focus:border-sparta-gold/50 focus:bg-white/10 transition-all"
                                                    placeholder="example@mail.ru"
                                                />
                                            </div>

                                            <button
                                                type="submit"
                                                className="w-full bg-sparta-gold text-black font-bold py-4 rounded-xl hover:bg-yellow-500 transition-all transform hover:scale-[1.02] active:scale-[0.98] mt-4 shadow-lg shadow-sparta-gold/20"
                                            >
                                                Записаться
                                            </button>
                                        </form>

                                        <p className="text-white/20 text-[10px] text-center mt-4">
                                            Нажимая кнопку, вы соглашаетесь с условиями обработки персональных данных.
                                        </p>
                                    </>
                                ) : (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center text-center py-8"
                                    >
                                        <div className="w-16 h-16 bg-sparta-gold/10 rounded-full flex items-center justify-center text-sparta-gold mb-4 border border-sparta-gold/20">
                                            <Check size={32} />
                                        </div>
                                        <h3 className="font-russo text-2xl text-white mb-2">Заявка принята!</h3>
                                        <p className="text-white/50 font-manrope">
                                            Мы свяжемся с вами по номеру <br />
                                            <span className="text-white">{formData.parentPhone}</span>
                                        </p>
                                        <button
                                            onClick={onClose}
                                            className="mt-8 px-8 py-2 border border-white/10 rounded-full text-white/70 hover:text-white hover:border-white/30 transition-all text-sm"
                                        >
                                            Закрыть
                                        </button>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    );
};

export default TrialModal;
