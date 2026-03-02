import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, query, orderBy, serverTimestamp, writeBatch } from 'firebase/firestore';
import {
    Plus, Trash2, Image as ImageIcon, Loader, Edit2, X, Save, Search, UploadCloud, Layers, Check, RefreshCw, DollarSign, List
} from 'lucide-react';

interface Program {
    id: string;
    title: string;
    prices: {
        3: number;
        6: number;
        12: number;
    };
    image: string;
    features: string[];
    order?: number;
    createdAt?: any;
}

const DEFAULT_PROGRAMS = [
    {
        title: "Новичок",
        prices: { 3: 13100, 6: 23990, 12: 44990 },
        image: "/junior-tariff.png",
        features: ["2 раза в неделю", "Базовая подготовка", "Групповые занятия", "Безопасная среда"]
    },
    {
        title: "Профессионал",
        prices: { 3: 19550, 6: 34990, 12: 55990 },
        image: "/champion-tariff.png",
        features: ["3 раза в неделю", "Интенсивная подготовка", "Отработка тактики", "Спортивный анализ"]
    },
    {
        title: "Чемпион",
        prices: { 3: 26150, 6: 46990, 12: 74990 },
        image: "/pro-tariff.png",
        features: ["4 раза в неделю", "Игровая практика", "Путь в сборную", "Полный комплект экипировки"]
    }
];

const AdminDirections = () => {
    // --- State ---
    const [programs, setPrograms] = useState<Program[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);

    // Editor State
    const [formData, setFormData] = useState<Partial<Program>>({
        title: '',
        image: '',
        prices: { 3: 0, 6: 0, 12: 0 },
        features: [],
        order: 0
    });
    const [featureInput, setFeatureInput] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [syncing, setSyncing] = useState(false);

    // --- Effects ---
    useEffect(() => {
        const q = query(collection(db, "directions"), orderBy("order", "asc"));

        const unsubscribe = onSnapshot(collection(db, "directions"), (snapshot) => {
            const data = snapshot.docs.map((doc: any) => ({
                id: doc.id,
                ...doc.data()
            }));
            // Manual sort as backup
            data.sort((a: any, b: any) => (a.order || 0) - (b.order || 0));
            setPrograms(data);
            setLoading(false);
        }, (error) => {
            console.error("Firestore Read Error:", error);
            setErrorMessage(`Ошибка доступа к БД: ${error.message}`);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    // --- Helpers ---

    const resizeImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const img = new Image();
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 800;

                    if (width > height) {
                        if (width > MAX_SIZE) {
                            height *= MAX_SIZE / width;
                            width = MAX_SIZE;
                        }
                    } else {
                        if (height > MAX_SIZE) {
                            width *= MAX_SIZE / height;
                            height = MAX_SIZE;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    if (ctx) {
                        ctx.drawImage(img, 0, 0, width, height);
                        resolve(canvas.toDataURL('image/jpeg', 0.7));
                    } else {
                        reject(new Error("Canvas failed"));
                    }
                };
                img.onerror = () => reject(new Error("Image load failed"));
                img.src = e.target?.result as string;
            };
            reader.onerror = () => reject(new Error("File read failed"));
            reader.readAsDataURL(file);
        });
    };

    const handleAutoSync = async () => {
        if (programs.length > 0) {
            if (!window.confirm("Это перезапишет текущий список?")) return;
        }

        setSyncing(true);
        try {
            const batch = writeBatch(db);
            DEFAULT_PROGRAMS.forEach((prog, index) => {
                const docRef = doc(collection(db, "directions"));
                batch.set(docRef, {
                    ...prog,
                    order: index + 1,
                    createdAt: serverTimestamp()
                });
            });
            await batch.commit();
            setSuccessMessage("Тарифы восстановлены!");
        } catch (error: any) {
            setErrorMessage("Ошибка: " + error.message);
        } finally {
            setSyncing(false);
        }
    };

    // --- Handlers ---

    const handleOpenEditor = (item?: Program) => {
        if (item) {
            setEditingId(item.id);
            setFormData({ ...item });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                image: '',
                prices: { 3: 0, 6: 0, 12: 0 },
                features: [],
                order: programs.length + 1
            });
        }
        setFeatureInput('');
        setIsEditorOpen(true);
        setErrorMessage(null);
    };

    const handleCloseEditor = () => {
        setIsEditorOpen(false);
        setEditingId(null);
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.size > 10 * 1024 * 1024) {
            setErrorMessage("Файл > 10MB");
            return;
        }

        setIsUploading(true);
        try {
            const base64 = await resizeImage(file);
            setFormData(prev => ({ ...prev, image: base64 }));
            setSuccessMessage("Фото готово");
        } catch (e: any) {
            setErrorMessage("Ошибка фото: " + e.message);
        } finally {
            setIsUploading(false);
        }
    };

    const addFeature = () => {
        if (!featureInput.trim()) return;
        setFormData(prev => ({
            ...prev,
            features: [...(prev.features || []), featureInput.trim()]
        }));
        setFeatureInput('');
    };

    const removeFeature = (idx: number) => {
        setFormData(prev => ({
            ...prev,
            features: prev.features?.filter((_, i) => i !== idx)
        }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!formData.title) {
            setErrorMessage("Заполните название");
            return;
        }

        const dataToSave = {
            ...formData,
            updatedAt: serverTimestamp()
        };

        try {
            if (editingId) {
                await updateDoc(doc(db, "directions", editingId), dataToSave);
                setSuccessMessage("Обновлено!");
            } else {
                await addDoc(collection(db, "directions"), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setSuccessMessage("Добавлено!");
            }
            setTimeout(() => {
                setSuccessMessage(null);
                handleCloseEditor();
            }, 500);
        } catch (error: any) {
            setErrorMessage("Ошибка: " + error.message);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Удалить направление?")) {
            await deleteDoc(doc(db, "directions", id));
        }
    };

    if (loading) return (
        <div className="flex items-center justify-center h-full bg-[#050505]">
            <Loader className="animate-spin text-sparta-gold w-10 h-10" />
        </div>
    );

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope relative">
            {/* Main Content */}
            <div className={`flex-1 flex flex-col transition-all duration-500 ${(isEditorOpen) ? 'mr-[400px]' : ''}`}>
                {/* Header */}
                <div className="p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-russo text-white mb-2">Направления</h1>
                            <p className="text-white/40 text-sm">Управление тарифами и программами</p>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={handleAutoSync}
                                disabled={syncing}
                                className="bg-white/10 text-white font-bold py-3 px-6 rounded-xl hover:bg-white/20 transition-all flex items-center gap-2 disabled:opacity-50"
                            >
                                {syncing ? <Loader className="animate-spin" size={20} /> : <RefreshCw size={20} />}
                                {programs.length === 0 ? "Загрузить стандартные" : "Сброс"}
                            </button>

                            <button
                                onClick={() => handleOpenEditor()}
                                className="bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] transition-all flex items-center gap-2 transform active:scale-95"
                            >
                                <Plus size={20} />
                                Добавить
                            </button>
                        </div>
                    </div>
                </div>

                {/* List */}
                <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {programs.map(prog => (
                            <div
                                key={prog.id}
                                onClick={() => handleOpenEditor(prog)}
                                className={`group relative bg-[#0F0F0F] hover:bg-[#141414] border border-white/5 hover:border-sparta-gold/30 rounded-3xl overflow-hidden cursor-pointer transition-all duration-300 ${editingId === prog.id ? 'border-sparta-gold/50 ring-1 ring-sparta-gold/20' : ''}`}
                            >
                                {/* Image Overlay */}
                                <div className="h-48 relative">
                                    <div className="absolute inset-0 bg-gradient-to-t from-[#0F0F0F] via-transparent to-transparent z-10" />
                                    {prog.image ? (
                                        <img src={prog.image} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" alt="" />
                                    ) : (
                                        <div className="w-full h-full bg-white/5 flex items-center justify-center">
                                            <Layers className="text-white/20" size={48} />
                                        </div>
                                    )}
                                    <div className="absolute bottom-4 left-4 z-20">
                                        <h3 className="text-2xl font-bold text-white font-russo mb-1">{prog.title}</h3>
                                        <p className="text-sparta-gold font-bold text-sm">
                                            от {Math.round((prog.prices?.[3] || 0) / 3).toLocaleString()} ₽/мес
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => handleDelete(prog.id, e)}
                                        className="absolute top-4 right-4 p-2 bg-black/50 hover:bg-red-500/80 rounded-full text-white/50 hover:text-white transition-all z-30 opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                                <div className="p-4 pt-0">
                                    <div className="flex items-center gap-2 text-white/30 text-xs mb-4">
                                        <List size={12} />
                                        <span>{prog.features?.length || 0} особенностей</span>
                                    </div>
                                    <div className="flex gap-2">
                                        {[3, 6, 12].map(m => (
                                            <div key={m} className={`flex-1 p-2 rounded-lg border border-white/5 text-center ${(prog.prices as any)?.[m] ? 'bg-white/5' : 'bg-red-500/10 border-red-500/20'}`}>
                                                <div className="text-[10px] text-white/30 uppercase">{m} мес</div>
                                                <div className="text-sm font-bold text-white">{(prog.prices as any)?.[m]?.toLocaleString()}</div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Editor Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-[400px] bg-[#111] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out z-50 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h2 className="text-xl font-bold text-white font-russo">{editingId ? 'Редактировать' : 'Новое направление'}</h2>
                    <button onClick={handleCloseEditor} className="text-white/40 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Image Upload */}
                    <div className="space-y-3">
                        <div className="aspect-video w-full rounded-xl bg-white/5 relative overflow-hidden group border border-white/10">
                            {formData.image ? (
                                <img src={formData.image} className="w-full h-full object-cover" alt="" />
                            ) : (
                                <div className="flex flex-col items-center justify-center w-full h-full text-white/20">
                                    <ImageIcon size={32} />
                                    <span className="text-xs mt-2">Нет обложки</span>
                                </div>
                            )}
                            {isUploading && (
                                <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                                    <Loader className="animate-spin text-sparta-gold" />
                                </div>
                            )}
                            <label className="absolute inset-0 cursor-pointer flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40">
                                <span className="bg-sparta-gold text-black px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2">
                                    <UploadCloud size={16} /> Нажать
                                </span>
                                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                            </label>
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Название тарифа</label>
                            <input
                                type="text"
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold/50 outline-none transition-all"
                                placeholder="Например: Чемпион"
                            />
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <DollarSign size={14} /> Цены (₽)
                            </label>
                            <div className="grid grid-cols-3 gap-3">
                                {[3, 6, 12].map(m => (
                                    <div key={m}>
                                        <div className="text-[10px] text-white/30 mb-1 ml-1">{m} Месяцев</div>
                                        <input
                                            type="number"
                                            value={(formData.prices as any)?.[m] || ''}
                                            onChange={e => setFormData({
                                                ...formData,
                                                prices: { ...formData.prices, [m]: parseInt(e.target.value) || 0 } as any
                                            })}
                                            className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-white/90 text-sm focus:border-sparta-gold/50 outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider flex items-center gap-2">
                                <List size={14} /> Особенности списка
                            </label>
                            <div className="flex gap-2 mb-2">
                                <input
                                    type="text"
                                    value={featureInput}
                                    onChange={e => setFeatureInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && addFeature()}
                                    className="flex-1 bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm"
                                    placeholder="Например: Посещение бассейна"
                                />
                                <button onClick={addFeature} className="bg-white/10 hover:bg-sparta-gold hover:text-black p-2 rounded-lg transition-colors">
                                    <Plus size={18} />
                                </button>
                            </div>
                            <div className="space-y-1">
                                {formData.features?.map((feat, idx) => (
                                    <div key={idx} className="flex justify-between items-center bg-white/5 px-3 py-2 rounded-lg border border-white/5 group">
                                        <span className="text-sm text-white/80">{feat}</span>
                                        <button onClick={() => removeFeature(idx)} className="text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">
                                            <X size={14} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-white/50 text-xs font-bold uppercase tracking-wider">Порядок</label>
                            <input
                                type="number"
                                value={formData.order}
                                onChange={e => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:border-sparta-gold/50 outline-none"
                            />
                        </div>
                    </div>

                    {errorMessage && (
                        <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            {errorMessage}
                        </div>
                    )}

                    {successMessage && (
                        <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl text-green-400 text-sm flex items-center gap-2">
                            <Check size={16} /> {successMessage}
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-white/10 bg-[#111]">
                    <button
                        onClick={handleSubmit}
                        disabled={isUploading}
                        className="w-full bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                        <Save size={20} />
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminDirections;
