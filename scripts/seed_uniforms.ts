import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const artifactsDir = `C:\\Users\\User\\.gemini\\antigravity\\brain\\c1afd9a6-fb5b-4476-aa73-94c20babd6fc`;

const products = [
    {
        filename: 'uniform_green_1772221654806.png',
        title: 'Игровая форма Sparta (Зеленая)',
        price: 3500,
        category: 'Форма',
        description: 'Официальная домашняя игровая форма Joma (футболка + шорты). Легкая дышащая ткань.',
        colors: ['Неоново-Зеленый', 'Черный'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        specifications: {
            'Материал': '100% Полиэстер Interlock',
            'Комплектация': 'Футболка и шорты',
            'Сезон': 'Для зала / Лето'
        },
        orderLink: 'https://vk.com/sparta_fk'
    },
    {
        filename: 'uniform_red_1772221666740.png',
        title: 'Игровая форма Sparta (Красная)',
        price: 3500,
        category: 'Форма',
        description: 'Гостевая игровая форма Joma в красном цвете. Отлично отводит влагу и обеспечивает комфорт во время игры.',
        colors: ['Красный', 'Черный'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        specifications: {
            'Материал': '100% Полиэстер Interlock',
            'Комплектация': 'Футболка и шорты',
            'Сезон': 'Для зала / Лето'
        },
        orderLink: 'https://vk.com/sparta_fk'
    },
    {
        filename: 'uniform_blue_1772221679188.png',
        title: 'Игровая форма Sparta (Синяя)',
        price: 3500,
        category: 'Форма',
        description: 'Игровая форма Joma в королевском синем цвете. Долговечный материал, устойчивый к стиркам.',
        colors: ['Синий', 'Черный'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        specifications: {
            'Материал': '100% Полиэстер Interlock',
            'Комплектация': 'Футболка и шорты',
            'Сезон': 'Для зала / Лето'
        },
        orderLink: 'https://vk.com/sparta_fk'
    },
    {
        filename: 'uniform_white_1772221692036.png',
        title: 'Игровая форма Sparta (Белая)',
        price: 3500,
        category: 'Форма',
        description: 'Резервная игровая форма Joma белого цвета с черными акцентами.',
        colors: ['Белый', 'Черный'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        specifications: {
            'Материал': '100% Полиэстер Interlock',
            'Комплектация': 'Футболка и шорты',
            'Сезон': 'Для зала / Лето'
        },
        orderLink: 'https://vk.com/sparta_fk'
    },
    {
        filename: 'uniform_black_1772221703922.png',
        title: 'Тренировочная форма Sparta (Черная)',
        price: 3500,
        category: 'Форма',
        description: 'Практичная тренировочная форма полностью черного цвета (футболка + шорты).',
        colors: ['Черный', 'Белый'],
        sizes: ['XS', 'S', 'M', 'L', 'XL', 'XXL'],
        specifications: {
            'Материал': '100% Полиэстер Interlock',
            'Комплектация': 'Футболка и шорты',
            'Сезон': 'Для зала / Лето'
        },
        orderLink: 'https://vk.com/sparta_fk'
    }
];

async function seed() {
    console.log("Starting uniform seed...");
    for (const p of products) {
        const filePath = path.join(artifactsDir, p.filename);
        let imageUrl = '';
        if (fs.existsSync(filePath)) {
            const buffer = fs.readFileSync(filePath);
            imageUrl = `data:image/png;base64,${buffer.toString('base64')}`;
        } else {
            console.log(`Warning: File not found ${filePath}`);
        }

        try {
            const docRef = await addDoc(collection(db, 'products'), {
                title: p.title,
                price: p.price,
                category: p.category,
                description: p.description,
                imageUrl: imageUrl,
                colors: p.colors,
                sizes: p.sizes,
                gallery: [],
                specifications: p.specifications,
                orderLink: p.orderLink,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            });
            console.log(`Added ${p.title} with ID: ${docRef.id}`);
        } catch (e) {
            console.error(`Error adding ${p.title}:`, e);
        }
    }
    console.log("Uniform seed complete.");
    process.exit(0);
}

seed().catch(console.error);
