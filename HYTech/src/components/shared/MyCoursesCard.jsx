import React, { useEffect, useState } from 'react';
import { BookOpen, Loader } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { getStudentEnrollments, getCourses } from '../../utils/firestoreService';

/**
 * Read-only "My Courses" card, fit to the user's role.
 * - student: their enrolled classes (from enrollments)
 * - trainer: the classes they teach
 * (Admins have no courses, so this card is not shown for them.)
 */
const MyCoursesCard = ({ role = 'student' }) => {
  const { user } = useAuth();
  const [courses, setCourses] = useState(null); // null = loading

  useEffect(() => {
    if (!user?.uid) return;
    let mounted = true;
    (async () => {
      try {
        if (role === 'trainer') {
          const classes = await getCourses({ trainerId: user.uid });
          if (mounted) {
            setCourses(
              (classes || []).map((c) => ({
                name: c.name || 'Class',
                meta: c.level || c.status || '',
              }))
            );
          }
        } else {
          const enrollments = await getStudentEnrollments(user.uid);
          if (mounted) {
            setCourses(
              (enrollments || []).map((e) => ({
                name: e.className || 'Class',
                meta: e.status ? e.status.charAt(0).toUpperCase() + e.status.slice(1) : '',
              }))
            );
          }
        }
      } catch (error) {
        console.error('Error loading courses:', error);
        if (mounted) setCourses([]);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [user?.uid, role]);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">
          {role === 'trainer' ? 'Classes I Teach' : 'My Courses'}
        </h3>
      </div>

      {courses === null ? (
        <div className="flex justify-center py-6">
          <Loader className="w-6 h-6 text-[#0B005C] animate-spin" />
        </div>
      ) : courses.length === 0 ? (
        <p className="text-sm text-gray-400">
          {role === 'trainer' ? 'You have no classes yet.' : "You're not enrolled in any course yet."}
        </p>
      ) : (
        <div className="space-y-2">
          {courses.map((c, i) => (
            <div key={i} className="flex items-center justify-between p-3 rounded-xl border border-gray-100">
              <span className="font-medium text-gray-800">{c.name}</span>
              {c.meta && <span className="text-xs text-gray-500">{c.meta}</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MyCoursesCard;
