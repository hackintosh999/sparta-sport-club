import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
    Calendar,
    Plus,
    Trash2,
    Edit2,
    Clock,
    User,
    Target,
    Save,
    X,
    LayoutGrid
} from 'lucide-react';
import { db } from '../../firebase';
import {
    collection,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    onSnapshot,
    query,
    orderBy
} from 'firebase/firestore';
import { ScheduleDay, ScheduleItem } from '../../types';
import { Button } from '../../components/UIComponents';

const AdminSchedule = () => {
    const [days, setDays] = useState<ScheduleDay[]>([]);
    const [loading, setLoading] = useState(true);
    const [editingItem, setEditingItem] = useState<{ dayId: string, item: ScheduleItem } | null>(null);
    const [isAdding, setIsAdding] = useState<string | null>(null); // dayId

    // Real-time synchronization
    useEffect(() => {
        const q = query(collection(db, 'schedule'), orderBy('order'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const daysData: ScheduleDay[] = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as ScheduleDay));
            setDays(daysData);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleSaveItem = async (dayId: string, item: Partial<ScheduleItem>) => {
        const day = days.find(d => d.id === dayId);
        if (!day) return;

        let updatedItems;
        if (editingItem) {
            updatedItems = day.items.map(i => i.id === editingItem.item.id ? { ...i, ...item } : i);
        } else {
            const newItem = {
                id: Math.random().toString(36).substr(2, 9),
                ...item
            } as ScheduleItem;
            updatedItems = [...day.items, newItem];
        }

        await updateDoc(doc(db, 'schedule', dayId), {
            items: updatedItems
        });
        setEditingItem(null);
        setIsAdding(null);
    };

    const handleDeleteItem = async (dayId: string, itemId: string) => {
        const day = days.find(d => d.id === dayId);
        if (!day) return;

        const updatedItems = day.items.filter(i => i.id !== itemId);
        await updateDoc(doc(db, 'schedule', dayId), {
            items: updatedItems
        });
    };

    const handleSeedData = async () => {
        const seedData = [
            { day: 'Понедельник', order: 1, items: [{ id: '1', time: '10:00 - 11:30', title: 'Футбол: Основы', trainer: 'Сергей Пономарев', type: 'Групповая' }] },
            { day: 'Вторник', order: 2, items: [] },
            { day: 'Среда', order: 3, items: [] },
            { day: 'Четверг', order: 4, items: [] },
            { day: 'Пятница', order: 5, items: [] },
            { day: 'Суббота', order: 6, items: [] },
            { day: 'Воскресенье', order: 7, items: [] },
        ];

        for (const day of seedData) {
            await addDoc(collection(db, 'schedule'), day);
        }
    };

    if (loading) return <div className="p-8 text-white/50">Загрузка расписания...</div>;

    return (
        <div className="p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-russo text-white mb-2 uppercase tracking-wider">Управление Расписанием</h1>
                    <p className="text-white/50 font-manrope">Редактируйте тренировочные часы и распределение тренеров.</p>
                </div>
                <div className="flex gap-4">
                    {days.length === 0 && (
                        <Button onClick={handleSeedData} variant="outline" className="border-sparta-gold/30 text-sparta-gold">
                            Создать шаблон
                        </Button>
                    )}
                    <div className="bg-sparta-gold/10 px-4 py-2 rounded-xl border border-sparta-gold/20 flex items-center gap-2 text-sparta-gold text-sm font-bold">
                        <LayoutGrid size={16} />
                        {days.length} Дней
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                {days.map((day) => (
                    <motion.div
                        key={day.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="bg-white/5 border border-white/10 rounded-[32px] overflow-hidden backdrop-blur-md"
                    >
                        <div className="bg-white/5 px-8 py-6 border-b border-white/10 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Calendar className="text-sparta-gold" size={20} />
                                <h2 className="text-xl font-russo text-white tracking-widest uppercase">{day.day}</h2>
                            </div>
                            <button
                                onClick={() => setIsAdding(day.id)}
                                className="flex items-center gap-2 text-sparta-gold hover:text-white transition-colors text-sm font-bold"
                            >
                                <Plus size={16} /> Добавить
                            </button>
                        </div>

                        <div className="p-6 space-y-4">
                            {day.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="group flex items-center gap-6 p-4 rounded-2xl bg-black/40 border border-white/5 hover:border-white/10 transition-all"
                                >
                                    <div className="flex items-center gap-3 w-40 shrink-0">
                                        <Clock size={16} className="text-sparta-gold" />
                                        <span className="text-white font-russo tracking-widest text-sm">{item.time}</span>
                                    </div>

                                    <div className="flex-1">
                                        <div className="text-white font-bold mb-1">{item.title}</div>
                                        <div className="flex items-center gap-2 text-white/40 text-xs">
                                            <User size={12} /> {item.trainer}
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-sparta-gold text-[10px] font-bold uppercase">
                                            {item.type}
                                        </span>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                onClick={() => setEditingItem({ dayId: day.id, item })}
                                                className="p-2 text-white/50 hover:text-white transition-colors"
                                            >
                                                <Edit2 size={16} />
                                            </button>
                                            <button
                                                onClick={() => handleDeleteItem(day.id, item.id)}
                                                className="p-2 text-red-500/50 hover:text-red-500 transition-colors"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            ))}

                            {day.items.length === 0 && !isAdding && (
                                <div className="text-center py-8 text-white/30 text-sm">Нет запланированных тренировок</div>
                            )}
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Edit Modal */}
            {(editingItem || isAdding) && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        className="bg-[#111] border border-white/10 rounded-[32px] p-10 w-full max-w-xl shadow-2xl"
                    >
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-2xl font-russo text-white uppercase tracking-widest">
                                {editingItem ? 'Редактировать' : 'Добавить'} запись
                            </h3>
                            <button
                                onClick={() => { setEditingItem(null); setIsAdding(null); }}
                                className="text-white/50 hover:text-white"
                            >
                                <X />
                            </button>
                        </div>

                        <form onSubmit={(e) => {
                            e.preventDefault();
                            const formData = new FormData(e.currentTarget);
                            const itemData = {
                                time: formData.get('time') as string,
                                title: formData.get('title') as string,
                                trainer: formData.get('trainer') as string,
                                type: formData.get('type') as string,
                            };
                            handleSaveItem(editingItem?.dayId || isAdding!, itemData);
                        }} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/50 ml-2">Время тренировки</label>
                                <input
                                    name="time"
                                    defaultValue={editingItem?.item.time}
                                    placeholder="например, 10:00 - 11:30"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-sparta-gold transition-colors"
                                    required
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-white/50 ml-2">Название</label>
                                <input
                                    name="title"
                                    defaultValue={editingItem?.item.title}
                                    placeholder="например, Техническая тренировка"
                                    className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                    required
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-white/50 ml-2">Тренер</label>
                                    <input
                                        name="trainer"
                                        defaultValue={editingItem?.item.trainer}
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-sm font-bold text-white/50 ml-2">Тип</label>
                                    <input
                                        name="type"
                                        defaultValue={editingItem?.item.type}
                                        placeholder="Групповая, VIP и др."
                                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-6 py-4 text-white focus:outline-none focus:border-sparta-gold transition-colors"
                                        required
                                    />
                                </div>
                            </div>

                            <Button type="submit" className="w-full">
                                <Save className="mr-2" size={18} />
                                Сохранить изменения
                            </Button>
                        </form>
                    </motion.div>
                </div>
            )}
        </div>
    );
};

export default AdminSchedule;
