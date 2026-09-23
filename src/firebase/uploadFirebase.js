import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { storage } from './storageBucket';

/**
 * Upload to Firebase Storage (works on LAN / when ImgBB is blocked).
 * Path must match storage.rules public CMS folders (vehicles, products, …).
 */
export async function uploadToFirebaseStorage(file, folder = 'uploads') {
  const safeFolder = String(folder || 'uploads')
    .replace(/^\/+|\/+$/g, '')
    .replace(/[^a-zA-Z0-9/_-]/g, '_')
    || 'uploads';
  const extFromName = String(file?.name || '').split('.').pop()?.toLowerCase();
  const ext = (extFromName && /^[a-z0-9]{2,5}$/.test(extFromName))
    ? extFromName
    : (file?.type?.includes('png') ? 'png' : file?.type?.includes('webp') ? 'webp' : 'jpg');
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}.${ext}`;
  const path = `${safeFolder}/${fileName}`;
  const storageRef = ref(storage, path);

  await uploadBytes(storageRef, file, {
    contentType: file.type || 'image/jpeg',
    cacheControl: 'public,max-age=31536000,immutable',
  });

  return getDownloadURL(storageRef);
}
