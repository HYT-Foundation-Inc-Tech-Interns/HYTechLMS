import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';

const projectId = 'hytech-lms-staging';
if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required.');
if ((process.env.GOOGLE_CLOUD_PROJECT || projectId) !== projectId) throw new Error('Refusing non-staging verification.');

const app = initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth(app);
const db = getFirestore(app);
const checks = [];
const pass = (name, detail = '') => checks.push({ result: 'PASS', name, detail });
const fail = (name, detail = '') => checks.push({ result: 'FAIL', name, detail });

const expected = [
  ['qa.admin@your-test-domain.com', 'admin', 'Active', false],
  ['qa.trainer@your-test-domain.com', 'trainer', 'Active', false],
  ['qa.student.enrolled@your-test-domain.com', 'student', 'Active', false],
  ['qa.student.unenrolled@your-test-domain.com', 'student', 'Active', false],
  ['qa.student.pending@your-test-domain.com', 'student', 'Active', false],
  ['qa.student.disabled@your-test-domain.com', 'student', 'Inactive', true],
];
const users = {};
for (const [email, role, status, disabled] of expected) {
  try {
    const account = await auth.getUserByEmail(email);
    const profile = await db.collection('users').doc(account.uid).get();
    const data = profile.data() || {};
    users[email] = { uid: account.uid, ...data };
    if (
      profile.exists
      && data.role === role
      && data.status === status
      && data.qaManaged === true
      && account.disabled === disabled
    ) pass(`Identity ${email}`, `${role}/${status}/${disabled ? 'disabled' : 'enabled'}`);
    else fail(`Identity ${email}`, 'Auth or Firestore state does not match.');
  } catch (error) {
    fail(`Identity ${email}`, error.message);
  }
}

for (const [id, expectedStatus] of [
  ['qa-automation-active-class', 'Active'],
  ['qa-automation-empty-class', 'Active'],
  ['qa-automation-full-class', 'Active'],
  ['qa-automation-expired-class', 'Active'],
  ['qa-automation-archived-class', 'archived'],
]) {
  const doc = await db.collection('classes').doc(id).get();
  const data = doc.data() || {};
  if (doc.exists && data.status === expectedStatus && data.qaManaged === true) pass(`Class ${id}`, expectedStatus);
  else fail(`Class ${id}`, 'Missing or incorrect status/marker.');
}

const activeId = users['qa.student.enrolled@your-test-domain.com']?.uid;
const pendingId = users['qa.student.pending@your-test-domain.com']?.uid;
const unenrolledId = users['qa.student.unenrolled@your-test-domain.com']?.uid;
for (const [label, uid, expectedStatus] of [
  ['Enrolled trainee', activeId, 'active'],
  ['Pending trainee', pendingId, 'pending'],
]) {
  const snap = uid
    ? await db.collection('enrollments').where('studentId', '==', uid).where('classId', '==', 'qa-automation-active-class').get()
    : { empty: true, docs: [] };
  if (!snap.empty && snap.docs[0].data().status === expectedStatus) pass(label, expectedStatus);
  else fail(label, `Expected ${expectedStatus} enrollment.`);
}
const unenrolled = unenrolledId
  ? await db.collection('enrollments').where('studentId', '==', unenrolledId).get()
  : { empty: false };
if (unenrolled.empty) pass('Unenrolled trainee', 'no enrollments');
else fail('Unenrolled trainee', 'Unexpected enrollment exists.');

for (const [path, label] of [
  ['sectors/qa-automation-sector', 'QA sector'],
  ['courses/qa-automation-course', 'QA course'],
  ['classes/qa-automation-active-class/announcements/qa-announcement', 'Announcement'],
  ['classes/qa-automation-active-class/assessments/qa-assessment', 'Assessment'],
  ['classes/qa-automation-active-class/assignments/qa-future-assignment', 'Future assignment'],
  ['classes/qa-automation-active-class/assignments/qa-overdue-assignment', 'Overdue assignment'],
  ['idRequests/qa-id-request', 'ID request'],
  ['incidentForms/qa-incident', 'Incident report'],
  ['notifications/qa-student-notification', 'Student notification'],
  ['notifications/qa-trainer-notification', 'Trainer notification'],
]) {
  const doc = await db.doc(path).get();
  if (doc.exists && doc.data().qaManaged === true) pass(label);
  else fail(label, `Missing or unmarked: ${path}`);
}

console.table(checks);
const failed = checks.filter((check) => check.result === 'FAIL');
await app.delete();
if (failed.length) {
  console.error(`${failed.length} QA seed verification check(s) failed.`);
  process.exitCode = 1;
} else {
  console.log(`All ${checks.length} QA seed checks passed.`);
}
