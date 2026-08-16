import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const config = {
  apiKey: 'AIzaSyCuuttG4hO4LCVVld1zAyPPu0IpAev90KI',
  authDomain: 'newproject-bee9a.firebaseapp.com',
  projectId: 'newproject-bee9a',
  storageBucket: 'newproject-bee9a.firebasestorage.app',
  messagingSenderId: '624158048918',
  appId: '1:624158048918:web:68cbbe5b2bd8df532378b7',
};

const app = initializeApp(config);
const db = getFirestore(app);

const cols = ['packages', 'products', 'services', 'blogs', 'bookings', 'users', 'routeCards', 'faqs'];

for (const col of cols) {
  try {
    const snap = await getDocs(collection(db, col));
    console.log(`${col}: ${snap.size} docs`);
    if (snap.size > 0 && snap.size <= 5) {
      snap.docs.forEach((d) => console.log('  -', d.id, JSON.stringify(d.data()).slice(0, 150)));
    }
  } catch (e) {
    console.log(`${col}: ERROR ${e.code} ${e.message}`);
  }
}
