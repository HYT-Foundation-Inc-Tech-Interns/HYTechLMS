import fs from 'node:fs';
import path from 'node:path';
import { afterAll, beforeAll, beforeEach, describe, it } from 'vitest';
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes } from 'firebase/storage';

const projectId = 'demo-hytech-lms';
const rules = fs.readFileSync(path.resolve('firestore.rules'), 'utf8');
const storageRules = fs.readFileSync(path.resolve('storage.rules'), 'utf8');
let env;

const claims = { email: 'qa@example.test', email_verified: true };
const dbFor = (uid, extra = {}) => env.authenticatedContext(uid, { ...claims, ...extra }).firestore();

beforeAll(async () => {
  env = await initializeTestEnvironment({
    projectId,
    firestore: { rules },
    storage: { rules: storageRules },
  });
});

afterAll(async () => env.cleanup());
beforeEach(async () => {
  await env.clearFirestore();
  await env.clearStorage();
  await env.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    const users = [
      ['admin', 'admin', 'Active', 'admin'],
      ['lead', 'trainer', 'Active', 'admin'],
      ['co', 'trainer', 'Active', 'admin'],
      ['otherTrainer', 'trainer', 'Active', 'admin'],
      ['student', 'student', 'Active', 'self-registration'],
      ['otherStudent', 'student', 'Active', 'self-registration'],
      ['inactive', 'student', 'Inactive', 'self-registration'],
    ];
    await Promise.all(users.map(([uid, role, status, createdBy]) =>
      setDoc(doc(db, 'users', uid), { uid, role, status, createdBy, email: `${uid}@example.test` })
    ));
    await setDoc(doc(db, 'config', 'appSettings'), {
      access: { allowSelfRegistration: true, requireEnrollmentApproval: true },
    });
    await setDoc(doc(db, 'classes', 'class-a'), {
      name: 'Class A',
      status: 'Active',
      trainerId: 'lead',
      coTrainerIds: ['co'],
    });
    await setDoc(doc(db, 'classes', 'class-b'), {
      name: 'Class B',
      status: 'Active',
      trainerId: 'otherTrainer',
      coTrainerIds: [],
    });
    await setDoc(doc(db, 'enrollments', 'class-a_student'), {
      classId: 'class-a',
      studentId: 'student',
      trainerId: 'lead',
      status: 'active',
    });
    await setDoc(doc(db, 'classes', 'class-a', 'members', 'student'), {
      studentId: 'student',
      status: 'active',
    });
    await setDoc(doc(db, 'classes', 'class-a', 'assessments', 'quiz'), {
      title: 'Quiz',
      status: 'active',
      questions: [{ id: 'q1', title: 'Question' }],
    });
    await setDoc(doc(db, 'classes', 'class-a', 'assessments', 'quiz', 'private', 'answerKey'), {
      answers: { q1: 0 },
    });
    await setDoc(doc(db, 'certificates', 'cert-1'), {
      studentId: 'student',
      classId: 'class-a',
      status: 'valid',
    });
  });
});

describe('storage isolation', () => {
  it('allows a member to upload an approved file only under their own prefix', async () => {
    const storage = env.authenticatedContext('student', claims).storage();
    await assertSucceeds(uploadBytes(
      ref(storage, 'lmsFiles/class-a/student/work.txt'),
      new Uint8Array([1, 2, 3]),
      { contentType: 'text/plain' }
    ));
    await assertFails(uploadBytes(
      ref(storage, 'lmsFiles/class-a/otherStudent/work.txt'),
      new Uint8Array([1]),
      { contentType: 'text/plain' }
    ));
  });

  it('denies active content and an unverified account', async () => {
    const storage = env.authenticatedContext('student', claims).storage();
    await assertFails(uploadBytes(
      ref(storage, 'lmsFiles/class-a/student/payload.svg'),
      new TextEncoder().encode('<svg><script>alert(1)</script></svg>'),
      { contentType: 'image/svg+xml' }
    ));
    const unverifiedStorage = env.authenticatedContext(
      'student',
      { ...claims, email_verified: false }
    ).storage();
    await assertFails(uploadBytes(
      ref(unverifiedStorage, 'lmsFiles/class-a/student/work.txt'),
      new Uint8Array([1]),
      { contentType: 'text/plain' }
    ));
  });
});

describe('enrollment authority', () => {
  it('denies the self-trainer escalation', async () => {
    await assertFails(setDoc(doc(dbFor('otherStudent'), 'enrollments', 'class-a_otherStudent'), {
      classId: 'class-a',
      studentId: 'otherStudent',
      trainerId: 'otherStudent',
      status: 'pending',
    }));
  });

  it('allows a canonical pending self-enrollment but denies self-approval', async () => {
    const db = dbFor('otherStudent');
    const ref = doc(db, 'enrollments', 'class-a_otherStudent');
    await assertSucceeds(setDoc(ref, {
      classId: 'class-a',
      studentId: 'otherStudent',
      trainerId: 'lead',
      status: 'pending',
    }));
    await assertFails(updateDoc(ref, { status: 'active' }));
  });

  it('allows canonical class staff and denies an unrelated trainer', async () => {
    const refFor = (uid) => doc(dbFor(uid), 'enrollments', 'class-a_student');
    await assertSucceeds(updateDoc(refFor('lead'), { status: 'completed' }));
    await assertSucceeds(updateDoc(refFor('co'), { status: 'active' }));
    await assertFails(updateDoc(refFor('otherTrainer'), { status: 'active' }));
  });
});

describe('academic and identity integrity', () => {
  it('denies learner writes to progress and attempts', async () => {
    const db = dbFor('student');
    await assertFails(setDoc(doc(db, 'students', 'student', 'progress', 'class-a'), {
      progressPercentage: 100,
    }));
    await assertFails(setDoc(
      doc(db, 'classes', 'class-a', 'assessments', 'quiz', 'attempts', 'forged'),
      { studentId: 'student', score: 100, passed: true }
    ));
  });

  it('denies private answer keys and cross-class content', async () => {
    await assertFails(getDoc(
      doc(dbFor('student'), 'classes', 'class-a', 'assessments', 'quiz', 'private', 'answerKey')
    ));
    await assertFails(getDoc(doc(dbFor('student'), 'classes', 'class-b')));
  });

  it('allows safe self-profile edits and denies protected identity edits', async () => {
    const ref = doc(dbFor('student'), 'users', 'student');
    await assertSucceeds(updateDoc(ref, { displayName: 'New Name' }));
    await assertFails(updateDoc(ref, { idNumber: 'FORGED' }));
    await assertFails(updateDoc(ref, { email: 'attacker@example.test' }));
    await assertFails(updateDoc(ref, { role: 'admin' }));
  });

  it('denies all application access for inactive or unverified users', async () => {
    await assertFails(getDoc(doc(dbFor('inactive'), 'classes', 'class-a')));
    await assertFails(getDoc(doc(
      dbFor('otherStudent', { email_verified: false }),
      'classes',
      'class-a'
    )));
  });

  it('keeps certificate records server-only', async () => {
    const studentDb = dbFor('student');
    await assertSucceeds(getDoc(doc(studentDb, 'certificates', 'cert-1')));
    await assertFails(updateDoc(doc(studentDb, 'certificates', 'cert-1'), { status: 'valid' }));
  });
});
