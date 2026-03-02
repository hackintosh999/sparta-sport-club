import { db } from '../firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';

const updates = [
    {
        id: 'Cu4ANDO66kGDpwafuPKK', // Игровая футболка Joma
        colors: {
            'Черный': '/shop/tshirt_black_branded_1772222668369.png',
            'Белый': '/shop/tshirt_white_branded_1772222681983.png',
            'Неоново-Зеленый': '/shop/tshirt_green_branded_1772222697023.png'
        }
    },
    {
        id: 'hwphaFfzbomm67fICpa9', // Спортивный костюм Joma Academy IV
        colors: {
            'Черный': '/shop/academy_black_branded_1772222725135.png',
            'Неоново-Зеленый': '/shop/academy_green_branded_1772222712650.png'
        }
    },
    {
        id: 'GH10R1gqqZdzaZ8JI2Kl', // Футзалки Joma Top Flex
        colors: {
            'Неоново-Зеленый': '/shop/topflex_green_branded_1772222742811.png'
            // Blue failed due to quota limit, will keep as is
        }
    }
];

async function updateProducts() {
    console.log("Updating product images...");
    for (const item of updates) {
        const docRef = doc(db, 'products', item.id);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            const data = docSnap.data();

            // Merge existing colorImages with new ones (in case some already exist and didn't fail)
            const newColorImages = { ...(data.colorImages || {}), ...item.colors };

            // Use the first new color image as the main imageUrl, unless we want to keep the old one. 
            // We'll replace it to show the new branded background right away.
            const mainImageUrl = Object.values(item.colors)[0];

            // Re-build gallery: preserve existing that aren't old variants? Since we want branded only, let's just use the new ones + any existing gallery that isn't a plain color variant? 
            // Actually, just set the gallery to the new color images.
            const newGallery = Object.values(newColorImages);

            await updateDoc(docRef, {
                imageUrl: mainImageUrl,
                colorImages: newColorImages,
                gallery: newGallery
            });
            console.log(`Updated product: ${item.id}`);
        }
    }
    console.log("Update complete.");
    process.exit(0);
}

updateProducts().catch(console.error);
