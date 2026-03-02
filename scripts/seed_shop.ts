import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import * as fs from 'fs';
import * as path from 'path';

const artifactsDir = `C:\\Users\\User\\.gemini\\antigravity\\brain\\c1afd9a6-fb5b-4476-aa73-94c20babd6fc`;

const products = [
    {
        filename: 'joma_tracksuit_green_1772221091744.png',
        title: 'Спортивный костюм Joma Academy IV',
        price: 7500,
        category: 'Экипировка',
        description: 'Оригинальный спортивный костюм Joma, состоящий из олимпийки на молнии и брюк. Инновационная ткань с технологией отвода влаги.',
        colors: ['Неоново-Зеленый', 'Черный'],
        sizes: ['S', 'M', 'L', 'XL'],
        specifications: {
            'Материал': '100% Полиэстер',
            'Технология': 'Micro-Mesh System',
            'Сезон': 'Всесезонный'
        },
        orderLink: 'https://vk.com/sparta_fk'
    },
    {
        filename: 'joma_tshirt_black_1772221103835.png',
        title: 'Игровая футболка Joma',
        price: 2500,
        category: 'Форма',
        description: 'Классическая черная тренировочная футболка Joma с короткими рукавами. Отличная вентиляция.',
        colors: ['Черный', 'Белый', 'Неоново-Зеленый'],
        sizes: ['XS', 'S', 'M', 'L', 'XL'],
        specifications: {
            'Материал': '100% Полиэстер Interlock',
            'Крой': 'Прямой (Regular Fit)',
            'Сезон': 'Для зала / Лето'
        },
        orderLink: 'https://vk.com/sparta_fk'
    },
    {
        filename: 'joma_futsal_shoes_1772221116305.png',
        title: 'Футзалки Joma Top Flex',
        price: 6990,
        category: 'Экипировка',
        description: 'Профессиональные футзалки из натуральной кожи. Непревзойденная гибкость и комфорт. Яркий неоновый дизайн.',
        colors: ['Неоново-Зеленый', 'Синий'],
        sizes: ['39', '40', '41', '42', '43', '44'],
        specifications: {
            'Материал верха': 'Натуральная кожа',
            'Подошва': 'Полиуретан (не маркирует пол)',
            'Амортизация': 'EVA'
        },
        orderLink: 'https://vk.com/sparta_fk'
    },
    {
        filename: 'joma_tracksuit_black_1772221148305.png',
        title: 'Спортивный костюм Joma Championship',
        price: 8000,
        category: 'Экипировка',
        description: 'Строгий черный спортивный костюм для выездов и тренировок. Облегающий крой.',
        colors: ['Черный'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        specifications: {
            'Материал': 'Полиэстер / Эластан',
            'Карманы': 'На молнии',
            'Тип': 'Тренировочный / Парадный'
        },
        orderLink: 'https://vk.com/sparta_fk'
    },
    {
        filename: 'joma_winter_jacket_1772221161393.png',
        title: 'Утепленная куртка Joma Trivor',
        price: 12500,
        category: 'Экипировка',
        description: 'Зимняя длинная куртка (парка) Joma со скрытым капюшоном. Надежная защита от холода и ветра.',
        colors: ['Черный'],
        sizes: ['S', 'M', 'L', 'XL', 'XXL'],
        specifications: {
            'Материал': '100% Полиэстер Taslon',
            'Утеплитель': 'Синтепон',
            'Капюшон': 'Съемный'
        },
        orderLink: 'https://vk.com/sparta_fk'
    },
    {
        filename: 'joma_beanie_1772221176271.png',
        title: 'Спортивная шапка Joma',
        price: 1500,
        category: 'Аксессуары',
        description: 'Классическая вязаная шапка Joma для тренировок на улице в холодную погоду.',
        colors: ['Черный'],
        sizes: ['One Size'],
        specifications: {
            'Материал': '100% Акрил',
            'Сезон': 'Зима / Осень',
            'Логотип': 'Вышивка'
        },
        orderLink: 'https://vk.com/sparta_fk'
    }
];

async function seed() {
    console.log("Starting seed...");
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
    console.log("Seed complete.");
    process.exit(0);
}

seed().catch(console.error);
