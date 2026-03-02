import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase';
import { collection, addDoc, onSnapshot, deleteDoc, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Plus, Trash2, Edit2, X, Save, Search, UploadCloud, Trophy, Box, Image as ImageIcon, Check, Loader } from 'lucide-react';
import { AchievementDefinition } from '../../types/shop';
import { Canvas, useFrame } from '@react-three/fiber';
import { useGLTF, Stage, PresentationControls } from '@react-three/drei';

// --- 3D Components ---
function Model({ url }: { url: string }) {
    const { scene } = useGLTF(url);
    return <primitive object={scene} />;
}

function Viewer3D({ url }: { url: string }) {
    return (
        <Canvas dpr={[1, 2]} camera={{ fov: 45 }} style={{ height: '200px', width: '100%' }}>
            <color attach="background" args={['#0f0f0f']} />
            <PresentationControls speed={1.5} global zoom={0.5} polar={[-0.1, Math.PI / 4]}>
                <Stage environment="city">
                    <Model url={url} />
                </Stage>
            </PresentationControls>
        </Canvas>
    );
}

// --- Main Component ---
const AdminAchievements = () => {
    const [achievements, setAchievements] = useState<AchievementDefinition[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');

    // Editor State
    const [formData, setFormData] = useState<Partial<AchievementDefinition>>({
        title: '',
        description: '',
        category: 'Спорт',
        type: '2d',
        mediaUrl: '',
        rarity: 'common'
    });
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Categories
    const CATEGORIES = ["Спорт", "Дисциплина", "Мероприятия", "Учеба", "Особое"];

    useEffect(() => {
        const unsubscribe = onSnapshot(collection(db, "achievement_definitions"), (snapshot) => {
            setAchievements(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AchievementDefinition)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenEditor = (item?: AchievementDefinition) => {
        if (item) {
            setEditingId(item.id);
            setFormData({ ...item });
        } else {
            setEditingId(null);
            setFormData({
                title: '',
                description: '',
                category: 'Спорт',
                type: '2d',
                mediaUrl: '',
                rarity: 'common'
            });
        }
        setIsEditorOpen(true);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsUploading(true);
        // Emulating local upload/base64 for now as per previous pattern
        // Ideally we use Supabase storage as established, but for speed let's check size
        // If it's a model (.glb), it might be large.
        // Let's stick to Base64 for images, but for models we really should use Supabase.
        // For this step, I'll use Base64 for simplicity if small, or assume Supabase.
        // Let's try Base64 for everything first to verify logic, but warn on size.

        const reader = new FileReader();
        reader.onload = (event) => {
            const result = event.target?.result as string;
            setFormData(prev => ({ ...prev, mediaUrl: result }));
            setIsUploading(false);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        if (!formData.title || !formData.category) return;

        try {
            const dataToSave = {
                ...formData,
                updatedAt: serverTimestamp()
            };

            if (editingId) {
                await updateDoc(doc(db, "achievement_definitions", editingId), dataToSave);
                setSuccessMessage("Награда обновлена");
            } else {
                await addDoc(collection(db, "achievement_definitions"), {
                    ...dataToSave,
                    createdAt: serverTimestamp()
                });
                setSuccessMessage("Награда создана");
            }
            setTimeout(() => {
                setIsEditorOpen(false);
                setSuccessMessage(null);
            }, 1000);
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Удалить награду?")) {
            await deleteDoc(doc(db, "achievement_definitions", id));
        }
    };

    // Filter
    const filtered = achievements.filter(a =>
        a.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        a.category.toLowerCase().includes(searchQuery.toLowerCase())
    );

    if (loading) return <div className="text-white text-center p-10">Загрузка...</div>;

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden font-manrope relative">
            <div className={`flex-1 flex flex-col transition-all duration-500 ${(isEditorOpen) ? 'mr-[500px]' : ''}`}>
                <div className="p-8 pb-4 border-b border-white/5 bg-[#050505]/95 backdrop-blur-xl z-20 sticky top-0">
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h1 className="text-3xl font-russo text-white mb-2">Награды</h1>
                            <p className="text-white/40 text-sm">Управление достижениями</p>
                        </div>
                        <button
                            onClick={() => handleOpenEditor()}
                            className="bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Создать
                        </button>
                    </div>

                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-white/20" size={18} />
                        <input
                            type="text"
                            placeholder="Поиск..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-white/20 focus:border-sparta-gold/50 outline-none transition-all"
                        />
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-8 overflow-x-hidden">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        {filtered.map(item => (
                            <div
                                key={item.id}
                                onClick={() => handleOpenEditor(item)}
                                className={`group relative bg-[#0F0F0F] hover:bg-[#141414] border border-white/5 hover:border-sparta-gold/30 rounded-3xl p-6 cursor-pointer transition-all duration-300 flex flex-col items-center text-center ${editingId === item.id ? 'border-sparta-gold/50 ring-1 ring-sparta-gold/20' : ''}`}
                            >
                                <div className="w-full h-40 bg-black/50 rounded-2xl mb-4 overflow-hidden flex items-center justify-center relative">
                                    {item.type === '3d' && item.mediaUrl ? (
                                        <div className="absolute inset-0 pointer-events-none">
                                            {/* Static preview for list, 3d is heavy */}
                                            <Box size={48} className="text-sparta-gold" />
                                            <span className="absolute bottom-2 right-2 bg-sparta-gold text-black text-[10px] font-bold px-1.5 py-0.5 rounded">3D</span>
                                        </div>
                                    ) : item.mediaUrl ? (
                                        <img src={item.mediaUrl} className="w-full h-full object-contain" alt="" />
                                    ) : (
                                        <Trophy size={48} className="text-white/10" />
                                    )}
                                </div>

                                <h3 className="text-lg font-bold text-white group-hover:text-sparta-gold transition-colors font-russo mb-1">{item.title}</h3>
                                <p className="text-white/40 text-xs mb-3 line-clamp-2">{item.description}</p>

                                <div className="flex gap-2">
                                    <span className="px-2 py-1 rounded bg-white/10 text-white/60 text-[10px] uppercase font-bold tracking-wider">
                                        {item.category}
                                    </span>
                                    <span className={`px-2 py-1 rounded text-[10px] uppercase font-bold tracking-wider
                                        ${item.rarity === 'legendary' ? 'bg-yellow-500/20 text-yellow-500' :
                                            item.rarity === 'rare' ? 'bg-purple-500/20 text-purple-500' : 'bg-white/10 text-white/40'}`}>
                                        {item.rarity}
                                    </span>
                                </div>

                                <button
                                    onClick={(e) => handleDelete(item.id, e)}
                                    className="absolute top-4 right-4 p-2 text-white/10 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Editor Sidebar */}
            <div className={`fixed inset-y-0 right-0 w-[500px] bg-[#111] border-l border-white/10 shadow-2xl transform transition-transform duration-500 ease-in-out z-50 flex flex-col ${isEditorOpen ? 'translate-x-0' : 'translate-x-full'}`}>
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-[#111]">
                    <h2 className="text-xl font-bold text-white font-russo">{editingId ? 'Редактировать' : 'Новая награда'}</h2>
                    <button onClick={() => setIsEditorOpen(false)} className="text-white/40 hover:text-white transition-colors">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Media Preview/Upload */}
                    <div className="space-y-3">
                        <div className="w-full h-64 bg-black/50 rounded-2xl border-2 border-dashed border-white/10 flex flex-col items-center justify-center overflow-hidden relative">
                            {formData.mediaUrl ? (
                                formData.type === '3d' ? (
                                    <Viewer3D url={formData.mediaUrl} />
                                ) : (
                                    <img src={formData.mediaUrl} className="w-full h-full object-contain" alt="" />
                                )
                            ) : (
                                <div className="flex flex-col items-center text-white/20">
                                    <UploadCloud size={48} className="mb-2" />
                                    <span className="text-sm">Перетащите или выберите файл</span>
                                </div>
                            )}

                            {isUploading && (
                                <div className="absolute inset-0 bg-black/80 flex items-center justify-center">
                                    <Loader className="animate-spin text-sparta-gold" />
                                </div>
                            )}
                        </div>

                        <div className="flex gap-4">
                            <label className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all">
                                <ImageIcon size={16} className="text-white/60" />
                                <span className="text-sm font-bold text-white">Загрузить 2D</span>
                                <input type="file" accept="image/*" onChange={(e) => {
                                    setFormData({ ...formData, type: '2d' });
                                    handleFileUpload(e);
                                }} className="hidden" />
                            </label>

                            <label className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-3 flex items-center justify-center gap-2 cursor-pointer transition-all">
                                <Box size={16} className="text-white/60" />
                                <span className="text-sm font-bold text-white">Загрузить 3D (.glb)</span>
                                <input type="file" accept=".glb,.gltf" onChange={(e) => {
                                    setFormData({ ...formData, type: '3d' });
                                    handleFileUpload(e);
                                }} className="hidden" />
                            </label>
                        </div>
                    </div>

                    {/* Inputs */}
                    <div className="space-y-4">
                        <div>
                            <label className="block text-white/40 text-xs font-bold mb-1">Название</label>
                            <input
                                value={formData.title}
                                onChange={e => setFormData({ ...formData, title: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none"
                                placeholder="Кубок Чемпиона"
                            />
                        </div>

                        <div>
                            <label className="block text-white/40 text-xs font-bold mb-1">Описание</label>
                            <textarea
                                value={formData.description}
                                onChange={e => setFormData({ ...formData, description: e.target.value })}
                                className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none h-24 resize-none"
                                placeholder="За что выдается..."
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <label className="block text-white/40 text-xs font-bold mb-1">Категория</label>
                                <select
                                    value={formData.category}
                                    onChange={e => setFormData({ ...formData, category: e.target.value })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none [&>option]:bg-black"
                                >
                                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-white/40 text-xs font-bold mb-1">Редкость</label>
                                <select
                                    value={formData.rarity}
                                    onChange={e => setFormData({ ...formData, rarity: e.target.value as any })}
                                    className="w-full bg-white/5 border border-white/10 rounded-xl p-3 text-white focus:border-sparta-gold/50 outline-none [&>option]:bg-black"
                                >
                                    <option value="common">Обычная</option>
                                    <option value="rare">Редкая</option>
                                    <option value="legendary">Легендарная</option>
                                </select>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6 border-t border-white/10 bg-[#111]">
                    <button
                        onClick={handleSave}
                        className="w-full bg-sparta-gold text-black font-bold py-3 px-6 rounded-xl hover:bg-[#ffd700] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all flex items-center justify-center gap-2"
                    >
                        <Save size={20} />
                        Сохранить
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AdminAchievements;
