import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';

const projectId = 'hytech-lms-staging';
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required.');
if ((process.env.GOOGLE_CLOUD_PROJECT || projectId) !== projectId) {
  throw new Error(`Refusing to seed outside ${projectId}.`);
}

const app = initializeApp({ credential: applicationDefault(), projectId });
const db = getFirestore(app);
const now = Timestamp.now();
const future = Timestamp.fromMillis(Date.now() + 14 * 86400_000);
const past = Timestamp.fromMillis(Date.now() - 7 * 86400_000);
const marker = { qaManaged: true, qaRunId: 'stable-seed', qaPurpose: 'automated-e2e' };

async function qaUser(email) {
  const snap = await db.collection('users').where('email', '==', email).limit(1).get();
  if (snap.empty) throw new Error(`Missing seeded QA identity: ${email}`);
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

const [admin, trainer, enrolled, unenrolled, pending, disabled] = await Promise.all([
  qaUser('qa.admin@your-test-domain.com'),
  qaUser('qa.trainer@your-test-domain.com'),
  qaUser('qa.student.enrolled@your-test-domain.com'),
  qaUser('qa.student.unenrolled@your-test-domain.com'),
  qaUser('qa.student.pending@your-test-domain.com'),
  qaUser('qa.student.disabled@your-test-domain.com'),
]);

const ids = {
  sector: 'qa-automation-sector',
  course: 'qa-automation-course',
  active: 'qa-automation-active-class',
  empty: 'qa-automation-empty-class',
  full: 'qa-automation-full-class',
  expired: 'qa-automation-expired-class',
  archived: 'qa-automation-archived-class',
};

const batch = db.batch();
batch.set(db.collection('sectors').doc(ids.sector), {
  name: '[QA-AUTOMATION] Sector',
  nameKey: '[qa-automation] sector',
  description: 'Disposable automated QA fixtures.',
  status: 'Active',
  createdAt: now,
  updatedAt: now,
  ...marker,
}, { merge: true });
batch.set(db.collection('courses').doc(ids.course), {
  name: '[QA-AUTOMATION] Course',
  nameKey: '[qa-automation] course',
  description: 'Disposable automated QA course template.',
  sectorId: ids.sector,
  level: 'NC II',
  status: 'Active',
  subjects: ['Safety Fundamentals', 'Core Skills', 'Final Practical'],
  createdAt: now,
  updatedAt: now,
  ...marker,
}, { merge: true });

const classDefinitions = [
  [ids.active, '[QA-AUTOMATION] Active Class', 'QA-ACTIVE-2026', 'Active', 20, 1, future],
  [ids.empty, '[QA-AUTOMATION] Empty Class', 'QA-EMPTY-2026', 'Active', 20, 0, future],
  [ids.full, '[QA-AUTOMATION] Full Class', 'QA-FULL-2026', 'Active', 1, 1, future],
  [ids.expired, '[QA-AUTOMATION] Expired Class', 'QA-EXPIRED-2026', 'Active', 20, 0, past],
  [ids.archived, '[QA-AUTOMATION] Archived Class', 'QA-ARCHIVED-2026', 'archived', 20, 1, past],
];
for (const [id, name, classCode, status, capacity, currentEnrollments, enrollmentDeadline] of classDefinitions) {
  batch.set(db.collection('classes').doc(id), {
    name,
    nameKey: name.toLowerCase(),
    description: 'Disposable automated QA class.',
    classCode,
    sectorId: ids.sector,
    courseId: ids.course,
    trainerId: trainer.uid,
    trainerName: trainer.displayName,
    coTrainerIds: [],
    level: 'NC II',
    status,
    capacity,
    currentEnrollments,
    enrollmentDeadline,
    startDate: now,
    endDate: future,
    creationMode: 'template',
    createdAt: now,
    updatedAt: now,
    ...marker,
  }, { merge: true });
}

const activeEnrollmentId = `${ids.active}_${enrolled.uid}`;
batch.set(db.collection('enrollments').doc(activeEnrollmentId), {
  studentId: enrolled.uid,
  classId: ids.active,
  className: '[QA-AUTOMATION] Active Class',
  courseId: ids.course,
  trainerId: trainer.uid,
  trainerName: trainer.displayName,
  status: 'active',
  joinedAt: now.toDate().toISOString(),
  progress: { attendanceRate: 0, tasksCompleted: 0, totalTasks: 2 },
  ...marker,
}, { merge: true });
batch.set(db.collection('classes').doc(ids.active).collection('members').doc(enrolled.uid), {
  studentId: enrolled.uid, enrollmentId: activeEnrollmentId, status: 'active', updatedAt: now, ...marker,
}, { merge: true });

const pendingEnrollmentId = `${ids.active}_${pending.uid}`;
batch.set(db.collection('enrollments').doc(pendingEnrollmentId), {
  studentId: pending.uid,
  classId: ids.active,
  className: '[QA-AUTOMATION] Active Class',
  courseId: ids.course,
  trainerId: trainer.uid,
  trainerName: trainer.displayName,
  status: 'pending',
  requestedAt: now.toDate().toISOString(),
  progress: { attendanceRate: 0, tasksCompleted: 0, totalTasks: 2 },
  ...marker,
}, { merge: true });

const archivedEnrollmentId = `${ids.archived}_${enrolled.uid}`;
batch.set(db.collection('enrollments').doc(archivedEnrollmentId), {
  studentId: enrolled.uid, classId: ids.archived, className: '[QA-AUTOMATION] Archived Class',
  trainerId: trainer.uid, status: 'completed', joinedAt: past.toDate().toISOString(),
  completedAt: now, progress: { attendanceRate: 100, tasksCompleted: 2, totalTasks: 2 }, ...marker,
}, { merge: true });

for (const uid of [unenrolled.uid, disabled.uid]) {
  const enrollmentDocs = await db.collection('enrollments').where('studentId', '==', uid).get();
  for (const doc of enrollmentDocs.docs) {
    if (doc.data().qaManaged === true) batch.delete(doc.ref);
  }
}

for (const [index, title] of ['Safety Fundamentals', 'Core Skills', 'Final Practical'].entries()) {
  batch.set(db.collection('classes').doc(ids.active).collection('topics').doc(`qa-topic-${index + 1}`), {
    title, description: `QA topic ${index + 1}`, author: trainer.displayName, authorId: trainer.uid,
    isPublished: true, order: index + 1, createdAt: Timestamp.fromMillis(Date.now() + index * 1000),
    updatedAt: now, ...marker,
  }, { merge: true });
}

batch.set(db.collection('classes').doc(ids.active).collection('materials').doc('qa-material'), {
  title: '[QA] Learning Material', name: 'qa-learning-material.txt', type: 'text/plain',
  url: 'data:text/plain,HYTech%20QA%20material', size: 20, uploadedBy: trainer.uid,
  createdAt: now, updatedAt: now, ...marker,
}, { merge: true });
batch.set(db.collection('classes').doc(ids.active).collection('announcements').doc('qa-announcement'), {
  title: '[QA] Welcome Announcement', message: 'Disposable announcement content for automated QA.',
  author: trainer.displayName, authorId: trainer.uid, authorAvatar: null, attachments: [],
  createdAt: now, updatedAt: now, ...marker,
}, { merge: true });
batch.set(db.collection('classes').doc(ids.active).collection('announcements').doc('qa-announcement').collection('comments').doc('qa-comment'), {
  text: 'Disposable trainee comment.', author: enrolled.displayName, authorId: enrolled.uid,
  createdAt: now, updatedAt: now, ...marker,
}, { merge: true });

const questions = [
  { id: 'q1', type: 'multiple-choice', question: 'Select the safe option.', options: ['Safe', 'Unsafe'], required: true, points: 2 },
  { id: 'q2', type: 'checkbox', question: 'Select both valid items.', options: ['A', 'B', 'C'], required: true, points: 2 },
  { id: 'q3', type: 'short-answer', question: 'Enter QA.', required: true, points: 2 },
  { id: 'q4', type: 'multiple-grid', question: 'Match each row.', rows: ['Row 1'], columns: ['Yes', 'No'], required: true, points: 4 },
];
batch.set(db.collection('classes').doc(ids.active).collection('assessments').doc('qa-assessment'), {
  title: '[QA] Multi-type Assessment', description: 'Disposable automated assessment.',
  author: trainer.displayName, authorId: trainer.uid, timeLimit: 10, totalPoints: 10,
  shuffleQuestions: false, showScores: true, showCorrectAnswers: true,
  settings: { maxAttempts: 2, retryAllowed: true, keepBestScore: true },
  questions, passingScore: 60, status: 'published', availableDate: now, dueDate: future,
  createdAt: now, updatedAt: now, ...marker,
}, { merge: true });
batch.set(db.collection('classes').doc(ids.active).collection('assessments').doc('qa-assessment').collection('private').doc('answerKey'), {
  answers: { q1: 0, q2: [0, 1], q3: 'QA', q4: { 'Row 1': 'Yes' } }, updatedAt: now, ...marker,
}, { merge: true });

for (const [id, title, dueDate] of [
  ['qa-future-assignment', '[QA] Future Assignment', future],
  ['qa-overdue-assignment', '[QA] Overdue Assignment', past],
]) {
  batch.set(db.collection('classes').doc(ids.active).collection('assignments').doc(id), {
    title, description: 'Disposable submission assignment.', type: 'Submission',
    author: trainer.displayName, authorId: trainer.uid, availableDate: now, dueDate,
    points: 100, questions: [], allowedUploadTypes: ['text', 'file'], status: 'active',
    createdAt: now, updatedAt: now, ...marker,
  }, { merge: true });
}

batch.set(db.collection('idRequests').doc('qa-id-request'), {
  studentId: enrolled.uid, studentName: enrolled.displayName, studentEmail: enrolled.email,
  classId: ids.active, className: '[QA-AUTOMATION] Active Class', trainerId: trainer.uid,
  type: 'New', notes: 'Disposable QA request.', status: 'pending', requestedAt: now, ...marker,
}, { merge: true });
batch.set(db.collection('incidentForms').doc('qa-incident'), {
  filedBy: enrolled.uid, filedByName: enrolled.displayName, filedByRole: 'student',
  involvedStudentId: enrolled.uid, involvedStudentName: enrolled.displayName,
  classId: ids.active, className: '[QA-AUTOMATION] Active Class',
  date: new Date().toISOString().slice(0, 10), type: 'Other', severity: 'Low',
  description: 'Disposable QA incident.', status: 'open', createdAt: now, ...marker,
}, { merge: true });
batch.set(db.collection('notifications').doc('qa-student-notification'), {
  toUid: enrolled.uid, type: 'announcement', text: '[QA] New announcement posted.',
  fromUid: trainer.uid, fromName: trainer.displayName,
  metadata: { classId: ids.active, announcementId: 'qa-announcement' },
  unread: true, createdAt: now, ...marker,
}, { merge: true });
batch.set(db.collection('notifications').doc('qa-trainer-notification'), {
  toUid: trainer.uid, type: 'submission', text: '[QA] A trainee submitted work.',
  fromUid: enrolled.uid, fromName: enrolled.displayName,
  metadata: { classId: ids.active, assignmentId: 'qa-future-assignment' },
  unread: true, createdAt: now, ...marker,
}, { merge: true });

await batch.commit();
await app.delete();
console.log('Seeded disposable QA organization, classes, enrollment states, learning content, and utilities.');
