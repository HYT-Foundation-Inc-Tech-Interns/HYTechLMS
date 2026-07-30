import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

const apply = process.argv.includes('--apply');
const credentials = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
const projectId = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCLOUD_PROJECT;
if (!credentials || !projectId) {
  throw new Error('Set FIREBASE_SERVICE_ACCOUNT_JSON and GOOGLE_CLOUD_PROJECT for the target project.');
}
if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(credentials)),
    projectId,
  });
}
const db = getFirestore();

const report = {
  projectId,
  mode: apply ? 'apply' : 'dry-run',
  inlineAnswerKeys: [],
  clientProgressDocs: [],
  enrollmentProgress: [],
  legacyCertificateReferences: [],
};

const assessments = await db.collectionGroup('assessments').get();
for (const snapshot of assessments.docs) {
  const questions = Array.isArray(snapshot.data()?.questions) ? snapshot.data().questions : [];
  const answers = Object.fromEntries(
    questions
      .filter((question) =>
        question?.id && Object.prototype.hasOwnProperty.call(question, 'correctAnswer'))
      .map((question) => [question.id, question.correctAnswer])
  );
  if (!Object.keys(answers).length) continue;
  report.inlineAnswerKeys.push(snapshot.ref.path);
  if (apply) {
    const batch = db.batch();
    batch.set(snapshot.ref.collection('private').doc('answerKey'), {
      answers,
      migratedAt: FieldValue.serverTimestamp(),
    }, { merge: true });
    batch.update(snapshot.ref, {
      questions: questions.map(({ correctAnswer: _answer, ...question }) => question),
      updatedAt: FieldValue.serverTimestamp(),
    });
    await batch.commit();
  }
}

const progress = await db.collectionGroup('progress').get();
for (const snapshot of progress.docs) {
  if (!snapshot.ref.path.startsWith('students/')) continue;
  const data = snapshot.data() || {};
  if (data.source !== 'authoritative-recalculation') {
    report.clientProgressDocs.push(snapshot.ref.path);
    if (apply) {
      await snapshot.ref.set({
        legacyUnverified: true,
        legacyMarkedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
}

const enrollments = await db.collection('enrollments').get();
for (const snapshot of enrollments.docs) {
  const data = snapshot.data() || {};
  if (data.progress && data.progress.source !== 'authoritative-recalculation') {
    report.enrollmentProgress.push(snapshot.ref.path);
    if (apply) {
      await snapshot.ref.set({
        progress: {
          ...data.progress,
          legacyUnverified: true,
        },
        updatedAt: FieldValue.serverTimestamp(),
      }, { merge: true });
    }
  }
  if (data.certificateId) report.legacyCertificateReferences.push(snapshot.ref.path);
}

console.log(JSON.stringify(report, null, 2));
if (!apply) {
  console.error('Dry run only. Review the report, back up the project, then rerun with --apply.');
}
