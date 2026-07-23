import React from 'react';
import { ArrowLeft, Eye } from 'lucide-react';
import { useNavigate, useParams } from 'react-router-dom';
import StudentCourse from '../student/StudentCourse';

const AdminStudentClassPreview = () => {
  const navigate = useNavigate();
  const { classname } = useParams();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-2xl border border-blue-200 bg-blue-50 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-blue-600 p-2 text-white">
            <Eye className="h-5 w-5" />
          </div>
          <div>
            <h1 className="font-bold text-blue-950">Trainee View Preview</h1>
            <p className="mt-0.5 text-sm text-blue-800">
              This is the class experience trainees see. Preview mode is read-only and does not create activity, attempts, comments, or submissions.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => navigate('/admin/classes', {
            state: { expandedClassId: classname, activeTab: 'classes' },
          })}
          className="inline-flex flex-shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-300 bg-white px-4 py-2.5 text-sm font-semibold text-blue-800 hover:bg-blue-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Classes
        </button>
      </div>

      <StudentCourse previewMode />
    </div>
  );
};

export default AdminStudentClassPreview;
