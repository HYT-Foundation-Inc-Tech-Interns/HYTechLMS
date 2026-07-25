import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = 'hytech-lms-staging';
const apply = process.argv.includes('--apply');
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required.');
if ((process.env.GOOGLE_CLOUD_PROJECT || projectId) !== projectId) throw new Error('Refusing non-staging cleanup.');

const app = initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(app);
const roots = ['notifications', 'systemLogs', 'idRequests', 'incidentForms'];
const candidates = [];

for (const collectionName of roots) {
  const snapshot = await db.collection(collectionName).where('qaManaged', '==', true).get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    if (data.qaRunId && data.qaRunId !== 'stable-seed') candidates.push(doc.ref);
  }
}

if (!apply) {
  console.log(`Dry run: ${candidates.length} transient QA document(s) would be deleted.`);
  console.log('Stable seed records and all non-QA records are preserved.');
  console.log('Use npm run qa:cleanup:apply to perform the deletion.');
} else {
  for (let index = 0; index < candidates.length; index += 400) {
    const batch = db.batch();
    for (const ref of candidates.slice(index, index + 400)) batch.delete(ref);
    await batch.commit();
  }
  console.log(`Deleted ${candidates.length} transient QA document(s); stable seed preserved.`);
}
await app.delete();
