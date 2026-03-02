import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, ShoppingBag, Heart, ExternalLink, Loader2 } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs, documentId } from 'firebase/firestore';
import { Product } from '../types/shop';
import { useFavorites } from '../context/FavoritesContext';

const Favorites = () => {
    const navigate = useNavigate();
    const { favorites, toggleFavorite } = useFavorites();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchFavorites = async () => {
            if (favorites.length === 0) {
                setProducts([]);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                // Firestore 'in' query supports up to 10 items. 
                // For production with many favorites, we'd need to batch requests or fetch all and filter.
                // Here we'll do chunks of 10.
                const chunks = [];
                for (let i = 0; i < favorites.length; i += 10) {
                    chunks.push(favorites.slice(i, i + 10));
                }

                let allProducts: Product[] = [];
                for (const chunk of chunks) {
                    const q = query(collection(db, 'products'), where(documentId(), 'in', chunk));
                    const snapshot = await getDocs(q);
                    const chunkProducts = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product));
                    allProducts = [...allProducts, ...chunkProducts];
                }

                setProducts(allProducts);
            } catch (error) {
                console.error("Error fetching favorites:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchFavorites();
    }, [favorites]);

    return (
        <div className="min-h-screen bg-[#020202] text-white font-manrope pt-24 pb-10">
            <div className="max-w-7xl mx-auto px-6">
                <div className="flex items-center gap-4 mb-8">
                    <button
                        onClick={() => navigate('/shop')}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
                    >
                        <ArrowLeft size={24} />
                    </button>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 flex items-center gap-3">
                        <Heart className="text-red-500 fill-red-500" />
                        Избранное
                    </h1>
                </div>

                {loading ? (
                    <div className="flex justify-center py-20">
                        <Loader2 className="animate-spin text-yellow-500" size={48} />
                    </div>
                ) : products.length > 0 ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <AnimatePresence>
                            {products.map((product) => (
                                <motion.div
                                    key={product.id}
                                    layout
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className="group bg-[#151515] border border-white/5 rounded-2xl overflow-hidden hover:border-yellow-500/30 transition-all hover:-translate-y-1 hover:shadow-xl flex flex-col cursor-pointer"
                                    onClick={() => navigate(`/shop/${product.id}`)}
                                >
                                    <div className="relative aspect-square bg-white/5 overflow-hidden">
                                        {product.imageUrl ? (
                                            <img
                                                src={product.imageUrl}
                                                alt={product.title}
                                                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            />
                                        ) : (
                                            <div className="w-full h-full flex items-center justify-center text-gray-700">
                                                <ShoppingBag size={48} />
                                            </div>
                                        )}

                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleFavorite(product.id);
                                            }}
                                            className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full text-red-500 hover:scale-110 transition-transform z-10"
                                        >
                                            <Heart size={20} fill="currentColor" />
                                        </button>

                                        <div className="absolute top-3 left-3 flex gap-2">
                                            <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-bold text-white border border-white/10">
                                                {product.category}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="p-5 flex flex-col flex-1">
                                        <h3 className="text-lg font-bold text-white leading-tight mb-2">{product.title}</h3>
                                        <div className="mt-auto flex items-center justify-between">
                                            <span className="text-xl font-bold text-yellow-500 font-mono">
                                                {product.price.toLocaleString()} ₽
                                            </span>
                                            <button className="text-sm font-bold text-gray-400 hover:text-white transition-colors">
                                                Подробнее
                                            </button>
                                        </div>
                                    </div>
                                </motion.div>
                            ))}
                        </AnimatePresence>
                    </div>
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 text-center">
                        <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mb-6">
                            <Heart className="text-gray-600" size={48} />
                        </div>
                        <h2 className="text-2xl font-bold text-white mb-2">В избранном пока пусто</h2>
                        <p className="text-gray-500 mb-8 max-w-md">
                            Добавляйте понравившиеся товары, чтобы не потерять их и быстро найти при заказе.
                        </p>
                        <button
                            onClick={() => navigate('/shop')}
                            className="px-8 py-3 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20"
                        >
                            Перейти в каталог
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default Favorites;
