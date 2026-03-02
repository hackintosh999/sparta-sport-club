import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Save, X, Search, ShoppingBag, ImageIcon, Loader2, DollarSign, Tag, Link as LinkIcon, Upload, Layers, List } from 'lucide-react';
import { db } from '../../firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, onSnapshot, serverTimestamp, query, orderBy } from 'firebase/firestore';
import { Product } from '../../types/shop';

const AdminShop: React.FC = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [currentProduct, setCurrentProduct] = useState<Partial<Product>>({});

    // Image States
    const [imageFile, setImageFile] = useState<File | null>(null);
    const [imagePreview, setImagePreview] = useState<string | null>(null);

    // Gallery States
    const [galleryFiles, setGalleryFiles] = useState<File[]>([]);
    const [galleryPreviews, setGalleryPreviews] = useState<string[]>([]);

    // Color Images States
    const [colorImageFiles, setColorImageFiles] = useState<Record<string, File>>({});
    const [colorImagePreviews, setColorImagePreviews] = useState<Record<string, string>>({});

    const [isSaving, setIsSaving] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState('Все');

    const categories = ['Все', 'Экипировка', 'Форма', 'Аксессуары', 'Сувениры'];
    const availableSizes = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '3XL', 'One Size'];

    // Initial Fetch
    useEffect(() => {
        const q = query(collection(db, 'products'), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Product)));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            setImageFile(file);
            setImagePreview(URL.createObjectURL(file));
        }
    };

    const handleGalleryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            setGalleryFiles(prev => [...prev, ...files]);
            const newPreviews = files.map(file => URL.createObjectURL(file));
            setGalleryPreviews(prev => [...prev, ...newPreviews]);
        }
    };

    const removeGalleryImage = (index: number) => {
        setGalleryFiles(prev => prev.filter((_, i) => i !== index));
        setGalleryPreviews(prev => prev.filter((_, i) => i !== index));
    };

    const removeExistingGalleryImage = (urlToRemove: string) => {
        if (currentProduct.gallery) {
            setCurrentProduct({
                ...currentProduct,
                gallery: currentProduct.gallery.filter(url => url !== urlToRemove)
            });
        }
    };

    // Helper to compress image to Base64
    const compressImage = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target?.result as string;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 800;
                    const MAX_HEIGHT = 800;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx?.drawImage(img, 0, 0, width, height);
                    // Compress to JPEG with 0.6 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.6);
                    resolve(dataUrl);
                };
                img.onerror = (error) => reject(error);
            };
            reader.onerror = (error) => reject(error);
        });
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSaving(true);

        try {
            let imageUrl = currentProduct.imageUrl || '';
            let galleryUrls = currentProduct.gallery || [];

            // Upload Main Image
            if (imageFile) {
                imageUrl = await compressImage(imageFile);
            }

            // Upload Gallery Images
            if (galleryFiles.length > 0) {
                const newGalleryUrls = await Promise.all(galleryFiles.map(file => compressImage(file)));
                galleryUrls = [...galleryUrls, ...newGalleryUrls];
            }

            // Upload Color Images
            const newColorImages: Record<string, string> = { ...(currentProduct.colorImages || {}) };
            for (const color of Object.keys(colorImageFiles)) {
                newColorImages[color] = await compressImage(colorImageFiles[color]);
            }

            const productData = {
                title: currentProduct.title || '',
                price: Number(currentProduct.price) || 0,
                category: currentProduct.category || 'Экипировка',
                description: currentProduct.description || '',
                imageUrl,
                colors: currentProduct.colors || [],
                colorImages: newColorImages,
                sizes: currentProduct.sizes || [],
                gallery: galleryUrls,
                specifications: Object.fromEntries(
                    Object.entries(currentProduct.specifications || {}).filter(([k, v]) => k.trim() !== '' && v.trim() !== '')
                ),
                orderLink: currentProduct.orderLink || '',
                updatedAt: serverTimestamp()
            };

            if (currentProduct.id) {
                await updateDoc(doc(db, 'products', currentProduct.id), productData);
            } else {
                await addDoc(collection(db, 'products'), {
                    ...productData,
                    createdAt: serverTimestamp()
                });
            }

            setIsEditing(false);
            setCurrentProduct({});
            setImageFile(null);
            setImagePreview(null);
            setGalleryFiles([]);
            setGalleryPreviews([]);
            setColorImageFiles({});
            setColorImagePreviews({});
        } catch (error: any) {
            console.error("Error saving product:", error);
            alert(`Ошибка при сохранении: ${error.message}`);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (window.confirm('Вы уверены, что хотите удалить этот товар?')) {
            try {
                await deleteDoc(doc(db, 'products', id));
            } catch (error) {
                console.error("Error deleting product:", error);
            }
        }
    };

    const handleSpecChange = (key: string, value: string, oldKey?: string) => {
        const newSpecs = { ...currentProduct.specifications };
        if (oldKey && oldKey !== key) {
            delete newSpecs[oldKey];
        }
        newSpecs[key] = value;
        setCurrentProduct({ ...currentProduct, specifications: newSpecs });
    };

    const removeSpec = (key: string) => {
        const newSpecs = { ...currentProduct.specifications };
        delete newSpecs[key];
        setCurrentProduct({ ...currentProduct, specifications: newSpecs });
    };

    const filteredProducts = products.filter(p => {
        const matchesSearch = p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            p.category.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesCategory = selectedCategory === 'Все' || p.category === selectedCategory;
        return matchesSearch && matchesCategory;
    });

    return (
        <div className="p-6 md:p-8 min-h-screen">
            <div className="flex flex-col md:flex-row justify-between items-center mb-8 gap-4">
                <div>
                    <h1 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-600 mb-2 flex items-center gap-3">
                        <ShoppingBag className="text-yellow-500" />
                        Магазин Экипировки
                    </h1>
                    <p className="text-gray-400">Управление товарами и ценами</p>
                </div>
                <button
                    onClick={() => {
                        setCurrentProduct({ category: 'Экипировка', specifications: {} });
                        setImagePreview(null);
                        setImageFile(null);
                        setGalleryFiles([]);
                        setGalleryPreviews([]);
                        setColorImageFiles({});
                        setColorImagePreviews({});
                        setIsEditing(true);
                    }}
                    className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-6 py-3 rounded-xl font-bold transition-all transform hover:scale-105 shadow-lg shadow-yellow-500/20"
                >
                    <Plus size={20} />
                    Добавить Товар
                </button>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col lg:flex-row gap-6 mb-8">
                {/* Search */}
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Поиск товаров..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 text-white placeholder-gray-500 focus:outline-none focus:border-yellow-500/50 transition-colors"
                    />
                </div>

                {/* Categories */}
                <div className="flex overflow-x-auto pb-2 lg:pb-0 gap-2 no-scrollbar">
                    {categories.map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-4 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${selectedCategory === cat
                                ? 'bg-yellow-500 text-black shadow-lg shadow-yellow-500/20'
                                : 'bg-white/5 text-gray-400 hover:bg-white/10 hover:text-white'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>
            </div>

            {/* Products Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                <AnimatePresence>
                    {filteredProducts.map(product => (
                        <motion.div
                            key={product.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-black/40 border border-white/5 rounded-2xl overflow-hidden group hover:border-yellow-500/30 transition-all"
                        >
                            <div className="relative h-48 bg-white/5">
                                {product.imageUrl ? (
                                    <img src={product.imageUrl} alt={product.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-600">
                                        <ImageIcon size={48} />
                                    </div>
                                )}
                                <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={() => {
                                            setCurrentProduct(product);
                                            setImagePreview(product.imageUrl);
                                            // Don't autopopulate gallery files since we can't convert URL to File easily
                                            // but we can show existing gallery URLs
                                            setGalleryFiles([]);
                                            setGalleryPreviews([]);
                                            setIsEditing(true);
                                        }}
                                        className="p-2 bg-black/80 text-yellow-500 rounded-lg hover:bg-yellow-500 hover:text-black transition-colors"
                                    >
                                        <Edit2 size={16} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(product.id)}
                                        className="p-2 bg-black/80 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition-colors"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                                <div className="absolute bottom-2 left-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded text-xs font-bold text-white flex items-center gap-1">
                                    <Tag size={12} className="text-yellow-500" />
                                    {product.category}
                                </div>
                            </div>
                            <div className="p-4">
                                <h3 className="font-bold text-lg text-white mb-1 truncate">{product.title}</h3>
                                <p className="text-yellow-400 font-mono font-bold text-xl mb-2">{product.price.toLocaleString()} ₽</p>
                                <p className="text-sm text-gray-500 line-clamp-2">{product.description}</p>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {loading && (
                <div className="flex justify-center py-20">
                    <Loader2 className="animate-spin text-yellow-500" size={48} />
                </div>
            )}

            {/* Edit Modal */}
            <AnimatePresence>
                {isEditing && (
                    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
                        <motion.div
                            initial={{ scale: 0.9, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            exit={{ scale: 0.9, opacity: 0 }}
                            className="bg-[#1a1a1a] border border-white/10 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
                        >
                            <div className="p-6 border-b border-white/5 flex justify-between items-center sticky top-0 bg-[#1a1a1a] z-10">
                                <h2 className="text-2xl font-bold text-white">
                                    {currentProduct.id ? 'Редактировать Товар' : 'Новый Товар'}
                                </h2>
                                <button onClick={() => setIsEditing(false)} className="text-gray-400 hover:text-white">
                                    <X size={24} />
                                </button>
                            </div>

                            <form onSubmit={handleSave} className="p-6 space-y-8">
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                                    {/* Left Column: Images */}
                                    <div className="space-y-6">
                                        {/* Main Image */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-400 mb-2">Основное фото</h3>
                                            <div
                                                onClick={() => document.getElementById('product-image')?.click()}
                                                className="aspect-square bg-black/40 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:border-yellow-500/50 transition-colors relative overflow-hidden group"
                                            >
                                                {imagePreview ? (
                                                    <>
                                                        <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <span className="text-white font-medium flex items-center gap-2">
                                                                <Upload size={20} /> Изменить
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : currentProduct.imageUrl ? (
                                                    <>
                                                        <img src={currentProduct.imageUrl} alt="Preview" className="w-full h-full object-cover" />
                                                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                            <span className="text-white font-medium flex items-center gap-2">
                                                                <Upload size={20} /> Изменить
                                                            </span>
                                                        </div>
                                                    </>
                                                ) : (
                                                    <div className="text-center">
                                                        <ImageIcon className="text-gray-600 mb-2 mx-auto" size={40} />
                                                        <span className="text-gray-500 text-sm">Загрузить фото</span>
                                                    </div>
                                                )}
                                            </div>
                                            <input
                                                id="product-image"
                                                type="file"
                                                accept="image/*"
                                                onChange={handleImageChange}
                                                className="hidden"
                                            />
                                        </div>

                                        {/* Gallery */}
                                        <div>
                                            <h3 className="text-sm font-bold text-gray-400 mb-2">Галерея</h3>
                                            <div className="grid grid-cols-3 gap-2 mb-2">
                                                {currentProduct.gallery?.map((url, idx) => (
                                                    <div key={`existing-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group">
                                                        <img src={url} alt="" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeExistingGalleryImage(url)}
                                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {galleryPreviews.map((preview, idx) => (
                                                    <div key={`new-${idx}`} className="relative aspect-square rounded-lg overflow-hidden group">
                                                        <img src={preview} alt="" className="w-full h-full object-cover" />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeGalleryImage(idx)}
                                                            className="absolute top-1 right-1 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                                                        >
                                                            <X size={12} />
                                                        </button>
                                                    </div>
                                                ))}
                                                <div
                                                    onClick={() => document.getElementById('gallery-images')?.click()}
                                                    className="aspect-square bg-black/40 border-2 border-dashed border-white/10 rounded-lg flex items-center justify-center cursor-pointer hover:border-yellow-500/50 transition-colors"
                                                >
                                                    <Plus className="text-gray-500" />
                                                </div>
                                            </div>
                                            <input
                                                id="gallery-images"
                                                type="file"
                                                accept="image/*"
                                                multiple
                                                onChange={handleGalleryChange}
                                                className="hidden"
                                            />
                                        </div>
                                    </div>

                                    {/* Right Column: Details */}
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-gray-400 text-sm mb-1">Название</label>
                                                <input
                                                    required
                                                    value={currentProduct.title || ''}
                                                    onChange={e => setCurrentProduct({ ...currentProduct, title: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-500/50 focus:outline-none"
                                                    placeholder="Название товара"
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-gray-400 text-sm mb-1">Цена (₽)</label>
                                                <input
                                                    type="number"
                                                    required
                                                    value={currentProduct.price || ''}
                                                    onChange={e => setCurrentProduct({ ...currentProduct, price: Number(e.target.value) })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-500/50 focus:outline-none"
                                                    placeholder="0"
                                                />
                                            </div>
                                        </div>

                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Описание</label>
                                            <textarea
                                                rows={3}
                                                value={currentProduct.description || ''}
                                                onChange={e => setCurrentProduct({ ...currentProduct, description: e.target.value })}
                                                className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-500/50 focus:outline-none"
                                                placeholder="Описание..."
                                            />
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <label className="block text-gray-400 text-sm mb-1">Категория</label>
                                                <select
                                                    value={currentProduct.category || 'Экипировка'}
                                                    onChange={e => setCurrentProduct({ ...currentProduct, category: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-500/50 focus:outline-none"
                                                >
                                                    {categories.filter(c => c !== 'Все').map(c => (
                                                        <option key={c} value={c}>{c}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <div>
                                                <label className="block text-gray-400 text-sm mb-1">Ссылка VK</label>
                                                <input
                                                    value={currentProduct.orderLink || ''}
                                                    onChange={e => setCurrentProduct({ ...currentProduct, orderLink: e.target.value })}
                                                    className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-white focus:border-yellow-500/50 focus:outline-none"
                                                    placeholder="VK Market Link"
                                                />
                                            </div>
                                        </div>

                                        {/* Colors */}
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Цвета</label>
                                            <div className="flex flex-wrap gap-2 mb-4">
                                                {['Черный', 'Белый', 'Красный', 'Синий', 'Зеленый', 'Желтый', 'Оранжевый', 'Неоново-Зеленый'].map(color => (
                                                    <button
                                                        key={color}
                                                        type="button"
                                                        onClick={() => {
                                                            const newColors = currentProduct.colors?.includes(color)
                                                                ? currentProduct.colors.filter(c => c !== color)
                                                                : [...(currentProduct.colors || []), color];
                                                            setCurrentProduct({ ...currentProduct, colors: newColors });
                                                            // Cleanup image state if unselected
                                                            if (currentProduct.colors?.includes(color)) {
                                                                const newFiles = { ...colorImageFiles };
                                                                delete newFiles[color];
                                                                setColorImageFiles(newFiles);

                                                                const newPreviews = { ...colorImagePreviews };
                                                                delete newPreviews[color];
                                                                setColorImagePreviews(newPreviews);
                                                            }
                                                        }}
                                                        className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${currentProduct.colors?.includes(color)
                                                            ? 'bg-yellow-500 border-yellow-500 text-black'
                                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'
                                                            }`}
                                                    >
                                                        {color}
                                                    </button>
                                                ))}
                                            </div>

                                            {/* Color Images Setup */}
                                            {currentProduct.colors && currentProduct.colors.length > 0 && (
                                                <div className="space-y-3 mt-4 border-t border-white/10 pt-4">
                                                    <label className="block text-gray-400 text-sm">Фотографии для цветов (опционально)</label>
                                                    {currentProduct.colors.map(color => (
                                                        <div key={color} className="flex items-center gap-4 bg-black/40 p-2 rounded-xl border border-white/5">
                                                            <div className="w-24 text-sm font-bold text-white px-2">
                                                                {color}
                                                            </div>
                                                            <div
                                                                className="w-12 h-12 rounded-lg border border-dashed border-white/20 flex flex-shrink-0 items-center justify-center overflow-hidden cursor-pointer hover:border-yellow-500/50 relative group bg-[#1a1a1a]"
                                                                onClick={() => document.getElementById(`color-btn-${color}`)?.click()}
                                                            >
                                                                {colorImagePreviews[color] ? (
                                                                    <img src={colorImagePreviews[color]} className="w-full h-full object-cover" alt={color} />
                                                                ) : currentProduct.colorImages?.[color] ? (
                                                                    <img src={currentProduct.colorImages[color]} className="w-full h-full object-cover" alt={color} />
                                                                ) : (
                                                                    <ImageIcon size={16} className="text-gray-500" />
                                                                )}
                                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                                                    <Upload size={14} className="text-white" />
                                                                </div>
                                                            </div>
                                                            <input
                                                                id={`color-btn-${color}`}
                                                                type="file"
                                                                accept="image/*"
                                                                className="hidden"
                                                                onChange={(e) => {
                                                                    if (e.target.files && e.target.files[0]) {
                                                                        const file = e.target.files[0];
                                                                        setColorImageFiles(prev => ({ ...prev, [color]: file }));
                                                                        setColorImagePreviews(prev => ({ ...prev, [color]: URL.createObjectURL(file) }));
                                                                    }
                                                                }}
                                                            />
                                                            {/* Delete color image button */}
                                                            {(colorImagePreviews[color] || currentProduct.colorImages?.[color]) && (
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        const newFiles = { ...colorImageFiles };
                                                                        delete newFiles[color];
                                                                        setColorImageFiles(newFiles);

                                                                        const newPreviews = { ...colorImagePreviews };
                                                                        delete newPreviews[color];
                                                                        setColorImagePreviews(newPreviews);

                                                                        if (currentProduct.colorImages) {
                                                                            const newProductInfo = { ...currentProduct.colorImages };
                                                                            delete newProductInfo[color];
                                                                            setCurrentProduct({ ...currentProduct, colorImages: newProductInfo });
                                                                        }
                                                                    }}
                                                                    className="p-2 text-red-500 hover:bg-white/5 rounded-lg transition-colors"
                                                                >
                                                                    <Trash2 size={16} />
                                                                </button>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>

                                        {/* Sizes */}
                                        <div>
                                            <label className="block text-gray-400 text-sm mb-1">Размеры</label>
                                            <div className="flex flex-wrap gap-2">
                                                {availableSizes.map(size => (
                                                    <button
                                                        key={size}
                                                        type="button"
                                                        onClick={() => {
                                                            const newSizes = currentProduct.sizes?.includes(size)
                                                                ? currentProduct.sizes.filter(s => s !== size)
                                                                : [...(currentProduct.sizes || []), size];
                                                            setCurrentProduct({ ...currentProduct, sizes: newSizes });
                                                        }}
                                                        className={`px-3 py-1 rounded-md text-xs font-bold border transition-all ${currentProduct.sizes?.includes(size)
                                                            ? 'bg-white text-black border-white'
                                                            : 'bg-black/40 border-white/10 text-gray-400 hover:border-white/30'
                                                            }`}
                                                    >
                                                        {size}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>

                                        {/* Specifications */}
                                        <div>
                                            <div className="flex justify-between items-center mb-2">
                                                <label className="block text-gray-400 text-sm">Характеристики</label>
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        const newSpecs = { ...currentProduct.specifications, '': '' };
                                                        setCurrentProduct({ ...currentProduct, specifications: newSpecs });
                                                    }}
                                                    className="text-xs text-yellow-500 hover:text-yellow-400 flex items-center gap-1"
                                                >
                                                    <Plus size={12} /> Добавить
                                                </button>
                                            </div>
                                            <div className="space-y-2">
                                                {Object.entries(currentProduct.specifications || {}).map(([key, value], idx) => (
                                                    <div key={idx} className="flex gap-2">
                                                        <input
                                                            placeholder="Название (напр. Состав)"
                                                            value={key}
                                                            onChange={(e) => handleSpecChange(e.target.value, value, key)}
                                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-yellow-500/50 focus:outline-none"
                                                        />
                                                        <input
                                                            placeholder="Значение (напр. Хлопок)"
                                                            value={value}
                                                            onChange={(e) => handleSpecChange(key, e.target.value)}
                                                            className="flex-1 bg-black/40 border border-white/10 rounded-lg p-2 text-sm text-white focus:border-yellow-500/50 focus:outline-none"
                                                        />
                                                        <button
                                                            type="button"
                                                            onClick={() => removeSpec(key)}
                                                            className="text-red-500 hover:text-red-400 p-2"
                                                        >
                                                            <Trash2 size={16} />
                                                        </button>
                                                    </div>
                                                ))}
                                                {Object.keys(currentProduct.specifications || {}).length === 0 && (
                                                    <p className="text-gray-600 text-xs italic">Нет характеристик</p>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4 border-t border-white/5">
                                    <button
                                        type="button"
                                        onClick={() => setIsEditing(false)}
                                        className="px-6 py-3 rounded-xl font-bold text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
                                    >
                                        Отмена
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isSaving}
                                        className="flex items-center gap-2 bg-yellow-500 hover:bg-yellow-400 text-black px-8 py-3 rounded-xl font-bold transition-all shadow-lg shadow-yellow-500/20 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSaving ? <Loader2 className="animate-spin" /> : <Save size={20} />}
                                        Сохранить
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default AdminShop;
