import { db } from '../firebase';
import { collection, addDoc, getDocs, deleteDoc, doc, serverTimestamp, query, where } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const artifactsDir = `C:\\Users\\User\\.gemini\\antigravity\\brain\\c1afd9a6-fb5b-4476-aa73-94c20babd6fc`;

const colorFiles: Record<string, string> = {
    'Зеленый': 'uniform_green_1772221654806.png',
    'Красный': 'uniform_red_1772221666740.png',
    'Синий': 'uniform_blue_1772221679188.png',
    'Белый': 'uniform_white_1772221692036.png',
    'Черный': 'uniform_black_1772221703922.png'
};

const consolidatedProduct = {
    title: 'Игровая форма Sparta',
    price: 3500,
    category: 'Форма',
    description: 'Официальная игровая форма Sparta (футболка + шорты) от бренда Joma. Легкая дышащая ткань, отличный отвод влаги и долговечность материала.',
    colors: ['Зеленый', 'Красный', 'Синий', 'Белый', 'Черный'],
    sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
    specifications: {
        'Материал': '100% Полиэстер Interlock',
        'Комплектация': 'Футболка и шорты',
        'Сезон': 'Для зала / Лето'
    },
    orderLink: 'https://vk.com/sparta_fk'
};

async function seed() {
    console.log("Starting consolidation seed...");
    // 1. Delete previous individual uniforms
    const q = query(collection(db, 'products'), where('category', '==', 'Форма'));
    const snapshot = await getDocs(q);

    // We only want to delete the ones we just added (based on titles)
    const titlesToDelete = [
        'Игровая форма Sparta (Зеленая)',
        'Игровая форма Sparta (Красная)',
        'Игровая форма Sparta (Синяя)',
        'Игровая форма Sparta (Белая)',
        'Тренировочная форма Sparta (Черная)',
        'Игровая форма Sparta' // in case we run this multiple times
    ];

    for (const d of snapshot.docs) {
        if (titlesToDelete.includes(d.data().title)) {
            await deleteDoc(doc(db, 'products', d.id));
            console.log(`Deleted old variant: ${d.data().title}`);
        }
    }

    // 2. Prepare colorImages map using public paths
    const colorImages: Record<string, string> = {};
    const gallery: string[] = [];
    let mainImageUrl = '';

    for (const [color, filename] of Object.entries(colorFiles)) {
        const publicUrl = `/shop/${filename}`;
        colorImages[color] = publicUrl;
        gallery.push(publicUrl);
        if (!mainImageUrl) {
            mainImageUrl = publicUrl; // Use first one (Green) as main
        }
    }

    // 3. Insert consolidated product
    try {
        const docRef = await addDoc(collection(db, 'products'), {
            title: consolidatedProduct.title,
            price: consolidatedProduct.price,
            category: consolidatedProduct.category,
            description: consolidatedProduct.description,
            imageUrl: mainImageUrl,
            gallery: gallery, // The gallery will also show all colors
            colors: consolidatedProduct.colors,
            colorImages: colorImages, // <--- New mapping attribute
            sizes: consolidatedProduct.sizes,
            specifications: consolidatedProduct.specifications,
            orderLink: consolidatedProduct.orderLink,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
        });
        console.log(`Added Consolidated Uniform Product with ID: ${docRef.id}`);
    } catch (e) {
        console.error(`Error adding consolidated product:`, e);
    }

    console.log("Consolidation seed complete.");
    process.exit(0);
}

seed().catch(console.error);
