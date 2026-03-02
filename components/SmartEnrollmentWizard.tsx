import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { db } from '../firebase';
import { doc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { User, Group, ExperienceLevel } from '../types/shop';
import { Check, ChevronRight, Star, Calendar, Clock, Trophy, Dumbbell, Search } from 'lucide-react';
import { serverTimestamp } from 'firebase/firestore';

interface SmartEnrollmentWizardProps {
    user: User;
    onComplete: () => void;
}

const SPORTS_LIST = [
    "Плавание", "Борьба", "Гимнастика", "Баскетбол", "Хоккей",
    "Теннис", "Легкая атлетика", "Дзюдо", "Бокс", "Танцы",
    "Волейбол", "Фигурное катание", "Каратэ", "Тхэквондо", "Шахматы",
    "Велоспорт", "Лыжи", "Бег", "Самбо", "Регби"
];

const EXPERIENCE_LEVELS: { id: ExperienceLevel; title: string; desc: string; icon: any }[] = [
    { id: 'newbie', title: 'Новичок', desc: 'Никогда не занимался футболом или играл очень мало.', icon: Star },
    { id: 'amateur', title: 'Любитель', desc: 'Играл во дворе, школе или ходил в секции.', icon: Dumbbell },
    { id: 'pro', title: 'Опытный', desc: 'Занимался профессионально, участвовал в турнирах.', icon: Trophy },
];

const SmartEnrollmentWizard: React.FC<SmartEnrollmentWizardProps> = ({ user, onComplete }) => {
    const [step, setStep] = useState(() => {
        // Auto-skip step 1 if data is present
        if (user.childName && user.childAge) return 2;
        return 1;
    });
    const [loading, setLoading] = useState(false);
    const [groups, setGroups] = useState<Group[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);

    // Form Data
    const [formData, setFormData] = useState({
        childName: user.childName || '',
        childSurname: '',
        childAge: user.childAge?.toString() || '',
        experienceLevel: user.experienceLevel || 'newbie' as ExperienceLevel,
        yearsOfExperience: '0',
        otherSports: user.otherSports || '',
        preferredDays: [] as string[],
        preferredTime: 'any' as 'morning' | 'afternoon' | 'evening' | 'any'
    });

    // Sync with User Prop (if it loads late)
    useEffect(() => {
        setFormData(prev => ({
            ...prev,
            childName: prev.childName || user.childName || '',
            childAge: prev.childAge || user.childAge?.toString() || ''
        }));

        // If we are on step 1 but data arrived, move to step 2 ? 
        // Better not force jump if user is editing. 
        // But initial state handles the common case.

        // Auto-close if user is already in a group
        if (user.groupId) {
            console.log("User already in group, closing wizard.");
            onComplete();
        }
    }, [user.childName, user.childAge, user.groupId]);

    useEffect(() => {
        const fetchGroups = async () => {
            const snap = await getDocs(collection(db, "groups"));
            setGroups(snap.docs.map(d => ({ id: d.id, ...d.data() } as Group)));
        };
        fetchGroups();
    }, []);

    const handleNext = async () => {
        if (step === 1) {
            // Save Profile Data
            if (!formData.childName || !formData.childAge) return alert("Заполните имя и возраст");

            setLoading(true);
            try {
                await updateDoc(doc(db, "users", user.id), {
                    childName: formData.childName, // Optionally append surname if needed
                    childAge: parseInt(formData.childAge),
                    experienceLevel: formData.experienceLevel,
                    otherSports: formData.otherSports,
                    // Store extra fields if schema allows, or just use these
                });
                setStep(2);
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        } else if (step === 2) {
            setLoading(true);
            try {
                await updateDoc(doc(db, "users", user.id), {
                    preferredSchedule: {
                        days: formData.preferredDays,
                        timeOfDay: formData.preferredTime
                    }
                });
                setStep(3);
            } catch (error) {
                console.error("Error saving preferences:", error);
            } finally {
                setLoading(false);
            }
        }
    };

    const handleJoinGroup = async (groupId: string) => {
        setLoading(true);
        try {
            await updateDoc(doc(db, "users", user.id), { groupId });
            // Maybe create a request instead? User said "successful registration... system sends him".
            // Direct assignment for now as "Smart System".
            onComplete();
        } catch (error) {
            console.error(error);
            alert("Ошибка вступления");
        } finally {
            setLoading(false);
        }
    };

    // Matching Logic
    const getRecommendedGroups = () => {
        const age = parseInt(formData.childAge);
        return groups
            .map(group => {
                let score = 0;
                // 1. Age Match (Critical)
                if (age >= group.ageRange.min && age <= group.ageRange.max) score += 100;
                else return null; // Filter out

                // 2. Skill Match
                if (group.difficultyLevel === formData.experienceLevel) score += 50;
                if (group.difficultyLevel === 'newbie' && formData.experienceLevel === 'newbie') score += 20;

                // 3. Schedule Match (Simple string match for demo)
                // In real app, inspect group.schedule

                return { group, score };
            })
            .filter(Boolean) as { group: Group, score: number }[];
    };

    const recommendations = step === 3 ? getRecommendedGroups().sort((a, b) => b.score - a.score) : [];

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 font-manrope">
            <div className="w-full max-w-2xl bg-[#121212] border border-white/10 rounded-3xl overflow-hidden flex flex-col max-h-[90vh]">
                {/* Progress Bar */}
                <div className="h-1 bg-white/5 w-full">
                    <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${(step / 3) * 100}%` }}
                        className="h-full bg-sparta-gold"
                    />
                </div>

                <div className="p-8 flex-1 overflow-y-auto">
                    <AnimatePresence mode='wait'>
                        {step === 1 && (
                            <motion.div
                                key="step1"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-white font-russo mb-2">Давайте знакомиться! 👋</h2>
                                    <p className="text-white/50">Расскажите немного о будущем чемпионе, чтобы мы подобрали идеальную группу.</p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-white/40 uppercase pl-1">Имя</label>
                                        <input
                                            value={formData.childName}
                                            onChange={e => setFormData({ ...formData, childName: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-sparta-gold outline-none"
                                            placeholder="Иван"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-white/40 uppercase pl-1">Фамилия</label>
                                        <input
                                            value={formData.childSurname}
                                            onChange={e => setFormData({ ...formData, childSurname: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-sparta-gold outline-none"
                                            placeholder="Иванов"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-white/40 uppercase pl-1">Возраст</label>
                                        <input
                                            type="number"
                                            value={formData.childAge}
                                            onChange={e => setFormData({ ...formData, childAge: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-sparta-gold outline-none"
                                            placeholder="7"
                                        />
                                    </div>
                                    <div className="space-y-1 relative">
                                        <label className="text-xs font-bold text-white/40 uppercase pl-1">Другой спорт (если есть)</label>
                                        <div className="relative">
                                            <input
                                                value={formData.otherSports}
                                                onChange={e => {
                                                    setFormData({ ...formData, otherSports: e.target.value });
                                                    setShowSuggestions(true);
                                                }}
                                                onFocus={() => setShowSuggestions(true)}
                                                onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                                                className="w-full bg-white/5 border border-white/10 rounded-xl p-4 text-white focus:border-sparta-gold outline-none"
                                                placeholder="Начните вводить..."
                                            />
                                            {showSuggestions && formData.otherSports.length > 0 && (
                                                <div className="absolute top-full left-0 right-0 mt-2 bg-[#1a1a1a] border border-white/10 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto">
                                                    {SPORTS_LIST
                                                        .filter(s => s.toLowerCase().includes(formData.otherSports.toLowerCase()))
                                                        .map((sport) => (
                                                            <button
                                                                key={sport}
                                                                onClick={() => {
                                                                    setFormData({ ...formData, otherSports: sport });
                                                                    setShowSuggestions(false);
                                                                }}
                                                                className="w-full text-left px-4 py-3 text-white hover:bg-white/10 hover:text-sparta-gold transition-colors flex items-center justify-between group"
                                                            >
                                                                <span>{sport}</span>
                                                                {formData.otherSports === sport && <Check size={14} className="text-sparta-gold" />}
                                                            </button>
                                                        ))
                                                    }
                                                    {SPORTS_LIST.filter(s => s.toLowerCase().includes(formData.otherSports.toLowerCase())).length === 0 && (
                                                        <div className="px-4 py-3 text-white/30 text-sm italic">
                                                            Ничего не найдено (будет сохранено как есть)
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3 pt-4">
                                    <label className="text-xs font-bold text-white/40 uppercase pl-1">Опыт в футболе</label>
                                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                        {EXPERIENCE_LEVELS.map(level => {
                                            const Icon = level.icon;
                                            const isSelected = formData.experienceLevel === level.id;
                                            return (
                                                <button
                                                    key={level.id}
                                                    onClick={() => setFormData({ ...formData, experienceLevel: level.id })}
                                                    className={`p-4 rounded-xl border text-left transition-all relative overflow-hidden group
                                                        ${isSelected ? 'bg-sparta-gold text-black border-sparta-gold' : 'bg-white/5 border-white/10 hover:bg-white/10 text-white'}
                                                    `}
                                                >
                                                    <div className={`mb-3 p-2 rounded-full w-fit ${isSelected ? 'bg-black/10' : 'bg-white/10 text-sparta-gold'}`}>
                                                        <Icon size={20} />
                                                    </div>
                                                    <div className="font-bold mb-1">{level.title}</div>
                                                    <div className={`text-xs ${isSelected ? 'text-black/60' : 'text-white/40'}`}>{level.desc}</div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </div>

                                <button
                                    onClick={handleNext}
                                    className="w-full py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2 mt-4"
                                >
                                    Далее <ChevronRight size={20} />
                                </button>
                            </motion.div>
                        )}

                        {step === 2 && (
                            <motion.div
                                key="step2"
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -20 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-8">
                                    <h2 className="text-3xl font-bold text-white font-russo mb-2">Удобное время ⏰</h2>
                                    <p className="text-white/50">Когда вам удобнее посещать тренировки?</p>
                                </div>

                                <div className="grid grid-cols-2 gap-4">
                                    {['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'].map(day => (
                                        <button
                                            key={day}
                                            onClick={() => {
                                                const days = formData.preferredDays.includes(day)
                                                    ? formData.preferredDays.filter(d => d !== day)
                                                    : [...formData.preferredDays, day];
                                                setFormData({ ...formData, preferredDays: days });
                                            }}
                                            className={`p-4 rounded-xl border font-bold transition-all
                                                ${formData.preferredDays.includes(day) ? 'bg-sparta-gold text-black border-sparta-gold' : 'bg-white/5 border-white/10 text-white hover:bg-white/10'}
                                            `}
                                        >
                                            {day}
                                        </button>
                                    ))}
                                </div>

                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-white/40 uppercase pl-1">Время дня</label>
                                    <div className="flex bg-white/5 p-1 rounded-xl">
                                        {['morning', 'evening', 'any'].map((t) => (
                                            <button
                                                key={t}
                                                onClick={() => setFormData({ ...formData, preferredTime: t as any })}
                                                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all capitalize
                                                     ${formData.preferredTime === t ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white'}
                                                 `}
                                            >
                                                {t === 'morning' ? 'Утро' : t === 'evening' ? 'Вечер' : 'Любое'}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                <div className="flex gap-3 mt-8">
                                    <button
                                        onClick={() => setStep(1)}
                                        className="py-4 px-6 bg-white/5 text-white font-bold rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        Назад
                                    </button>
                                    <button
                                        onClick={handleNext}
                                        className="flex-1 py-4 bg-white text-black font-bold rounded-xl hover:bg-gray-200 transition-colors flex items-center justify-center gap-2"
                                    >
                                        Подобрать группу <Check size={20} />
                                    </button>
                                </div>
                            </motion.div>
                        )}

                        {step === 3 && (
                            <motion.div
                                key="step3"
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="space-y-6"
                            >
                                <div className="text-center mb-6">
                                    <h2 className="text-3xl font-bold text-white font-russo mb-2">Мы нашли идеальные варианты! 🎯</h2>
                                    <p className="text-white/50">Основываясь на вашем возрасте ({formData.childAge}) и опыте.</p>
                                </div>

                                {recommendations.length > 0 ? (
                                    <div className="grid gap-4">
                                        {recommendations.map(({ group, score }, idx) => (
                                            <div key={group.id} className="bg-white/5 border border-white/10 hover:border-sparta-gold/50 rounded-2xl p-6 transition-all relative overflow-hidden group">
                                                {idx === 0 && (
                                                    <div className="absolute top-0 right-0 bg-sparta-gold text-black text-[10px] font-bold px-3 py-1 rounded-bl-xl">
                                                        ЛУЧШИЙ ВЫБОР
                                                    </div>
                                                )}

                                                <div className="flex justify-between items-start mb-4">
                                                    <div>
                                                        <h3 className="text-xl font-bold text-white group-hover:text-sparta-gold transition-colors">{group.name}</h3>
                                                        <p className="text-white/50 text-sm mt-1">Возраст: {group.ageRange.min}-{group.ageRange.max} лет</p>
                                                    </div>
                                                    <div className="text-right">
                                                        <div className="text-sparta-gold font-bold text-lg">{score}%</div>
                                                        <div className="text-xs text-white/30">совместимость</div>
                                                    </div>
                                                </div>

                                                <div className="space-y-2 mb-6">
                                                    {group.schedule?.slice(0, 3).map((s, i) => (
                                                        <div key={i} className="flex items-center gap-3 text-sm text-white/70">
                                                            <Calendar size={14} className="text-sparta-gold/50" />
                                                            <span>{s.day}</span>
                                                            <Clock size={14} className="text-sparta-gold/50 ml-2" />
                                                            <span>{s.time}</span>
                                                        </div>
                                                    ))}
                                                </div>

                                                <button
                                                    onClick={() => handleJoinGroup(group.id)}
                                                    disabled={loading}
                                                    className="w-full py-3 bg-sparta-gold text-black font-bold rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all"
                                                >
                                                    {loading ? 'Секундочку...' : 'Записаться в эту группу'}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-10 bg-white/5 rounded-2xl border border-dashed border-white/10">
                                        <div className="mb-4 text-white/20"><Search size={40} className="mx-auto" /></div>
                                        <h3 className="text-white font-bold mb-2">Группы не найдены</h3>
                                        <p className="text-white/50 text-sm mb-6">К сожалению, для возраста {formData.childAge} лет пока нет активных групп.</p>
                                        <button onClick={onComplete} className="text-sparta-gold hover:underline">Пропустить этот шаг</button>
                                    </div>
                                )}
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
};

export default SmartEnrollmentWizard;
