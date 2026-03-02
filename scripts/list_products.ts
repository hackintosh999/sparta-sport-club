import { db } from '../firebase';
import { collection, getDocs } from 'firebase/firestore';

async function listProducts() {
    const snapshot = await getDocs(collection(db, 'products'));
    snapshot.forEach(doc => {
        const data = doc.data();
        console.log(`ID: ${doc.id}`);
        console.log(`Title: ${data.title}`);
        console.log(`Colors: ${data.colors?.join(', ') || 'None'}`);
        console.log(`Sizes: ${data.sizes?.join(', ') || 'None'}`);
        console.log('---');
    });
    process.exit(0);
}

listProducts().catch(console.error);
