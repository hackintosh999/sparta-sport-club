import React, { useEffect, useState } from 'react';
import { db } from '../firebase';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { Calendar, ArrowRight } from 'lucide-react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

interface RelatedNewsListProps {
    category: string;
    currentId: string;
    onSelect: (item: any) => void;
}

const RelatedNewsList: React.FC<RelatedNewsListProps> = ({ category, currentId, onSelect }) => {
    const [news, setNews] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchRelated = async () => {
            if (!category) return;

            try {
                // Fetch more than 3 to filter out currentId locally if needed, 
                // though usually we want to exclude it in query if possible. 
                // Firestore != queries are limited, so simpler to fetch slightly more and filter.
                const q = query(
                    collection(db, "news"),
                    where("category", "==", category),
                    where("status", "==", "published"),
                    orderBy("createdAt", "desc"),
                    limit(4)
                );

                const snapshot = await getDocs(q);
                const data = snapshot.docs
                    .map(doc => ({ id: doc.id, ...doc.data() }))
                    .filter((item: any) => item.id !== currentId)
                    .slice(0, 3);

                setNews(data);
            } catch (error) {
                console.error("Error fetching related news:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchRelated();
    }, [category, currentId]);

    if (loading) return <div className="text-white/30 text-sm mt-8">Загрузка рекомендаций...</div>;

    // Move header inside to control visibility together
    return (
        <div className="w-full">
            <h3 className="text-2xl font-russo text-white mb-8">Читайте также</h3>
            {news.length === 0 ? (
                <div className="text-white/30 italic">В этой категории пока нет других новостей.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {news.map(item => (
                        <div
                            key={item.id}
                            onClick={() => onSelect(item)}
                            className="group cursor-pointer bg-white/5 rounded-2xl overflow-hidden border border-white/5 hover:border-sparta-gold/30 hover:bg-white/10 transition-all"
                        >
                            <div className="h-40 overflow-hidden relative">
                                {item.image || item.imageUrl ? (
                                    <img
                                        src={item.image || item.imageUrl || item.images?.[0]}
                                        alt={item.title}
                                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-[#111] flex items-center justify-center text-white/10 font-russo">
                                        SPARTA
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors" />
                            </div>
                            <div className="p-5">
                                <div className="flex items-center gap-2 text-[10px] text-white/40 mb-2">
                                    <Calendar size={10} />
                                    {item.createdAt?.seconds ? format(new Date(item.createdAt.seconds * 1000), 'd MMM', { locale: ru }) : ''}
                                </div>
                                <h4 className="font-bold text-white text-sm mb-3 line-clamp-2 group-hover:text-sparta-gold transition-colors">
                                    {item.title}
                                </h4>
                                <div className="flex items-center text-sparta-gold text-xs font-bold uppercase tracking-wider gap-1 opacity-0 transform translate-y-2 group-hover:opacity-100 group-hover:translate-y-0 transition-all">
                                    Читать <ArrowRight size={12} />
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RelatedNewsList;
