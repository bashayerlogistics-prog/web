import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs, addDoc, deleteDoc } from 'firebase/firestore';

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

const cols = ['packages', 'banners', 'services', 'blogs', 'siteSettings', 'notifications', 'activityLog'];

for (const col of cols) {
  try {
    const snap = await getDocs(collection(db, col));
    console.log(`READ ${col}: ${snap.size} docs`);
  } catch (e) {
    console.log(`READ ${col}: ERROR ${e.code}`);
  }
}

// Test write to packages
try {
  const ref = await addDoc(collection(db, 'packages'), {
    nameEn: '__test__',
    active: false,
    sortOrder: 9999,
    type: 'fleet',
    test: true,
  });
  console.log('WRITE packages: OK', ref.id);
  await deleteDoc(ref);
  console.log('DELETE packages: OK');
} catch (e) {
  console.log('WRITE packages: ERROR', e.code, e.message);
}
