import { getFunctions, httpsCallable } from 'firebase/functions';
import {
  deleteObject,
  getBlob,
  ref,
  uploadBytesResumable,
} from 'firebase/storage';
import { app } from './app';
import { auth } from './auth';
import { storage } from './storageBucket';

const functions = getFunctions(app, 'us-central1');
const createBackupCallable = httpsCallable(functions, 'createFullBackup', {
  timeout: 540000,
});
const restoreBackupCallable = httpsCallable(functions, 'restoreFullBackup', {
  timeout: 540000,
});

export const MAX_FULL_BACKUP_BYTES = 1024 * 1024 * 1024;

function saveBlob(blob, name) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function exportFullBackup(onProgress) {
  onProgress?.({ phase: 'creating', percent: 10 });
  const result = await createBackupCallable();
  const payload = result.data;
  const objectRef = ref(storage, payload.path);

  try {
    onProgress?.({ phase: 'downloading', percent: 75 });
    const blob = await getBlob(objectRef);
    saveBlob(blob, payload.name);
    onProgress?.({ phase: 'done', percent: 100 });
    return payload;
  } finally {
    await deleteObject(objectRef).catch(() => {});
  }
}

function makeImportName(fileName) {
  const suffix = globalThis.crypto?.randomUUID?.()
    || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const safeName = String(fileName || 'backup.zip').replace(/[^a-zA-Z0-9._-]/g, '-');
  return `import-${suffix}-${safeName}`;
}

export async function importFullBackup(file, options = {}) {
  const user = auth.currentUser;
  if (!user) throw new Error('not-authenticated');
  if (!file?.name?.toLowerCase().endsWith('.zip')) throw new Error('invalid-archive');
  if (file.size > MAX_FULL_BACKUP_BYTES) throw new Error('archive-too-large');

  const objectPath = `system-backups/${user.uid}/${makeImportName(file.name)}`;
  const objectRef = ref(storage, objectPath);
  const upload = uploadBytesResumable(objectRef, file, {
    contentType: 'application/zip',
    cacheControl: 'private, no-store, max-age=0',
    customMetadata: { ownerUid: user.uid, purpose: 'full-backup-import' },
  });

  try {
    await new Promise((resolve, reject) => {
      upload.on(
        'state_changed',
        (snapshot) => {
          const ratio = snapshot.totalBytes
            ? snapshot.bytesTransferred / snapshot.totalBytes
            : 0;
          options.onProgress?.({
            phase: 'uploading',
            percent: Math.round(ratio * 45),
          });
        },
        reject,
        resolve,
      );
    });

    options.onProgress?.({ phase: 'restoring', percent: 50 });
    const result = await restoreBackupCallable({
      path: objectPath,
      mode: options.mode === 'replace' ? 'replace' : 'merge',
      confirmation: options.confirmation || '',
    });
    options.onProgress?.({ phase: 'done', percent: 100 });
    return result.data;
  } finally {
    await deleteObject(objectRef).catch(() => {});
  }
}
