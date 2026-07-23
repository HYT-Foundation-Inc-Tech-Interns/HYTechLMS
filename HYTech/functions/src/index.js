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
  .runWith({ maxInstances: 5 });
const templateCopyFunctions = functions
  .region(FUNCTION_REGION)
  .runWith({ maxInstances: 2, timeoutSeconds: 540, memory: '1GB' });
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
  await requireActiveAdmin(context);
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
  return { updated: true };
});

// ==================== SECURE ASSESSMENT SUBMISSION ====================

const normalizeAnswerText = (value) => String(value ?? '').trim().toLowerCase();

const sameIndexSet = (left, right) => {
  const a = Array.isArray(left) ? left.map(Number).sort((x, y) => x - y) : [];
  const b = Array.isArray(right) ? right.map(Number).sort((x, y) => x - y) : [];
  return a.length === b.length && a.every((value, index) => value === b[index]);
};

const gradeAnswer = (question, answer, correctAnswer) => {
  const type = String(question?.type || 'multiple-choice');
  if (type === 'paragraph') return { autoGraded: false, isCorrect: false };
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
  return {
    autoGraded: true,
    isCorrect: answer !== '' && answer !== null && answer !== undefined
      && Number(answer) === Number(correctAnswer),
  };
};

exports.submitAssessmentAttempt = boundedFunctions.https.onCall(async (data, context) => {
  if (!context.auth) {
    throw new functions.https.HttpsError('unauthenticated', 'Sign in before submitting.');
  }

  const studentId = context.auth.uid;
  const classId = String(data?.classId || '').trim();
  const assessmentId = String(data?.assessmentId || '').trim();
  const answers = data?.answers && typeof data.answers === 'object' ? data.answers : {};
  const timeTaken = Math.max(0, Number(data?.timeTaken) || 0);
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
  const assessmentRef = classRef.collection('assessments').doc(assessmentId);
  const keyRef = assessmentRef.collection('private').doc('answerKey');

  const [userSnap, classSnap, assessmentSnap, keySnap, enrollmentSnap] = await Promise.all([
    userRef.get(),
    classRef.get(),
    assessmentRef.get(),
    keyRef.get(),
    db.collection('enrollments')
      .where('studentId', '==', studentId)
      .where('classId', '==', classId)
      .get(),
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
  if (!classSnap.exists || !assessmentSnap.exists) {
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

  const assessment = assessmentSnap.data() || {};
  if (String(assessment.status || 'active') === 'draft') {
    throw new functions.https.HttpsError('failed-precondition', 'This assessment is not published.');
  }
  const now = Date.now();
  const availableAt = assessment.availableDate ? new Date(assessment.availableDate).getTime() : 0;
  const dueAt = assessment.dueDate ? new Date(assessment.dueDate).getTime() : 0;
  if (availableAt && Number.isFinite(availableAt) && now < availableAt) {
    throw new functions.https.HttpsError('failed-precondition', 'This assessment is not open yet.');
  }
  if (dueAt && Number.isFinite(dueAt) && now > dueAt) {
    throw new functions.https.HttpsError('deadline-exceeded', 'The assessment deadline has passed.');
  }

  const attemptsRef = assessmentRef.collection('attempts');

  const answerKey = keySnap.exists ? keySnap.data()?.answers || {} : {};
  const questions = Array.isArray(assessment.questions) ? assessment.questions : [];
  const showCorrectAnswers =
    assessment.settings?.showCorrectAnswers
    ?? assessment.showCorrectAnswers
    ?? false;
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
  };
  const attemptRef = assessment.settings?.oneResponsePerUser
    ? attemptsRef.doc(studentId)
    : attemptsRef.doc();
  await db.runTransaction(async (transaction) => {
    if (assessment.settings?.oneResponsePerUser) {
      const existing = await transaction.get(attemptRef);
      if (existing.exists) {
        throw new functions.https.HttpsError(
          'already-exists',
          'Only one response is allowed for this assessment.'
        );
      }
    }
    transaction.create(attemptRef, attempt);
  });

  return {
    id: attemptRef.id,
    ...attempt,
    submittedAt: new Date().toISOString(),
    questionResults,
    showCorrectAnswers: Boolean(showCorrectAnswers),
  };
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
