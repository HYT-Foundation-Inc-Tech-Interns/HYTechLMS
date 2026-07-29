// functions/src/index.js
// Firebase Cloud Functions for HYTech LMS
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions/v1');
const admin = require('firebase-admin');
const { randomUUID } = require('node:crypto');

admin.initializeApp();
const db = admin.firestore();
const FUNCTION_REGION = 'asia-southeast1';
// Source-controlled scaling ceiling for ordinary callables and triggers.
// This limits cost exposure and prevents a sudden request spike from creating
// an unbounded number of first-generation function instances.
const boundedFunctions = functions
  .region(FUNCTION_REGION)
  .runWith({ maxInstances: 5, enforceAppCheck: true });
const templateCopyFunctions = functions
  .region(FUNCTION_REGION)
  .runWith({ maxInstances: 2, timeoutSeconds: 540, memory: '1GB', enforceAppCheck: true });
// Assessment submission is the one call an entire class fires at the same
// moment (the end of a timed quiz). First-generation functions serve a single
// request per instance, so the shared ceiling of 5 made the 6th trainee queue
// behind a full execution. Give the submit path its own, wider ceiling.
//
// Do NOT add `minInstances` here, not even `minInstances: 0`. The CLI has no
// gen-1 pricing tier for asia-southeast1, so any defined value makes
// canCalculateMinInstanceCost() fail, which the deploy reads as "this raises
// the minimum bill" and rejects with:
//   Error: Pass the --force option to deploy functions that increase the minimum bill
// Omitting the field takes an early return and skips the region lookup.
// Warming instances to kill cold starts therefore needs `--force` in CI plus a
// real always-on cost, so it stays a deliberate, separate decision.
const submissionFunctions = functions
  .region(FUNCTION_REGION)
  .runWith({ maxInstances: 40, enforceAppCheck: true });
const CONTENT_COLLECTIONS = ['topics', 'materials', 'assessments', 'assignments'];

const requireActiveAdmin = async (context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }
  const caller = await db.collection('users').doc(context.auth.uid).get();
  const user = caller.data() || {};
  if (
    !caller.exists
    || user.role !== 'admin'
    || String(user.status || '').toLowerCase() !== 'active'
  ) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access is required.');
  }
  return user;
};

const writeActivityLog = async (userId, action, entityType, entityId, metadata = {}) => {
  await db.collection('activityLogs').add({
    userId,
    action,
    entityType,
    entityId,
    metadata,
    timestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const writeSecurityLog = async (
  actorUid,
  actorRole,
  action,
  targetType,
  targetId,
  metadata = {}
) => {
  await db.collection('securityLogs').add({
    actorUid,
    actorRole,
    action,
    targetType,
    targetId,
    metadata,
    sourceFunction: process.env.K_SERVICE || 'firebase-functions',
    serverTimestamp: admin.firestore.FieldValue.serverTimestamp(),
  });
};

const requireActiveClassStaff = async (context, classId) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }
  const [caller, classDoc] = await Promise.all([
    db.collection('users').doc(context.auth.uid).get(),
    db.collection('classes').doc(classId).get(),
  ]);
  const user = caller.data() || {};
  const classData = classDoc.data() || {};
  const isAdmin = user.role === 'admin';
  const isClassTrainer = user.role === 'trainer' && (
    classData.trainerId === context.auth.uid
    || (Array.isArray(classData.coTrainerIds) && classData.coTrainerIds.includes(context.auth.uid))
  );
  if (
    !caller.exists
    || String(user.status || '').toLowerCase() !== 'active'
    || (!isAdmin && !isClassTrainer)
  ) {
    throw new functions.https.HttpsError('permission-denied', 'Class staff access is required.');
  }
  if (!classDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Class not found.');
  }
  return { user, classData, isAdmin };
};

const notificationTypeEnabled = async (type) => {
  const settings = await db.collection('config').doc('appSettings').get();
  return settings.data()?.notifications?.[type] !== false;
};

const notifyActiveClassTrainees = async (
  classId,
  { type, text, fromUid = '', metadata = {} }
) => {
  if (!(await notificationTypeEnabled(type))) return 0;
  const enrollments = await db.collection('enrollments')
    .where('classId', '==', classId)
    .get();
  const recipientIds = [...new Set(
    enrollments.docs
      .filter((entry) =>
        ['active', 'ongoing'].includes(String(entry.data()?.status || '').toLowerCase())
      )
      .map((entry) => entry.data()?.studentId)
      .filter(Boolean)
  )];
  if (recipientIds.length === 0) return 0;

  const writer = db.bulkWriter();
  recipientIds.forEach((toUid) => {
    writer.create(db.collection('notifications').doc(), {
      toUid,
      type,
      text,
      fromUid,
      fromName: '',
      metadata: { classId, ...metadata },
      unread: true,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await writer.close();
  return recipientIds.length;
};

const wipeCourseContent = async (parentRef) => {
  for (const collectionName of CONTENT_COLLECTIONS) {
    await db.recursiveDelete(parentRef.collection(collectionName));
  }
};

const copyStorageObject = async (sourcePath, destinationPrefix) => {
  if (!sourcePath) return null;
  const bucket = admin.storage().bucket();
  const sourceFile = bucket.file(sourcePath);
  const [exists] = await sourceFile.exists();
  if (!exists) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `A referenced template file is missing: ${sourcePath}`
    );
  }

  const originalName = String(sourcePath).split('/').pop() || 'attachment';
  const safeName = originalName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  const destinationPath = `${destinationPrefix}/${randomUUID()}-${safeName}`;
  const destinationFile = bucket.file(destinationPath);
  await sourceFile.copy(destinationFile);

  const token = randomUUID();
  const [metadata] = await destinationFile.getMetadata();
  await destinationFile.setMetadata({
    metadata: {
      ...(metadata.metadata || {}),
      firebaseStorageDownloadTokens: token,
      copiedFrom: sourcePath,
    },
  });

  return {
    storagePath: destinationPath,
    url:
      `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}`
      + `/o/${encodeURIComponent(destinationPath)}?alt=media&token=${encodeURIComponent(token)}`,
  };
};

const copyDocumentFiles = async (sourceData, destinationPrefix) => {
  const nextData = { ...sourceData };
  if (Array.isArray(sourceData.attachments)) {
    nextData.attachments = await Promise.all(sourceData.attachments.map(async (attachment) => {
      const nextAttachment = { ...attachment };
      if (!attachment?.storagePath) return nextAttachment;
      const copied = await copyStorageObject(attachment.storagePath, destinationPrefix);
      nextAttachment.storagePath = copied.storagePath;
      nextAttachment.url = copied.url;
      if (Object.prototype.hasOwnProperty.call(nextAttachment, 'fileUrl')) {
        nextAttachment.fileUrl = copied.url;
      }
      return nextAttachment;
    }));
  }
  if (sourceData.storagePath) {
    const copied = await copyStorageObject(sourceData.storagePath, destinationPrefix);
    nextData.storagePath = copied.storagePath;
    nextData.url = copied.url;
    if (Object.prototype.hasOwnProperty.call(nextData, 'fileUrl')) {
      nextData.fileUrl = copied.url;
    }
  }
  return nextData;
};

const deepCopyCourseContent = async (fromRef, toRef, {
  authorId,
  storagePrefix,
} = {}) => {
  const sourceSnapshots = {};
  await Promise.all(CONTENT_COLLECTIONS.map(async (collectionName) => {
    sourceSnapshots[collectionName] = await fromRef.collection(collectionName).get();
  }));

  const topicIdMap = new Map();
  let batch = db.batch();
  let operationCount = 0;
  let copiedDocuments = 0;

  const flush = async () => {
    if (operationCount === 0) return;
    await batch.commit();
    batch = db.batch();
    operationCount = 0;
  };
  const queueSet = async (reference, value) => {
    if (operationCount >= 450) await flush();
    batch.set(reference, value);
    operationCount += 1;
  };

  for (const topicDoc of sourceSnapshots.topics.docs) {
    const destinationRef = toRef.collection('topics').doc();
    topicIdMap.set(topicDoc.id, destinationRef.id);
    const topicData = topicDoc.data() || {};
    await queueSet(destinationRef, {
      ...topicData,
      authorId: authorId || topicData.authorId || '',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    copiedDocuments += 1;
  }

  for (const collectionName of ['materials', 'assessments', 'assignments']) {
    for (const sourceDoc of sourceSnapshots[collectionName].docs) {
      const destinationRef = toRef.collection(collectionName).doc();
      let sourceData = sourceDoc.data() || {};
      if (storagePrefix) {
        sourceData = await copyDocumentFiles(sourceData, storagePrefix);
      }
      const {
        currentEnrollments: _currentEnrollments,
        submissionCount: _submissionCount,
        attemptCount: _attemptCount,
        ...copyData
      } = sourceData;
      const nextTopicId = copyData.topicId
        ? topicIdMap.get(copyData.topicId) || null
        : null;

      if (collectionName === 'assessments') {
        const publicQuestions = Array.isArray(copyData.questions)
          ? copyData.questions.map(({ correctAnswer: _answer, ...question }) => question)
          : [];
        const sourceKey = await sourceDoc.ref.collection('private').doc('answerKey').get();
        const legacyAnswers = (Array.isArray(copyData.questions) ? copyData.questions : [])
          .reduce((answers, question) => {
            if (
              question?.id
              && Object.prototype.hasOwnProperty.call(question, 'correctAnswer')
            ) {
              answers[question.id] = question.correctAnswer;
            }
            return answers;
          }, {});
        const answerKey = sourceKey.exists
          ? sourceKey.data()?.answers || {}
          : legacyAnswers;

        await queueSet(destinationRef, {
          ...copyData,
          questions: publicQuestions,
          topicId: nextTopicId,
          authorId: authorId || copyData.authorId || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        await queueSet(destinationRef.collection('private').doc('answerKey'), {
          answers: answerKey,
          copiedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      } else {
        await queueSet(destinationRef, {
          ...copyData,
          topicId: nextTopicId,
          authorId: authorId || copyData.authorId || '',
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }
      copiedDocuments += 1;
    }
  }

  await flush();
  return {
    topics: sourceSnapshots.topics.size,
    materials: sourceSnapshots.materials.size,
    assessments: sourceSnapshots.assessments.size,
    assignments: sourceSnapshots.assignments.size,
    copiedDocuments,
  };
};

const toClassDirectoryEntry = (classData = {}) => ({
  name: classData.name || 'Unnamed Class',
  nameKey: classData.nameKey || String(classData.name || '').trim().toLowerCase(),
  description: classData.description || '',
  classCode: classData.classCode || '',
  courseId: classData.courseId || '',
  sectorId: classData.sectorId || '',
  trainerId: classData.trainerId || '',
  trainerName: classData.trainerName || '',
  level: classData.level || '',
  status: classData.status || 'Inactive',
  bgImage: classData.bgImage || '',
  color: classData.color || '',
  capacity: Number(classData.capacity || classData.maxStudents || 0),
  currentEnrollments: Number(classData.currentEnrollments || 0),
  enrollmentDeadline: classData.enrollmentDeadline || '',
  expiresAt: classData.expiresAt || classData.expiryDate || classData.endDate || '',
  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
});

exports.syncClassDirectory = boundedFunctions.firestore
  .document('classes/{classId}')
  .onWrite(async (change, context) => {
    const directoryRef = db.collection('classDirectory').doc(context.params.classId);
    if (!change.after.exists) {
      await directoryRef.delete().catch(() => {});
      return;
    }
    await directoryRef.set(toClassDirectoryEntry(change.after.data()), { merge: false });
  });

exports.notifyTraineesOnAnnouncement = boundedFunctions.firestore
  .document('classes/{classId}/announcements/{announcementId}')
  .onCreate(async (snapshot, context) => {
    const announcement = snapshot.data() || {};
    if (announcement.authorId) {
      const author = await db.collection('users').doc(announcement.authorId).get();
      if (!['admin', 'trainer'].includes(String(author.data()?.role || '').toLowerCase())) return;
    }
    const message = String(announcement.message || announcement.title || 'New announcement').trim();
    await notifyActiveClassTrainees(context.params.classId, {
      type: 'announcement_posted',
      text: `New announcement: ${message.slice(0, 140)}`,
      fromUid: announcement.authorId || '',
      metadata: {
        announcementId: context.params.announcementId,
        link: `/student/${encodeURIComponent(context.params.classId)}`,
      },
    });
  });

exports.notifyTraineesOnAssessmentPublish = boundedFunctions.firestore
  .document('classes/{classId}/assessments/{assessmentId}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return;
    const before = change.before.exists ? change.before.data() || {} : {};
    const after = change.after.data() || {};
    const wasPublished = String(before.status || 'draft').toLowerCase() !== 'draft';
    const isPublished = String(after.status || 'draft').toLowerCase() !== 'draft';
    if (wasPublished || !isPublished) return;
    await notifyActiveClassTrainees(context.params.classId, {
      type: 'assessment_published',
      text: `New assessment published: ${after.title || 'Assessment'}`,
      fromUid: after.authorId || '',
      metadata: {
        assessmentId: context.params.assessmentId,
        link: `/student/${encodeURIComponent(context.params.classId)}?tab=assessments`,
      },
    });
  });

exports.notifyTraineesOnAssignmentPublish = boundedFunctions.firestore
  .document('classes/{classId}/assignments/{assignmentId}')
  .onWrite(async (change, context) => {
    if (!change.after.exists) return;
    const before = change.before.exists ? change.before.data() || {} : {};
    const after = change.after.data() || {};
    const wasPublished = String(before.status || 'draft').toLowerCase() !== 'draft';
    const isPublished = String(after.status || 'draft').toLowerCase() !== 'draft';
    if (wasPublished || !isPublished) return;
    const isSubmission = after.type === 'Submission';
    await notifyActiveClassTrainees(context.params.classId, {
      type: isSubmission ? 'submission_published' : 'assessment_published',
      text: `${isSubmission ? 'New submission task' : 'New assignment'}: ${after.title || 'Untitled'}`,
      fromUid: after.authorId || '',
      metadata: {
        assignmentId: context.params.assignmentId,
        link: `/student/${encodeURIComponent(context.params.classId)}?tab=${isSubmission ? 'assignments' : 'assessments'}`,
      },
    });
  });

exports.syncClassEnrollmentCount = boundedFunctions.firestore
  .document('enrollments/{enrollmentId}')
  .onWrite(async (change) => {
    const beforeClassId = change.before.exists ? change.before.data()?.classId : '';
    const afterClassId = change.after.exists ? change.after.data()?.classId : '';
    const classIds = [...new Set([beforeClassId, afterClassId].filter(Boolean))];
    await Promise.all(classIds.map(async (classId) => {
      const enrollments = await db.collection('enrollments')
        .where('classId', '==', classId)
        .get();
      const activeCount = enrollments.docs.filter((entry) =>
        ['active', 'ongoing'].includes(String(entry.data()?.status || '').toLowerCase())
      ).length;
      await db.collection('classes').doc(classId).set({
        currentEnrollments: activeCount,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
    }));
  });

exports.migrateClassDirectory = boundedFunctions.https.onCall(async (_data, context) => {
  await requireActiveAdmin(context);
  const classes = await db.collection('classes').get();
  const writer = db.bulkWriter();
  for (const classDoc of classes.docs) {
    writer.set(
      db.collection('classDirectory').doc(classDoc.id),
      toClassDirectoryEntry(classDoc.data()),
      { merge: false }
    );
  }
  await writer.close();
  return { synchronized: classes.size };
});

exports.adminUpdateUserAccount = boundedFunctions.https.onCall(async (data, context) => {
  const caller = await requireActiveAdmin(context);
  const userId = String(data?.userId || '').trim();
  const email = String(data?.email || '').trim().toLowerCase();
  const displayName = String(data?.displayName || '').trim().replace(/\s+/g, ' ');
  const role = String(data?.role || '').trim().toLowerCase();
  if (!userId || !email || !displayName || !['admin', 'trainer', 'student'].includes(role)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'A user, valid email, display name, and role are required.'
    );
  }

  try {
    await admin.auth().updateUser(userId, { email, displayName });
  } catch (error) {
    if (error?.code === 'auth/email-already-exists') {
      throw new functions.https.HttpsError('already-exists', 'That email is already in use.');
    }
    throw new functions.https.HttpsError('internal', 'Authentication could not be updated.');
  }

  await db.collection('users').doc(userId).set({
    email,
    displayName,
    name: displayName,
    firstName: String(data?.firstName || '').trim(),
    middleName: String(data?.middleName || '').trim(),
    lastName: String(data?.lastName || '').trim(),
    nameExtension: String(data?.nameExtension || '').trim(),
    role,
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  }, { merge: true });
  await writeSecurityLog(
    context.auth.uid,
    caller.role,
    'user_account_updated',
    'users',
    userId,
    { role, emailChanged: true, displayNameChanged: true }
  );
  return { updated: true };
});

// ==================== SECURE ASSESSMENT SUBMISSION ====================

const normalizeAnswerText = (value) => String(value ?? '').trim().toLowerCase();

const sameIndexSet = (left, right) => {
  const a = Array.isArray(left) ? left.map(Number).sort((x, y) => x - y) : [];
  const b = Array.isArray(right) ? right.map(Number).sort((x, y) => x - y) : [];
  return a.length === b.length && a.every((value, index) => value === b[index]);
};

// Deadlines are now stored as full ISO instants by the authoring UI, but older
// items hold a bare "YYYY-MM-DD" that Date() reads as UTC midnight — which put
// anything due today several hours in the past and rejected the submission.
// Resolve a date-only value against the institute's timezone instead, taking
// the end of that day for a deadline and the start of it for an open date.
const LOCAL_UTC_OFFSET = '+08:00'; // Asia/Manila — matches the asia-southeast1 deployment
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

const resolveBoundary = (value, edge) => {
  if (!value) return 0;
  if (typeof value === 'string' && DATE_ONLY.test(value)) {
    const time = edge === 'end' ? '23:59:59.999' : '00:00:00.000';
    return new Date(`${value}T${time}${LOCAL_UTC_OFFSET}`).getTime();
  }
  const parsed = value?.toDate ? value.toDate() : new Date(value);
  const time = parsed instanceof Date ? parsed.getTime() : NaN;
  return Number.isFinite(time) ? time : 0;
};

// True when the trainer actually supplied an answer key for this question.
// Grid questions default to an empty {} and neither builder offers a UI to fill
// it, so without this check a grid was auto-marked wrong for everyone — and
// because "wrong" still counted as auto-graded, the attempt never reached the
// trainer's review queue and the points vanished silently. Option index 0 is a
// real answer, not a blank.
const hasUsableKey = (type, correctAnswer) => {
  if (type === 'paragraph' || type === 'file-upload') return false;
  if (type === 'checkbox' || type === 'checkboxes') {
    return Array.isArray(correctAnswer) && correctAnswer.length > 0;
  }
  if (type === 'multiple-grid' || type === 'checkbox-grid') {
    return Boolean(correctAnswer)
      && typeof correctAnswer === 'object'
      && !Array.isArray(correctAnswer)
      && Object.keys(correctAnswer).length > 0;
  }
  if (type === 'short-answer') return String(correctAnswer ?? '').trim() !== '';
  return correctAnswer !== undefined && correctAnswer !== null && correctAnswer !== '';
};

const gradeAnswer = (question, answer, correctAnswer) => {
  const type = String(question?.type || 'multiple-choice');
  if (type === 'paragraph') return { autoGraded: false, isCorrect: false };
  if (!hasUsableKey(type, correctAnswer)) {
    // A question worth points that nobody can answer correctly goes to the
    // trainer instead of being scored 0 behind their back. A 0-point question
    // cannot move the score, so it stays auto-graded and out of the queue.
    const points = Math.max(0, Number(question?.points) || 0);
    return { autoGraded: points === 0, isCorrect: false };
  }
  if (type === 'checkbox' || type === 'checkboxes') {
    return { autoGraded: true, isCorrect: sameIndexSet(answer, correctAnswer) };
  }
  if (type === 'short-answer') {
    return {
      autoGraded: true,
      isCorrect: normalizeAnswerText(answer) !== ''
        && normalizeAnswerText(answer) === normalizeAnswerText(correctAnswer),
    };
  }
  if (type === 'linear-scale') {
    return {
      autoGraded: true,
      isCorrect: answer !== '' && answer !== null && answer !== undefined
        && Number(answer) === Number(correctAnswer),
    };
  }
  if (type === 'multiple-grid') {
    const actual = answer && typeof answer === 'object' ? answer : {};
    const expected = correctAnswer && typeof correctAnswer === 'object' ? correctAnswer : {};
    const keys = Object.keys(expected);
    return {
      autoGraded: true,
      isCorrect: keys.length > 0
        && keys.every((key) => Number(actual[key]) === Number(expected[key])),
    };
  }
  if (type === 'checkbox-grid') {
    const actual = answer && typeof answer === 'object' ? answer : {};
    const expected = correctAnswer && typeof correctAnswer === 'object' ? correctAnswer : {};
    const keys = Object.keys(expected);
    return {
      autoGraded: true,
      isCorrect: keys.length > 0
        && keys.every((key) => sameIndexSet(actual[key], expected[key])),
    };
  }
  return {
    autoGraded: true,
    isCorrect: answer !== '' && answer !== null && answer !== undefined
      && Number(answer) === Number(correctAnswer),
  };
};

/**
 * How many attempts a trainee may submit. 0 = unlimited. `oneResponsePerUser`
 * is the original hard limit of 1 and still wins, so assessments created before
 * `maxAttempts` existed behave exactly as they did. Mirrored client-side in
 * src/utils/firestoreService.js — keep the two in step.
 */
const attemptLimitFor = (assessment) => {
  if (assessment?.settings?.oneResponsePerUser) return 1;
  const configured = Number(assessment?.settings?.maxAttempts);
  return Number.isFinite(configured) && configured > 0 ? Math.floor(configured) : 0;
};

exports.submitAssessmentAttempt = submissionFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in before submitting.');
  }

  const studentId = context.auth.uid;
  const classId = String(data?.classId || '').trim();
  const assessmentId = String(data?.assessmentId || '').trim();
  const answers = data?.answers && typeof data.answers === 'object' ? data.answers : {};
  const timeTaken = Math.max(0, Number(data?.timeTaken) || 0);
  const timedOut = data?.timedOut === true;
  if (!classId || !assessmentId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Class and assessment IDs are required.'
    );
  }
  if (JSON.stringify(answers).length > 200000) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'The submitted answers are too large.'
    );
  }

  const userRef = db.collection('users').doc(studentId);
  const classRef = db.collection('classes').doc(classId);
  // A graded item is authored either through the assessment builder
  // (classes/{id}/assessments) or the assignment form builder
  // (classes/{id}/assignments). Trainees answer both through the same quiz
  // runner, so resolve the id against both collections instead of assuming
  // one — assuming `assessments` made every form-builder quiz fail with
  // "Assessment not found".
  const assessmentRef = classRef.collection('assessments').doc(assessmentId);
  const assignmentRef = classRef.collection('assignments').doc(assessmentId);

  const [
    userSnap,
    classSnap,
    assessmentSnap,
    assignmentSnap,
    enrollmentSnap,
    assessmentKeySnap,
    assignmentKeySnap,
  ] = await Promise.all([
    userRef.get(),
    classRef.get(),
    assessmentRef.get(),
    assignmentRef.get(),
    db.collection('enrollments')
      .where('studentId', '==', studentId)
      .where('classId', '==', classId)
      .get(),
    // Both candidate answer keys are fetched here rather than after the item is
    // resolved. Which one applies depends on whether this id is an assessment
    // or an assignment, and waiting to find out added a second sequential
    // round trip to every submission. The unused read is one extra document.
    assessmentRef.collection('private').doc('answerKey').get(),
    assignmentRef.collection('private').doc('answerKey').get(),
  ]);

  const userData = userSnap.data() || {};
  if (!userSnap.exists || String(userData.status || '').toLowerCase() !== 'active') {
    throw new functions.https.HttpsError('permission-denied', 'This account is not active.');
  }
  if (
    context.auth.token.email_verified !== true
    && userData.createdBy !== 'admin'
  ) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Verify your email before submitting an assessment.'
    );
  }
  const itemSnap = assessmentSnap.exists ? assessmentSnap : assignmentSnap;
  const itemRef = assessmentSnap.exists ? assessmentRef : assignmentRef;
  if (!classSnap.exists || !itemSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'Assessment not found.');
  }
  const hasActiveSeat = enrollmentSnap.docs.some((entry) =>
    ['active', 'ongoing'].includes(String(entry.data()?.status || '').toLowerCase())
  );
  if (!hasActiveSeat) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'You are not actively enrolled in this class.'
    );
  }

  const assessment = itemSnap.data() || {};
  if (String(assessment.status || 'active') === 'draft') {
    throw new functions.https.HttpsError('failed-precondition', 'This assessment is not published.');
  }
  // Submission tasks collect uploaded work through assignments/{id}/submissions
  // and are never graded as quiz attempts.
  if (String(assessment.type || '') === 'Submission') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'This task is handed in as work, not as a quiz attempt.'
    );
  }
  if (assessment.acceptResponses === false) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Responses are closed for this assessment.'
    );
  }
  const now = Date.now();
  const availableAt = resolveBoundary(assessment.availableDate, 'start');
  const dueAt = resolveBoundary(assessment.dueDate, 'end');
  if (availableAt && Number.isFinite(availableAt) && now < availableAt) {
    throw new functions.https.HttpsError('failed-precondition', 'This assessment is not open yet.');
  }
  if (dueAt && Number.isFinite(dueAt) && now > dueAt) {
    throw new functions.https.HttpsError('deadline-exceeded', 'The assessment deadline has passed.');
  }

  const attemptsRef = itemRef.collection('attempts');

  const keySnap = assessmentSnap.exists ? assessmentKeySnap : assignmentKeySnap;
  const answerKey = keySnap.exists ? keySnap.data()?.answers || {} : {};
  const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
  const unansweredRequired = !timedOut && questions.find((question) => {
    if (question?.required !== true) return false;
    const answer = answers[question.id];
    if (Array.isArray(answer)) return answer.length === 0;
    if (answer && typeof answer === 'object') {
      const rowCount = Array.isArray(question.rows) ? question.rows.length : 1;
      return Object.keys(answer).length < rowCount;
    }
    return answer === undefined || answer === null || String(answer).trim() === '';
  });
  if (unansweredRequired) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Answer all required questions before submitting.'
    );
  }
  const timeLimitSeconds = Math.max(
    0,
    Number(assessment.timeLimit || assessment.duration || 0) * 60
  );
  if (timeLimitSeconds > 0 && timeTaken > timeLimitSeconds + 30) {
    throw new functions.https.HttpsError(
      'deadline-exceeded',
      'The assessment time limit has expired.'
    );
  }
  const configuredToShowCorrectAnswers =
    assessment.settings?.showCorrectAnswers
    ?? assessment.showCorrectAnswers
    ?? false;
  const attemptLimit = attemptLimitFor(assessment);
  // Never disclose a live key while another attempt remains. One-response and
  // one-attempt assessments cannot use the result to improve a later attempt.
  const showCorrectAnswers = Boolean(configuredToShowCorrectAnswers) && (
    assessment.settings?.oneResponsePerUser === true
    || attemptLimit === 1
  );
  let correctCount = 0;
  let earnedPoints = 0;
  let totalPoints = 0;
  let requiresManualGrading = false;
  const questionResults = questions.map((question) => {
    const correctAnswer = Object.prototype.hasOwnProperty.call(answerKey, question.id)
      ? answerKey[question.id]
      : question.correctAnswer;
    const result = gradeAnswer(question, answers[question.id], correctAnswer);
    const points = Math.max(0, Number(question.points) || 0);
    totalPoints += points;
    if (result.autoGraded) {
      if (result.isCorrect) {
        correctCount += 1;
        earnedPoints += points;
      }
    } else {
      requiresManualGrading = true;
    }
    return {
      questionId: question.id,
      userAnswer: answers[question.id] ?? null,
      isCorrect: result.isCorrect,
      autoGraded: result.autoGraded,
      ...(showCorrectAnswers ? { correctAnswer } : {}),
    };
  });

  const score = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const passingScore = Math.min(100, Math.max(0, Number(assessment.passingScore) || 60));
  const passed = !requiresManualGrading && score >= passingScore;
  const attempt = {
    studentId,
    answers,
    score,
    earnedPoints,
    totalPoints,
    correctCount,
    totalQuestions: questions.length,
    timeTaken,
    passed,
    requiresManualGrading,
    passingScore,
    submittedAt: admin.firestore.FieldValue.serverTimestamp(),
    status: requiresManualGrading ? 'pending_review' : 'submitted',
    timedOut,
  };
  const attemptRef = assessment.settings?.oneResponsePerUser
    ? attemptsRef.doc(studentId)
    : attemptsRef.doc();
  await db.runTransaction(async (transaction) => {
    if (assessment.settings?.oneResponsePerUser) {
      // The attempt id is the trainee's uid, so existence is the whole check.
      const existing = await transaction.get(attemptRef);
      if (existing.exists) {
        throw new functions.https.HttpsError(
          'already-exists',
          'Only one response is allowed for this assessment.'
        );
      }
    } else if (attemptLimit > 0) {
      // Counted inside the transaction so two tabs cannot both slip past the
      // last allowed attempt.
      const prior = await transaction.get(attemptsRef.where('studentId', '==', studentId));
      if (prior.size >= attemptLimit) {
        throw new functions.https.HttpsError(
          'failed-precondition',
          `You have used all ${attemptLimit} attempts for this assessment.`
        );
      }
    }
    transaction.create(attemptRef, attempt);
  });

  return {
    id: attemptRef.id,
    ...attempt,
    // Tells the client which subcollection now holds this attempt so it reads
    // the history back from the same place.
    kind: assessmentSnap.exists ? 'assessment' : 'assignment',
    submittedAt: new Date().toISOString(),
    questionResults,
    showCorrectAnswers: Boolean(showCorrectAnswers),
  };
});

// ==================== AUTHORITATIVE PROGRESS & CERTIFICATES ====================

const calculateProgress = async (classId, studentId) => {
  const classRef = db.collection('classes').doc(classId);
  const [assessments, assignments] = await Promise.all([
    classRef.collection('assessments').get(),
    classRef.collection('assignments').get(),
  ]);
  const requiredAssessments = assessments.docs.filter((entry) => {
    const item = entry.data() || {};
    return String(item.status || 'active').toLowerCase() !== 'draft'
      && item.required !== false;
  });
  const requiredAssignments = assignments.docs.filter((entry) => {
    const item = entry.data() || {};
    return String(item.status || 'active').toLowerCase() !== 'draft'
      && item.required !== false;
  });

  const assessmentEvidence = await Promise.all(requiredAssessments.map(async (item) => {
    const attempts = await item.ref.collection('attempts')
      .where('studentId', '==', studentId)
      .get();
    return attempts.docs.some((attempt) => attempt.data()?.passed === true);
  }));
  const assignmentEvidence = await Promise.all(requiredAssignments.map(async (item) => {
    const itemData = item.data() || {};
    if (String(itemData.type || '') !== 'Submission') {
      const attempts = await item.ref.collection('attempts')
        .where('studentId', '==', studentId)
        .get();
      return attempts.docs.some((attempt) => attempt.data()?.passed === true);
    }
    const submission = await item.ref.collection('submissions').doc(studentId).get();
    if (!submission.exists) return false;
    const data = submission.data() || {};
    return data.status === 'accepted'
      || data.passed === true
      || Number.isFinite(Number(data.grade));
  }));

  const totalItems = requiredAssessments.length + requiredAssignments.length;
  const completedItems = [...assessmentEvidence, ...assignmentEvidence].filter(Boolean).length;
  const overallProgress = totalItems > 0
    ? Math.round((completedItems / totalItems) * 100)
    : 0;
  return {
    completedItems,
    totalItems,
    overallProgress,
    requirementsSatisfied: totalItems > 0 && completedItems === totalItems,
  };
};

const persistAuthoritativeProgress = async (classId, studentId, enrollmentRef) => {
  const progress = await calculateProgress(classId, studentId);
  const batch = db.batch();
  batch.set(
    db.collection('students').doc(studentId).collection('progress').doc(classId),
    {
      classId,
      ...progress,
      source: 'authoritative-recalculation',
      lastUpdated: admin.firestore.FieldValue.serverTimestamp(),
    },
    { merge: true }
  );
  if (enrollmentRef) {
    batch.update(enrollmentRef, {
      progress,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  }
  await batch.commit();
  return progress;
};

exports.recalculateMyProgress = boundedFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }
  const classId = String(data?.classId || '').trim();
  if (!classId) {
    throw new functions.https.HttpsError('invalid-argument', 'Class ID is required.');
  }
  const studentId = context.auth.uid;
  const [userDoc, enrollmentQuery] = await Promise.all([
    db.collection('users').doc(studentId).get(),
    db.collection('enrollments')
      .where('classId', '==', classId)
      .where('studentId', '==', studentId)
      .limit(1)
      .get(),
  ]);
  const user = userDoc.data() || {};
  const enrollmentDoc = enrollmentQuery.docs[0];
  if (
    !userDoc.exists
    || String(user.status || '').toLowerCase() !== 'active'
    || !enrollmentDoc
    || !['active', 'ongoing', 'completed'].includes(
      String(enrollmentDoc.data()?.status || '').toLowerCase()
    )
  ) {
    throw new functions.https.HttpsError('permission-denied', 'Active enrollment is required.');
  }
  if (
    context.auth.token.email_verified !== true
    && user.createdBy !== 'admin'
  ) {
    throw new functions.https.HttpsError('permission-denied', 'Verify your email first.');
  }
  return persistAuthoritativeProgress(classId, studentId, enrollmentDoc.ref);
});

exports.changeEnrollmentStatus = boundedFunctions.https.onCall(async (data, context) => {
  const enrollmentId = String(data?.enrollmentId || '').trim();
  const status = String(data?.status || '').trim().toLowerCase();
  const reason = String(data?.reason || '').trim();
  if (!enrollmentId || !['active', 'ongoing', 'terminated'].includes(status)) {
    throw new functions.https.HttpsError('invalid-argument', 'A supported enrollment status is required.');
  }
  if (status === 'terminated' && (reason.length < 3 || reason.length > 1000)) {
    throw new functions.https.HttpsError('invalid-argument', 'A termination reason is required.');
  }
  const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
  const enrollmentDoc = await enrollmentRef.get();
  if (!enrollmentDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Enrollment not found.');
  }
  const enrollment = enrollmentDoc.data() || {};
  const classId = String(enrollment.classId || '').trim();
  const studentId = String(enrollment.studentId || '').trim();
  const { user } = await requireActiveClassStaff(context, classId);
  const memberRef = db.collection('classes').doc(classId).collection('members').doc(studentId);
  const batch = db.batch();
  batch.update(enrollmentRef, {
    status,
    ...(status === 'active' ? {
      approvedAt: admin.firestore.FieldValue.serverTimestamp(),
      approvedBy: context.auth.uid,
    } : {}),
    ...(status === 'terminated' ? {
      terminatedAt: admin.firestore.FieldValue.serverTimestamp(),
      terminationReason: reason,
    } : {}),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  if (status === 'terminated') {
    batch.delete(memberRef);
  } else {
    batch.set(memberRef, {
      studentId,
      enrollmentId,
      status,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
  }
  await batch.commit();
  await writeSecurityLog(
    context.auth.uid,
    user.role,
    'enrollment_status_changed',
    'enrollments',
    enrollmentId,
    { classId, studentId, status, reason: status === 'terminated' ? reason : '' }
  );
  return { updated: true, status, studentId, classId };
});

exports.graduateEnrollment = boundedFunctions.https.onCall(async (data, context) => {
  const enrollmentId = String(data?.enrollmentId || '').trim();
  if (!enrollmentId) {
    throw new functions.https.HttpsError('invalid-argument', 'Enrollment ID is required.');
  }
  const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
  const enrollmentDoc = await enrollmentRef.get();
  if (!enrollmentDoc.exists) {
    throw new functions.https.HttpsError('not-found', 'Enrollment not found.');
  }
  const enrollment = enrollmentDoc.data() || {};
  const classId = String(enrollment.classId || '').trim();
  const studentId = String(enrollment.studentId || '').trim();
  const { user, classData } = await requireActiveClassStaff(context, classId);
  if (!studentId || !['active', 'ongoing'].includes(String(enrollment.status || '').toLowerCase())) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Only an active enrollment can be graduated.'
    );
  }

  const progress = await persistAuthoritativeProgress(classId, studentId, enrollmentRef);
  if (!progress.requirementsSatisfied) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      `The trainee completed ${progress.completedItems} of ${progress.totalItems} required items.`
    );
  }

  const certificateId = randomUUID();
  const verificationToken = randomUUID().replace(/-/g, '');
  const certificateRef = db.collection('certificates').doc(certificateId);
  const studentDoc = await db.collection('users').doc(studentId).get();
  const student = studentDoc.data() || {};
  await db.runTransaction(async (transaction) => {
    const current = await transaction.get(enrollmentRef);
    if (!current.exists || !['active', 'ongoing'].includes(
      String(current.data()?.status || '').toLowerCase()
    )) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'The enrollment is no longer eligible for graduation.'
      );
    }
    transaction.create(certificateRef, {
      certificateNumber: `HYT-${new Date().getUTCFullYear()}-${certificateId.slice(0, 8).toUpperCase()}`,
      verificationToken,
      studentId,
      studentName: student.name || student.displayName || '',
      classId,
      className: classData.name || enrollment.className || '',
      courseId: classData.courseId || enrollment.courseId || '',
      qualificationSnapshot: progress,
      issuedAt: admin.firestore.FieldValue.serverTimestamp(),
      issuedBy: context.auth.uid,
      status: 'valid',
    });
    transaction.update(enrollmentRef, {
      status: 'completed',
      certificateId,
      completedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
  });
  await writeSecurityLog(
    context.auth.uid,
    user.role,
    'certificate_issued',
    'certificates',
    certificateId,
    { enrollmentId, classId, studentId }
  );
  return { graduated: true, certificateId, verificationToken, progress };
});

exports.revokeCertificate = boundedFunctions.https.onCall(async (data, context) => {
  const certificateId = String(data?.certificateId || '').trim();
  const reason = String(data?.reason || '').trim();
  if (!certificateId || reason.length < 5 || reason.length > 1000) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Certificate ID and a revocation reason are required.'
    );
  }
  const certRef = db.collection('certificates').doc(certificateId);
  const cert = await certRef.get();
  if (!cert.exists) throw new functions.https.HttpsError('not-found', 'Certificate not found.');
  const certData = cert.data() || {};
  const { user } = await requireActiveClassStaff(context, certData.classId);
  await certRef.update({
    status: 'revoked',
    revokedAt: admin.firestore.FieldValue.serverTimestamp(),
    revokedBy: context.auth.uid,
    revocationReason: reason,
  });
  await writeSecurityLog(
    context.auth.uid,
    user.role,
    'certificate_revoked',
    'certificates',
    certificateId,
    { classId: certData.classId, studentId: certData.studentId, reason }
  );
  return { revoked: true };
});

exports.verifyCertificate = boundedFunctions.https.onCall(async (data) => {
  const token = String(data?.verificationToken || '').trim();
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    throw new functions.https.HttpsError('invalid-argument', 'A valid verification token is required.');
  }
  const result = await db.collection('certificates')
    .where('verificationToken', '==', token)
    .limit(1)
    .get();
  if (result.empty) {
    return { found: false, valid: false };
  }
  const certificate = result.docs[0].data() || {};
  return {
    found: true,
    valid: certificate.status === 'valid',
    certificateNumber: certificate.certificateNumber || '',
    studentName: certificate.studentName || '',
    className: certificate.className || '',
    courseId: certificate.courseId || '',
    issuedAt: certificate.issuedAt?.toDate?.()?.toISOString?.() || null,
    status: certificate.status || 'unknown',
  };
});

exports.gradeAssessmentAttempt = boundedFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in before grading.');
  }

  const classId = String(data?.classId || '').trim();
  const assessmentId = String(data?.assessmentId || '').trim();
  const attemptId = String(data?.attemptId || '').trim();
  const collectionName = data?.kind === 'assignments' ? 'assignments' : 'assessments';
  const earnedPoints = Number(data?.earnedPoints);
  const feedback = String(data?.feedback || '').trim();
  if (!classId || !assessmentId || !attemptId || !Number.isFinite(earnedPoints)) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Class, assessment, response, and a numeric final score are required.'
    );
  }
  if (feedback.length > 5000) {
    throw new functions.https.HttpsError('invalid-argument', 'Feedback is too long.');
  }

  const userRef = db.collection('users').doc(context.auth.uid);
  const classRef = db.collection('classes').doc(classId);
  const attemptRef = classRef.collection(collectionName)
    .doc(assessmentId).collection('attempts').doc(attemptId);
  const [userSnap, classSnap, attemptSnap] = await Promise.all([
    userRef.get(),
    classRef.get(),
    attemptRef.get(),
  ]);
  const userData = userSnap.data() || {};
  const classData = classSnap.data() || {};
  const isAdmin = userData.role === 'admin';
  const isClassTrainer = userData.role === 'trainer' && (
    classData.trainerId === context.auth.uid
    || (Array.isArray(classData.coTrainerIds) && classData.coTrainerIds.includes(context.auth.uid))
  );
  if (
    !userSnap.exists
    || String(userData.status || '').toLowerCase() !== 'active'
    || (!isAdmin && !isClassTrainer)
  ) {
    throw new functions.https.HttpsError(
      'permission-denied',
      'Only an active trainer for this class can grade this response.'
    );
  }
  if (!classSnap.exists || !attemptSnap.exists) {
    throw new functions.https.HttpsError('not-found', 'The response was not found.');
  }

  const attempt = attemptSnap.data() || {};
  const totalPoints = Math.max(0, Number(attempt.totalPoints) || 0);
  if (earnedPoints < 0 || earnedPoints > totalPoints) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      `Final score must be between 0 and ${totalPoints}.`
    );
  }
  const finalPoints = Math.round(earnedPoints * 100) / 100;
  const score = totalPoints > 0 ? Math.round((finalPoints / totalPoints) * 100) : 0;
  const passingScore = Math.min(100, Math.max(0, Number(attempt.passingScore) || 60));
  const passed = score >= passingScore;
  await attemptRef.update({
    earnedPoints: finalPoints,
    score,
    passed,
    requiresManualGrading: false,
    status: 'reviewed',
    feedback,
    gradedBy: context.auth.uid,
    gradedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
  await writeSecurityLog(
    context.auth.uid,
    userData.role,
    'assessment_attempt_graded',
    collectionName,
    attemptId,
    { classId, assessmentId, earnedPoints: finalPoints, totalPoints }
  );
  return { id: attemptId, earnedPoints: finalPoints, totalPoints, score, passed, feedback };
});

// One-time, idempotent repair for assessments created before answer keys were
// separated from trainee-readable assessment documents.
exports.migrateAssessmentAnswerKeys = boundedFunctions.https.onCall(async (_data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }
  const caller = await db.collection('users').doc(context.auth.uid).get();
  if (
    !caller.exists
    || caller.data()?.role !== 'admin'
    || String(caller.data()?.status || '').toLowerCase() !== 'active'
  ) {
    throw new functions.https.HttpsError('permission-denied', 'Admin access is required.');
  }

  const assessments = await db.collectionGroup('assessments').get();
  const writer = db.bulkWriter();
  let migrated = 0;
  for (const assessmentDoc of assessments.docs) {
    const data = assessmentDoc.data() || {};
    const questions = Array.isArray(data.questions) ? data.questions : [];
    const answers = {};
    for (const question of questions) {
      if (
        question?.id
        && Object.prototype.hasOwnProperty.call(question, 'correctAnswer')
      ) {
        answers[question.id] = question.correctAnswer;
      }
    }
    if (Object.keys(answers).length === 0) continue;

    writer.set(
      assessmentDoc.ref.collection('private').doc('answerKey'),
      {
        answers,
        migratedAt: admin.firestore.FieldValue.serverTimestamp(),
      },
      { merge: true }
    );
    writer.update(assessmentDoc.ref, {
      questions: questions.map(({ correctAnswer: _answer, ...question }) => question),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    migrated += 1;
  }
  await writer.close();
  return { migrated };
});

exports.promoteClassToTemplate = templateCopyFunctions.https.onCall(async (data, context) => {
    await requireActiveAdmin(context);
    const classId = String(data?.classId || '').trim();
    if (!classId) {
      throw new functions.https.HttpsError('invalid-argument', 'Class ID is required.');
    }

    const classRef = db.collection('classes').doc(classId);
    const classDoc = await classRef.get();
    if (!classDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Class not found.');
    }
    const classData = classDoc.data() || {};
    const programId = String(classData.courseId || '').trim();
    if (!programId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This class is not linked to a program and cannot become its template.'
      );
    }

    const templateRef = db.collection('courses').doc(programId);
    const templateDoc = await templateRef.get();
    if (!templateDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'The linked program no longer exists.');
    }

    const contentChecks = await Promise.all(CONTENT_COLLECTIONS.map(
      (collectionName) => classRef.collection(collectionName).limit(1).get()
    ));
    if (contentChecks.every((snapshot) => snapshot.empty)) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'Add at least one topic, material, assessment, or assignment before promoting this class.'
      );
    }

    const templateStoragePrefix = `lmsFiles/template-${programId}`;
    await wipeCourseContent(templateRef);
    await admin.storage().bucket().deleteFiles({
      prefix: `${templateStoragePrefix}/`,
      force: true,
    });

    let counts;
    try {
      counts = await deepCopyCourseContent(classRef, templateRef, {
        authorId: context.auth.uid,
        storagePrefix: `${templateStoragePrefix}/${context.auth.uid}`,
      });
    } catch (error) {
      await wipeCourseContent(templateRef);
      await templateRef.set({
        hasContent: false,
        promotionFailedAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      throw error;
    }
    await templateRef.set({
      hasContent: true,
      sourceClassId: classId,
      promotedAt: admin.firestore.FieldValue.serverTimestamp(),
      promotedBy: context.auth.uid,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await writeActivityLog(
      context.auth.uid,
      'promote_class_to_template',
      'courses',
      programId,
      {
        classId,
        className: classData.name || '',
        replacedExistingTemplate: templateDoc.data()?.hasContent === true,
        counts,
      }
    );

    return { promoted: true, programId, counts };
  });

exports.cloneTemplateToClass = templateCopyFunctions.https.onCall(async (data, context) => {
    if (!context.auth) {
      throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
    }
    const templateId = String(data?.templateId || '').trim();
    const classId = String(data?.classId || '').trim();
    if (!templateId || !classId) {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Template and class IDs are required.'
      );
    }

    const [caller, templateDoc, classDoc] = await Promise.all([
      db.collection('users').doc(context.auth.uid).get(),
      db.collection('courses').doc(templateId).get(),
      db.collection('classes').doc(classId).get(),
    ]);
    const user = caller.data() || {};
    const classData = classDoc.data() || {};
    const isClassTrainer =
      classData.trainerId === context.auth.uid
      || (Array.isArray(classData.coTrainerIds)
        && classData.coTrainerIds.includes(context.auth.uid));
    if (
      !caller.exists
      || String(user.status || '').toLowerCase() !== 'active'
      || (user.role !== 'admin' && !isClassTrainer)
    ) {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only this class’s trainers can apply its program template.'
      );
    }
    if (!classDoc.exists || !templateDoc.exists) {
      throw new functions.https.HttpsError('not-found', 'Class or template not found.');
    }
    if (String(classData.courseId || '') !== templateId) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'The selected template does not belong to this class’s program.'
      );
    }
    if (templateDoc.data()?.hasContent !== true) {
      throw new functions.https.HttpsError(
        'failed-precondition',
        'This program does not have a full-content template yet.'
      );
    }

    const classRef = db.collection('classes').doc(classId);
    await wipeCourseContent(classRef);
    let counts;
    try {
      counts = await deepCopyCourseContent(
        db.collection('courses').doc(templateId),
        classRef,
        {
          authorId: context.auth.uid,
          storagePrefix: `lmsFiles/${classId}/${context.auth.uid}`,
        }
      );
    } catch (error) {
      await wipeCourseContent(classRef);
      if (
        classData.creationMode === 'template'
        && String(classData.status || '').toLowerCase() === 'provisioning'
      ) {
        await db.recursiveDelete(classRef);
        await admin.storage().bucket().deleteFiles({
          prefix: `lmsFiles/${classId}/`,
          force: true,
        }).catch(() => {});
      } else {
        await classRef.set({
          templateCloneStatus: 'failed',
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }, { merge: true });
      }
      throw error;
    }
    await classRef.set({
      templateId,
      templateSourceClassId: templateDoc.data()?.sourceClassId || '',
      templateClonedAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    await writeActivityLog(
      context.auth.uid,
      'clone_template_to_class',
      'classes',
      classId,
      { templateId, counts }
    );
    return { cloned: true, templateId, classId, counts };
  });

exports.deleteAssessmentSecure = boundedFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }
  const classId = String(data?.classId || '').trim();
  const assessmentId = String(data?.assessmentId || '').trim();
  if (!classId || !assessmentId) {
    throw new functions.https.HttpsError(
      'invalid-argument',
      'Class and assessment IDs are required.'
    );
  }

  const [caller, classDoc] = await Promise.all([
    db.collection('users').doc(context.auth.uid).get(),
    db.collection('classes').doc(classId).get(),
  ]);
  const user = caller.data() || {};
  const classData = classDoc.data() || {};
  const isAdmin = user.role === 'admin';
  const isClassTrainer =
    classData.trainerId === context.auth.uid
    || (Array.isArray(classData.coTrainerIds)
      && classData.coTrainerIds.includes(context.auth.uid));
  if (
    !caller.exists
    || String(user.status || '').toLowerCase() !== 'active'
    || (!isAdmin && !isClassTrainer)
  ) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot delete this assessment.');
  }

  await db.recursiveDelete(
    db.collection('classes').doc(classId).collection('assessments').doc(assessmentId)
  );
  return { deleted: true };
});

exports.deleteClassSecure = boundedFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in first.');
  }
  const classId = String(data?.classId || '').trim();
  if (!classId) {
    throw new functions.https.HttpsError('invalid-argument', 'Class ID is required.');
  }

  const classRef = db.collection('classes').doc(classId);
  const [caller, classDoc] = await Promise.all([
    db.collection('users').doc(context.auth.uid).get(),
    classRef.get(),
  ]);
  if (!classDoc.exists) {
    return { deleted: true };
  }
  const user = caller.data() || {};
  const classData = classDoc.data() || {};
  const isAdmin = user.role === 'admin';
  const isLeadTrainer = classData.trainerId === context.auth.uid;
  if (
    !caller.exists
    || String(user.status || '').toLowerCase() !== 'active'
    || (!isAdmin && !isLeadTrainer)
  ) {
    throw new functions.https.HttpsError('permission-denied', 'You cannot delete this class.');
  }
  if (!isAdmin && String(classData.status || '').toLowerCase() !== 'archived') {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Archive the class before deleting it permanently.'
    );
  }

  const enrollments = await db.collection('enrollments').where('classId', '==', classId).get();
  const writer = db.bulkWriter();
  for (const enrollment of enrollments.docs) {
    writer.delete(enrollment.ref);
  }
  await writer.close();
  await db.recursiveDelete(classRef);
  await admin.storage().bucket().deleteFiles({
    prefix: `lmsFiles/${classId}/`,
    force: true,
  }).catch((error) => {
    console.warn('Class files could not be fully removed:', error?.message);
  });

  return { deleted: true, enrollmentsDeleted: enrollments.size };
});

exports.deleteCourseTemplateSecure = boundedFunctions.https.onCall(async (data, context) => {
  await requireActiveAdmin(context);
  const courseId = String(data?.courseId || '').trim();
  if (!courseId) {
    throw new functions.https.HttpsError('invalid-argument', 'Course ID is required.');
  }
  const linkedClass = await db.collection('classes')
    .where('courseId', '==', courseId)
    .limit(1)
    .get();
  if (!linkedClass.empty) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'This course is used by an existing class and cannot be deleted.'
    );
  }
  await admin.storage().bucket().deleteFiles({
    prefix: `lmsFiles/template-${courseId}/`,
    force: true,
  });
  await db.recursiveDelete(db.collection('courses').doc(courseId));
  return { deleted: true };
});

exports.deleteSectorSecure = boundedFunctions.https.onCall(async (data, context) => {
  await requireActiveAdmin(context);
  const sectorId = String(data?.sectorId || '').trim();
  if (!sectorId) {
    throw new functions.https.HttpsError('invalid-argument', 'Sector ID is required.');
  }
  const [linkedClass, linkedCourse] = await Promise.all([
    db.collection('classes').where('sectorId', '==', sectorId).limit(1).get(),
    db.collection('courses').where('sectorId', '==', sectorId).limit(1).get(),
  ]);
  if (!linkedClass.empty || !linkedCourse.empty) {
    throw new functions.https.HttpsError(
      'failed-precondition',
      'Remove this sector’s classes and courses before deleting the sector.'
    );
  }
  await db.collection('sectors').doc(sectorId).delete();
  return { deleted: true };
});

// ==================== COURSE APPLICATION APPROVAL ====================
/**
 * When a trainer approves a course application:
 * 1. Create an enrollment document
 * 2. Update course enrollment count
 * 3. Update user's currentEnrollmentId
 * 4. Log the activity
 * 
 * Transaction ensures atomicity
 */
// Deprecated course-template application flow. Kept unexported only so older
// data can be inspected; current enrollment is class-code based.
const legacyOnApplicationApproved = functions.firestore
  .document('courseApplications/{applicationId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      
      // Only trigger on approved status change
      if (before.status === after.status || after.status !== 'approved') {
        return;
      }
      
      const {
        studentId,
        courseId,
        trainerId,
        sectorId,
      } = after;
      
      return db.runTransaction(async (transaction) => {
        // 1. Check if student still has active enrollment
        const activeEnrollmentsQuery = db.collection('enrollments')
          .where('studentId', '==', studentId)
          .where('status', '==', 'active');
        
        const activeEnrollments = await transaction.get(activeEnrollmentsQuery);
        
        if (!activeEnrollments.empty) {
          throw new Error(
            'Student already has an active enrollment. This should not happen.'
          );
        }
        
        // 2. Create enrollment document
        const enrollmentId = `${studentId}_${courseId}_${Date.now()}`;
        const enrollmentRef = db.collection('enrollments').doc(enrollmentId);
        
        const enrollmentData = {
          studentId,
          courseId,
          trainerId,
          sectorId,
          status: 'active',
          enrolledAt: admin.firestore.FieldValue.serverTimestamp(),
          progress: {
            lessonsCompleted: 0,
            tasksCompleted: 0,
            attendanceRate: 0,
            lastActivityAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        };
        
        transaction.set(enrollmentRef, enrollmentData);
        
        // 3. Update course currentEnrollments count
        const courseRef = db.collection('courses').doc(courseId);
        const courseSnap = await transaction.get(courseRef);
        const courseData = courseSnap.data();
        
        if (courseData.currentEnrollments >= courseData.capacity) {
          throw new Error('Course is at capacity. Approval cannot be processed.');
        }
        
        transaction.update(courseRef, {
          currentEnrollments: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // 4. Update user's currentEnrollmentId
        const userRef = db.collection('users').doc(studentId);
        transaction.update(userRef, {
          currentEnrollmentId: enrollmentId,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // 5. Create activity log
        const logRef = db.collection('activityLogs').doc();
        transaction.set(logRef, {
          userId: trainerId,
          action: 'approve_application',
          entityType: 'courseApplications',
          entityId: context.params.applicationId,
          metadata: {
            studentId,
            courseId,
            enrollmentId,
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      console.error('Error in onApplicationApproved:', error);
      throw error;
    }
  });

// ==================== ENROLLMENT COMPLETION CLEANUP ====================
/**
 * When an enrollment is marked as completed or terminated:
 * 1. Decrement course enrollment count
 * 2. Clear user's currentEnrollmentId
 * 3. Update user's LMS achievement stats if completed
 */
// Deprecated single-course cleanup. Current students may belong to multiple
// classes, so this trigger must not clear a global currentEnrollmentId or
// decrement a course-template counter.
const legacyOnEnrollmentStatusChange = functions.firestore
  .document('enrollments/{enrollmentId}')
  .onUpdate(async (change, context) => {
    try {
      const before = change.before.data();
      const after = change.after.data();
      
      // Only handle status changes
      if (before.status === after.status) {
        return;
      }
      
      const { studentId, courseId, status: newStatus } = after;
      
      // Only handle completion/termination
      if (newStatus !== 'completed' && newStatus !== 'terminated') {
        return;
      }
      
      return db.runTransaction(async (transaction) => {
        // 1. Decrement course enrollment count
        const courseRef = db.collection('courses').doc(courseId);
        transaction.update(courseRef, {
          currentEnrollments: admin.firestore.FieldValue.increment(-1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // 2. Clear user's currentEnrollmentId
        const userRef = db.collection('users').doc(studentId);
        transaction.update(userRef, {
          currentEnrollmentId: null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        
        // 3. Update LMS experience if completed
        if (newStatus === 'completed') {
          const lmsRef = db.collection('users')
            .doc(studentId)
            .collection('lmsExperience')
            .doc('profile');
          
          const lmsSnap = await transaction.get(lmsRef);
          if (lmsSnap.exists()) {
            const lmsData = lmsSnap.data();
            const currentCount = lmsData.achievements?.coursesCompleted || 0;
            
            transaction.update(lmsRef, {
              'achievements.coursesCompleted': currentCount + 1,
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        }
        
        // 4. Create activity log
        const logRef = db.collection('activityLogs').doc();
        transaction.set(logRef, {
          userId: studentId,
          action: newStatus === 'completed' ? 'course_completed' : 'enrollment_terminated',
          entityType: 'enrollments',
          entityId: context.params.enrollmentId,
          metadata: {
            courseId,
            status: newStatus,
          },
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        });
      });
    } catch (error) {
      console.error('Error in onEnrollmentStatusChange:', error);
      throw error;
    }
  });

// ==================== USER DELETION CLEANUP ====================
/**
 * When a user is deleted:
 * - Delete their enrollments
 * - Delete their applications
 * - Delete their lmsExperience
 * - Decrement course enrollment counts
 */
const legacyCleanupUserData = functions.https.onCall(async (data, context) => {
  try {
    if (!context.auth) {
      throw new functions.https.HttpsError(
        'unauthenticated',
        'User must be authenticated'
      );
    }
    
    const { userId } = data;
    
    // Only admins can delete other users
    const adminDoc = await db.collection('users').doc(context.auth.uid).get();
    if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
      throw new functions.https.HttpsError(
        'permission-denied',
        'Only admins can delete users'
      );
    }
    
    return db.runTransaction(async (transaction) => {
      // 1. Get and delete enrollments
      const enrollments = await db.collection('enrollments')
        .where('studentId', '==', userId)
        .where('status', '==', 'active')
        .get();
      
      enrollments.forEach((doc) => {
        // Decrement course counts
        const courseRef = db.collection('courses').doc(doc.data().courseId);
        transaction.update(courseRef, {
          currentEnrollments: admin.firestore.FieldValue.increment(-1),
        });
        
        transaction.delete(doc.ref);
      });
      
      // 2. Delete applications
      const applications = await db.collection('courseApplications')
        .where('studentId', '==', userId)
        .get();
      
      applications.forEach((doc) => {
        transaction.delete(doc.ref);
      });
      
      // 3. Delete lmsExperience
      const lmsRef = db.collection('users')
        .doc(userId)
        .collection('lmsExperience')
        .doc('profile');
      
      transaction.delete(lmsRef);
      
      // 4. Log the deletion
      const logRef = db.collection('activityLogs').doc();
      transaction.set(logRef, {
        userId: context.auth.uid,
        action: 'delete_user',
        entityType: 'users',
        entityId: userId,
        metadata: {
          deletedBy: context.auth.uid,
        },
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      });
    });
  } catch (error) {
    console.error('Error in cleanupUserData:', error);
    throw error;
  }
});

// ==================== COURSE DELETION CLEANUP ====================
/**
 * When a course is deleted:
 * - Cancel all pending applications
 * - Terminate all active enrollments
 * - Delete course materials
 * - Log the deletions
 */
const legacyCleanupCourseData = functions.firestore
  .document('courses/{courseId}')
  .onDelete(async (snap, context) => {
    try {
      const courseId = context.params.courseId;
      
      return db.runTransaction(async (transaction) => {
        // 1. Cancel pending applications
        const applications = await db.collection('courseApplications')
          .where('courseId', '==', courseId)
          .where('status', '==', 'pending')
          .get();
        
        applications.forEach((doc) => {
          transaction.update(doc.ref, {
            status: 'withdrawn',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        
        // 2. Terminate active enrollments
        const enrollments = await db.collection('enrollments')
          .where('courseId', '==', courseId)
          .where('status', '==', 'active')
          .get();
        
        enrollments.forEach((doc) => {
          const { studentId } = doc.data();
          
          // Clear user's current enrollment
          const userRef = db.collection('users').doc(studentId);
          transaction.update(userRef, {
            currentEnrollmentId: null,
          });
          
          // Mark enrollment as terminated
          transaction.update(doc.ref, {
            status: 'terminated',
            terminatedAt: admin.firestore.FieldValue.serverTimestamp(),
            terminationReason: 'Course was deleted',
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        });
        
        // 3. Delete course materials
        const materials = await db.collection('courses')
          .doc(courseId)
          .collection('materials')
          .get();
        
        materials.forEach((doc) => {
          transaction.delete(doc.ref);
        });
      });
    } catch (error) {
      console.error('Error in cleanupCourseData:', error);
      throw error;
    }
  });
