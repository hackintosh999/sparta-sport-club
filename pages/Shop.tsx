import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ShoppingBag, Search, Tag, ExternalLink, Loader2, ArrowLeft, Filter, SlidersHorizontal, ChevronDown, Check, Heart } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, orderBy, onSnapshot } from 'firebase/firestore';
import { Product } from '../types/shop';
import { useFavorites } from '../context/FavoritesContext';
import { useNavigate } from 'react-router-dom';

const Shop = () => {
    const navigate = useNavigate();
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const { toggleFavorite, isFavorite } = useFavorites();
    const [searchTerm, setSearchTerm] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('All');
    const [selectedColor, setSelectedColor] = useState('All');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [isFiltersOpen, setIsFiltersOpen] = useState(false);

    useEffect(() => {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const categories = ['All', ...Array.from(new Set(products.map(p => p.category)))];

    // Extract all unique colors from all products
    const allColors = Array.from(new Set(products.flatMap(p => p.colors || [])));
    const colors = ['All', ...allColors];

    const filteredProducts = products
        .filter(p => {
            const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase());

            if (selectedCategory === 'Favorites') {
                return matchesSearch && isFavorite(p.id);
            }

            const matchesCategory = selectedCategory === 'All' || p.category === selectedCategory;
            const matchesColor = selectedColor === 'All' || (p.colors && p.colors.includes(selectedColor));
            return matchesSearch && matchesCategory && matchesColor;
        })
        .sort((a, b) => {
            return sortOrder === 'asc' ? a.price - b.price : b.price - a.price;
        });

    return (
        <div className="min-h-screen bg-[#020202] text-white font-manrope">
            {/* Header */}
            <div className="relative overflow-hidden bg-[#1a1a1a] border-b border-white/5 pb-10 pt-32 px-6">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                    <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-yellow-500/10 rounded-full blur-[100px]" />
                    <div className="absolute bottom-[-10%] left-[-10%] w-[600px] h-[600px] bg-yellow-600/5 rounded-full blur-[120px]" />
                </div>

                <div className="max-w-7xl mx-auto relative z-10">
                    <button
                        onClick={() => navigate('/')}
                        className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-8 group"
                    >
                        <ArrowLeft size={20} className="group-hover:-translate-x-1 transition-transform" />
                        Назад на главную
                    </button>

                    <h1 className="text-4xl md:text-6xl font-transducer font-black text-transparent bg-clip-text bg-gradient-to-r from-white via-gray-200 to-gray-500 mb-4 uppercase">
                        Магазин <span className="text-yellow-500">Sparta</span>
                    </h1>
                    <p className="text-gray-400 text-lg max-w-2xl">
                        Профессиональная экипировка для чемпионов.
                    </p>
                </div>
            </div>

            {/* Content */}
            <div className="max-w-7xl mx-auto px-6 py-10 relative z-20">
                {/* Mobile Filter Toggle */}
                <button
                    onClick={() => setIsFiltersOpen(!isFiltersOpen)}
                    className="md:hidden w-full mb-6 flex items-center justify-between bg-[#1a1a1a] border border-white/10 p-4 rounded-xl text-white font-bold"
                >
                    <span className="flex items-center gap-2"><Filter size={20} className="text-yellow-500" /> Фильтры</span>
                    <ChevronDown className={`transition-transform ${isFiltersOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Filters Container */}
                <div className={`flex flex-col lg:flex-row gap-8 mb-10 ${isFiltersOpen ? 'block' : 'hidden md:flex'}`}>

                    {/* Filters Sidebar */}
                    <div className="w-full lg:w-64 flex-shrink-0 space-y-8">
                        {/* Search */}
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                            <input
                                type="text"
                                placeholder="Поиск..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl py-3 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
                            />
                        </div>

                        {/* Price Sort */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Цена</h3>
                            <div className="flex bg-[#1a1a1a] p-1 rounded-xl border border-white/10">
                                <button
                                    onClick={() => setSortOrder('asc')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${sortOrder === 'asc' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Дешевле
                                </button>
                                <button
                                    onClick={() => setSortOrder('desc')}
                                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition-all ${sortOrder === 'desc' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-white'}`}
                                >
                                    Дороже
                                </button>
                            </div>
                        </div>

                        {/* Categories */}
                        <div>
                            <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Категории</h3>
                            <div className="space-y-2">
                                {categories.map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setSelectedCategory(cat)}
                                        className={`w-full text-left px-4 py-3 rounded-xl font-medium transition-all flex justify-between items-center ${selectedCategory === cat
                                            ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                                            : 'bg-[#1a1a1a] text-gray-400 hover:bg-white/5 hover:text-white border border-white/5'
                                            }`}
                                    >
                                        {cat === 'All' ? 'Все товары' : cat}
                                        {selectedCategory === cat && <Check size={16} />}
                                    </button>
                                ))}
                            </div>

                            {/* Favorites Filter */}
                            <button
                                onClick={() => setSelectedCategory('Favorites')}
                                className={`w-full py-3 rounded-xl font-bold transition-all flex items-center justify-center gap-2 mt-2 ${selectedCategory === 'Favorites'
                                        ? 'bg-red-500 text-white shadow-lg shadow-red-500/20'
                                        : 'bg-[#1a1a1a] text-gray-400 hover:text-red-500 border border-white/5 hover:border-red-500/20'
                                    }`}
                            >
                                <Heart size={20} fill={selectedCategory === 'Favorites' ? "currentColor" : "none"} />
                                Избранное
                            </button>
                        </div>

                        {/* Colors */}
                        {colors.length > 1 && (
                            <div>
                                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-3">Цвет</h3>
                                <div className="flex flex-wrap gap-2">
                                    {colors.map(color => (
                                        <button
                                            key={color}
                                            onClick={() => setSelectedColor(color)}
                                            className={`px-3 py-1.5 rounded-lg text-sm font-bold border transition-all ${selectedColor === color
                                                ? 'bg-white text-black border-white'
                                                : 'bg-[#1a1a1a] text-gray-400 border-white/10 hover:border-white/30'
                                                }`}
                                        >
                                            {color === 'All' ? 'Все' : color}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Products Grid */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex justify-center py-20">
                                <Loader2 className="animate-spin text-yellow-500" size={48} />
                            </div>
                        ) : filteredProducts.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                <AnimatePresence>
                                    {filteredProducts.map((product, index) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, scale: 0.9 }}
                                            transition={{ delay: index * 0.05 }}
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
                                                    className="absolute top-3 right-3 p-2 bg-black/60 backdrop-blur-md rounded-full text-white hover:scale-110 transition-transform z-10"
                                                >
                                                    <Heart size={20} fill={isFavorite(product.id) ? "#ef4444" : "none"} className={isFavorite(product.id) ? "text-red-500" : "text-white"} />
                                                </button>

                                                <div className="absolute top-3 left-3 flex gap-2">
                                                    <span className="px-2 py-1 bg-black/60 backdrop-blur-md rounded-md text-xs font-bold text-white border border-white/10">
                                                        {product.category}
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="p-5 flex flex-col flex-1">
                                                <div className="mb-4">
                                                    <h3 className="text-lg font-bold text-white leading-tight mb-1">{product.title}</h3>
                                                    {product.colors && product.colors.length > 0 && (
                                                        <div className="flex gap-1 mt-2">
                                                            {product.colors.map(c => (
                                                                <div key={c} className="w-3 h-3 rounded-full border border-white/10" style={{ backgroundColor: c === 'Белый' ? '#fff' : c === 'Черный' ? '#000' : c === 'Синий' ? '#00f' : c === 'Красный' ? '#f00' : c === 'Зеленый' ? '#0f0' : c === 'Желтый' ? '#ff0' : c === 'Оранжевый' ? '#ffa500' : '#888' }} />
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>

                                                <p className="text-gray-500 text-sm mb-4 line-clamp-2">{product.description}</p>

                                                <div className="mt-auto">
                                                    <div className="flex items-center justify-between mb-3">
                                                        <span className="text-xl font-bold text-yellow-500 font-mono">
                                                            {product.price.toLocaleString()} ₽
                                                        </span>
                                                    </div>

                                                    <div className="flex gap-2">
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                navigate(`/shop/${product.id}`);
                                                            }}
                                                            className="flex-1 py-2 bg-[#2a2a2a] hover:bg-[#333] text-white rounded-xl text-sm font-bold transition-all border border-white/5"
                                                        >
                                                            Подробнее
                                                        </button>

                                                        {product.orderLink ? (
                                                            <a
                                                                href={product.orderLink}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2"
                                                            >
                                                                Купить <ExternalLink size={14} />
                                                            </a>
                                                        ) : (
                                                            <button
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    window.open('https://vk.com/sparta_fk', '_blank');
                                                                }}
                                                                className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded-xl text-sm font-bold transition-all"
                                                            >
                                                                Купить
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </motion.div>
                                    ))}
                                </AnimatePresence>
                            </div>
                        ) : (
                            <div className="text-center py-20 text-gray-500">
                                <ShoppingBag className="mx-auto mb-4 opacity-20" size={64} />
                                <p className="text-xl font-bold">Товары не найдены</p>
                                <p className="text-sm">Попробуйте изменить фильтры</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Shop;
