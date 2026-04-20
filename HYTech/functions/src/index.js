// functions/src/index.js
// Firebase Cloud Functions for HYTech LMS
// Deploy with: firebase deploy --only functions

const functions = require('firebase-functions');
const admin = require('firebase-admin');

admin.initializeApp();
const db = admin.firestore();

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
exports.onApplicationApproved = functions.firestore
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
exports.onEnrollmentStatusChange = functions.firestore
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
exports.cleanupUserData = functions.https.onCall(async (data, context) => {
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
exports.cleanupCourseData = functions.firestore
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
