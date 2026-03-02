import React, { useState, useEffect } from 'react';
import { db } from '../../firebase';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { Shield, Plus, X, Loader } from 'lucide-react';

const AdminSettings = () => {
    const [stopWords, setStopWords] = useState<string[]>([]);
    const [newWord, setNewWord] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const docRef = doc(db, 'settings', 'moderation');
                const docSnap = await getDoc(docRef);
                if (docSnap.exists() && docSnap.data().stopWords) {
                    setStopWords(docSnap.data().stopWords);
                }
            } catch (error) {
                console.error("Error fetching moderation settings", error);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleAddWord = async (e: React.FormEvent) => {
        e.preventDefault();
        const word = newWord.trim().toLowerCase();
        if (!word || stopWords.includes(word)) return;

        const updatedWords = [...stopWords, word];
        setStopWords(updatedWords);
        setNewWord('');
        await saveSettings(updatedWords);
    };

    const handleRemoveWord = async (wordToRemove: string) => {
        const updatedWords = stopWords.filter(w => w !== wordToRemove);
        setStopWords(updatedWords);
        await saveSettings(updatedWords);
    };

    const saveSettings = async (words: string[]) => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'moderation'), { stopWords: words }, { merge: true });
        } catch (error) {
            console.error("Error saving moderation settings", error);
            alert("Ошибка при сохранении настроек.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <Loader className="w-8 h-8 text-sparta-gold animate-spin" />
            </div>
        );
    }

    return (
        <div>
            <h1 className="text-3xl font-russo text-white mb-8">Настройки системы</h1>

            <div className="bg-[#1a1a1a] border border-white/5 rounded-2xl p-8">
                <div className="flex items-center gap-3 mb-6">
                    <Shield className="text-sparta-gold" size={24} />
                    <h2 className="text-xl font-russo text-white">Анти-спам фильтр (Стоп-слова)</h2>
                </div>
                <p className="text-white/50 text-sm mb-6 max-w-2xl">
                    Здесь вы можете добавить запрещенные слова. Если пользователь попытается отправить комментарий,
                    содержащий любое из этих слов, его сообщение будет автоматически скрыто от других пользователей
                    и отправлено на модерацию (вы сможете увидеть его в панели как скрытое).
                </p>

                <form onSubmit={handleAddWord} className="flex gap-3 mb-8 max-w-md">
                    <input
                        type="text"
                        value={newWord}
                        onChange={(e) => setNewWord(e.target.value)}
                        placeholder="Введите стоп-слово..."
                        className="flex-1 bg-black/50 border border-white/10 rounded-xl px-4 py-2.5 text-white focus:border-sparta-gold outline-none text-sm transition-colors"
                    />
                    <button
                        type="submit"
                        disabled={!newWord.trim() || saving}
                        className="bg-sparta-gold text-black px-4 py-2.5 rounded-xl font-bold flex items-center gap-2 hover:bg-[#ffd700] transition-colors disabled:opacity-50"
                    >
                        <Plus size={18} />
                        Добавить
                    </button>
                </form>

                <div className="flex flex-wrap gap-2">
                    {stopWords.length === 0 ? (
                        <div className="text-white/30 text-sm italic">Список стоп-слов пуст</div>
                    ) : (
                        stopWords.map((word, idx) => (
                            <div key={idx} className="bg-white/5 border border-white/10 rounded-lg px-3 py-1.5 flex items-center gap-2 group">
                                <span className="text-white text-sm">{word}</span>
                                <button
                                    onClick={() => handleRemoveWord(word)}
                                    className="text-white/30 hover:text-red-500 transition-colors opacity-0 group-hover:opacity-100"
                                >
                                    <X size={14} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
                {saving && <div className="text-xs text-white/30 mt-4 flex items-center gap-2"><Loader size={12} className="animate-spin" /> Сохранение...</div>}
            </div>
        </div>
    );
};

export default AdminSettings;
