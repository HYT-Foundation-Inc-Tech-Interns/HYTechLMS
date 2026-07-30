import fs from 'node:fs';
import path from 'node:path';
import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';

// Reads every Firestore document (including subcollections) into local JSON so a
// destructive operation has something to check against. This is a point-in-time
// dump for inspection, not a restorable managed backup: use scheduled backups
// and PITR for that.

const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
const outDir = process.env.BACKUP_OUT_DIR;
const includeStorage = process.argv.includes('--storage');
if (!credentials || !projectId || !outDir) {
  throw new Error(
    'Set FIREBASE_SERVICE_ACCOUNT_JSON, GOOGLE_CLOUD_PROJECT, and BACKUP_OUT_DIR.'
  );
}
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(credentials)),
    projectId,
    storageBucket: `${projectId}.firebasestorage.app`,
  });
}
const db = getFirestore();

const target = path.join(outDir, `${projectId}-${new Date().toISOString().slice(0, 10)}`);
fs.mkdirSync(target, { recursive: true });

// Firestore returns rich types that JSON.stringify would flatten or drop.
const encode = (value) => {
  if (value === null || typeof value !== 'object') return value;
  if (Array.isArray(value)) return value.map(encode);
  const name = value.constructor?.name;
  if (name === 'Timestamp') return { __type: 'timestamp', value: value.toDate().toISOString() };
  if (name === 'DocumentReference') return { __type: 'reference', path: value.path };
  if (name === 'GeoPoint') return { __type: 'geopoint', lat: value.latitude, lng: value.longitude };
  if (Buffer.isBuffer(value)) return { __type: 'bytes', base64: value.toString('base64') };
  return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encode(v)]));
};

let documentCount = 0;
const dumpCollection = async (collectionRef) => {
  const output = {};
  const snapshot = await collectionRef.get();
  for (const doc of snapshot.docs) {
    documentCount += 1;
    const entry = { data: encode(doc.data()) };
    const subcollections = await doc.ref.listCollections();
    if (subcollections.length) {
      entry.subcollections = {};
      for (const sub of subcollections) {
        entry.subcollections[sub.id] = await dumpCollection(sub);
      }
    }
    output[doc.id] = entry;
  }
  return output;
};

const summary = { projectId, startedAt: new Date().toISOString(), collections: {} };
for (const collectionRef of await db.listCollections()) {
  const contents = await dumpCollection(collectionRef);
  const file = path.join(target, `${collectionRef.id}.json`);
  fs.writeFileSync(file, JSON.stringify(contents, null, 2));
  summary.collections[collectionRef.id] = Object.keys(contents).length;
  console.error(`${collectionRef.id}: ${Object.keys(contents).length} root documents`);
}

if (includeStorage) {
  const bucket = getStorage().bucket();
  const [files] = await bucket.getFiles();
  const storageDir = path.join(target, 'storage');
  let bytes = 0;
  for (const file of files) {
    const destination = path.join(storageDir, file.name);
    fs.mkdirSync(path.dirname(destination), { recursive: true });
    await file.download({ destination });
    bytes += Number(file.metadata.size || 0);
  }
  summary.storage = { objects: files.length, bytes };
  console.error(`storage: ${files.length} objects, ${(bytes / 1e6).toFixed(1)} MB`);
}

summary.finishedAt = new Date().toISOString();
summary.documentCount = documentCount;
fs.writeFileSync(path.join(target, '_summary.json'), JSON.stringify(summary, null, 2));
console.log(JSON.stringify(summary, null, 2));
