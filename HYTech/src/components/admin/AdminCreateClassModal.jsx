import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Copy,
  Loader,
  RefreshCw,
  Users,
  X,
} from 'lucide-react';
import SubjectListEditor from '../shared/SubjectListEditor';
import ClassAppearanceEditor from '../shared/ClassAppearanceEditor';
import {
  compressAndStoreFile,
  createCourse,
  createNotification,
  deleteClass,
  generateUniqueClassCode,
  updateCourse,
} from '../../utils/firestoreService';
import { getPlaceholderColor } from '../../utils/courseColors';
import { useToast } from '../../context/ToastContext';

const isActive = (status) => String(status || 'Active').toLowerCase() === 'active';

const trainerName = (trainer) =>
  trainer?.name || trainer?.displayName || trainer?.email || 'Unnamed trainer';

const AdminCreateClassModal = ({
  courses = [],
  sectors = [],
  trainers = [],
  onClose,
  onCreated,
}) => {
  const { addToast } = useToast();
  const [step, setStep] = useState('form');
  const [sectorId, setSectorId] = useState('');
  const [courseId, setCourseId] = useState('');
  const [className, setClassName] = useState('');
  const [trainerId, setTrainerId] = useState('');
  const [classCode, setClassCode] = useState('');
  const [creationMode, setCreationMode] = useState('empty');
  const [finalStatus, setFinalStatus] = useState('Draft');
  const [subjects, setSubjects] = useState([]);
  const [color, setColor] = useState('');
  const [imageUrl, setImageUrl] = useState('');
  const [imagePath, setImagePath] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const [generatingCode, setGeneratingCode] = useState(false);
  const [saving, setSaving] = useState(false);

  const activeSectors = useMemo(
    () => sectors.filter((sector) => isActive(sector.status)),
    [sectors]
  );
  const activeCourses = useMemo(
    () => courses.filter((course) => isActive(course.status)),
    [courses]
  );
  const sectorCourses = useMemo(
    () => activeCourses.filter((course) => course.sectorId === sectorId),
    [activeCourses, sectorId]
  );
  const activeTrainers = useMemo(
    () => trainers.filter((trainer) => isActive(trainer.status)),
    [trainers]
  );
  const selectedCourse = activeCourses.find((course) => course.id === courseId) || null;
  const selectedSector = activeSectors.find((sector) => sector.id === sectorId) || null;
  const selectedTrainer = activeTrainers.find((trainer) => trainer.id === trainerId) || null;

  const regenerateCode = async () => {
    try {
      setGeneratingCode(true);
      setClassCode(await generateUniqueClassCode());
    } catch (error) {
      addToast(error?.message || 'Unable to generate a class code.', 'error');
    } finally {
      setGeneratingCode(false);
    }
  };

  useEffect(() => {
    regenerateCode();
    // Generate once when the modal opens; the administrator can regenerate.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectCourse = (nextCourseId) => {
    const course = activeCourses.find((item) => item.id === nextCourseId);
    setCourseId(nextCourseId);
    if (!course) {
      setClassName('');
      setSubjects([]);
      setColor('');
      setImageUrl('');
      setImagePath('');
      setImageFile(null);
      return;
    }
    setClassName(course.name || '');
    setSubjects(Array.isArray(course.subjects) ? [...course.subjects] : []);
    setColor(course.color || getPlaceholderColor(course.id).bg);
    setImageUrl(course.bgImage || '');
    setImagePath(course.bgImagePath || '');
    setImageFile(null);
    if (course.hasContent !== true) setCreationMode('empty');
  };

  const handleImageChange = (file) => {
    if (!file) {
      setImageFile(null);
      return;
    }
    if (!file.type?.startsWith('image/')) {
      addToast('Please select a valid image file.', 'error');
      return;
    }
    if (file.size > 25 * 1024 * 1024) {
      addToast('Class card images must be 25 MB or smaller.', 'error');
      return;
    }
    setImageFile(file);
  };

  const validate = () => {
    const normalizedName = className.trim().replace(/\s+/g, ' ');
    if (!sectorId || !selectedSector) return 'Select an active sector.';
    if (!courseId || !selectedCourse) return 'Select an active program.';
    if (selectedCourse.sectorId !== sectorId) return 'The selected program does not belong to this sector.';
    if (normalizedName.length < 3 || normalizedName.length > 100) {
      return 'Class name must be between 3 and 100 characters.';
    }
    if (!trainerId || !selectedTrainer) return 'Assign an active lead trainer.';
    if (!classCode) return 'Generate a class code.';
    if (creationMode === 'template' && selectedCourse.hasContent !== true) {
      return 'This program does not have a complete template yet.';
    }
    if (!['Draft', 'Active'].includes(finalStatus)) return 'Choose a valid initial status.';
    return '';
  };

  const showReview = () => {
    const validationError = validate();
    if (validationError) {
      addToast(validationError, 'error');
      return;
    }
    setStep('review');
  };

  const createClass = async () => {
    const validationError = validate();
    if (validationError) {
      addToast(validationError, 'error');
      setStep('form');
      return;
    }

    let createdClassId = null;
    let finalized = false;
    try {
      setSaving(true);
      const normalizedName = className.trim().replace(/\s+/g, ' ');
      createdClassId = await createCourse(
        {
          name: normalizedName,
          description: selectedCourse.description || '',
          level: selectedCourse.level || 'NC I',
          status: 'Provisioning',
          desiredStatus: finalStatus,
          classCode,
          courseId: selectedCourse.id,
          trainerName: trainerName(selectedTrainer),
          bgImage: imageUrl,
          bgImagePath: imagePath,
          color: color || getPlaceholderColor(selectedCourse.id).bg,
          templateMode: creationMode,
          templateHasContent: selectedCourse.hasContent === true,
          subjects: creationMode === 'empty' ? subjects : [],
        },
        { sectorId, trainerId }
      );

      let finalImageUrl = imageUrl;
      let finalImagePath = imagePath;
      if (imageFile) {
        const uploadedImage = await compressAndStoreFile(imageFile, createdClassId);
        finalImageUrl = uploadedImage.url;
        finalImagePath = uploadedImage.storagePath;
      }

      await updateCourse(createdClassId, {
        status: finalStatus,
        bgImage: finalImageUrl,
        bgImagePath: finalImagePath,
        color: color || getPlaceholderColor(selectedCourse.id).bg,
      });
      finalized = true;

      createNotification({
        toUid: trainerId,
        type: 'class_assigned',
        text: `An administrator assigned you as the lead trainer of ${normalizedName}.`,
        fromName: 'Administrator',
        metadata: {
          classId: createdClassId,
          className: normalizedName,
          link: `/trainer/${encodeURIComponent(createdClassId)}`,
        },
      }).catch((error) => {
        console.warn('Class created, but trainer notification failed:', error?.message);
      });

      addToast(`${normalizedName} created successfully.`, 'success');
      try {
        await onCreated?.(createdClassId);
      } catch (refreshError) {
        console.error('Class was created, but the admin list could not refresh:', refreshError);
        onClose?.();
      }
    } catch (error) {
      const incompleteClassId = createdClassId || error?.createdClassId;
      if (incompleteClassId && !finalized) {
        await deleteClass(incompleteClassId).catch((cleanupError) => {
          console.error('Could not clean up incomplete class:', cleanupError);
        });
      }
      addToast(error?.message || 'Unable to create the class.', 'error');
      setStep('form');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
      <button
        type="button"
        className="fixed inset-0 cursor-default bg-black/55 backdrop-blur-sm"
        onClick={saving ? undefined : onClose}
        aria-label="Close create class"
      />
      <div className="relative flex max-h-[calc(100dvh-1rem)] w-full max-w-3xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-4 border-b border-gray-100 p-4 sm:p-6">
          <div className="flex min-w-0 items-start gap-3">
            {step === 'review' && (
              <button
                type="button"
                onClick={() => setStep('form')}
                disabled={saving}
                className="mt-0.5 rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
                aria-label="Back to class details"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
            )}
            <div>
              <h2 className="text-xl font-bold text-gray-900">
                {step === 'review' ? 'Review New Class' : 'Create Class'}
              </h2>
              <p className="mt-1 text-sm text-gray-500">
                {step === 'review'
                  ? 'Confirm the assignment and provisioning options.'
                  : 'Create a running class and assign its lead trainer.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-50"
            aria-label="Close create class"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="overflow-y-auto p-4 sm:p-6">
          {step === 'form' ? (
            <div className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">Sector *</label>
                  <select
                    value={sectorId}
                    onChange={(event) => {
                      setSectorId(event.target.value);
                      selectCourse('');
                    }}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Select sector</option>
                    {activeSectors.map((sector) => (
                      <option key={sector.id} value={sector.id}>{sector.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">Program *</label>
                  <select
                    value={courseId}
                    onChange={(event) => selectCourse(event.target.value)}
                    disabled={!sectorId}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20 disabled:bg-gray-100"
                  >
                    <option value="">{sectorId ? 'Select program' : 'Select a sector first'}</option>
                    {sectorCourses.map((course) => (
                      <option key={course.id} value={course.id}>
                        {course.name}{course.available === false ? ' (not trainer-visible)' : ''}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">Class name *</label>
                  <input
                    type="text"
                    value={className}
                    onChange={(event) => setClassName(event.target.value)}
                    maxLength={100}
                    placeholder="Example: CSS NC II – Batch 2026-A"
                    className="w-full rounded-xl border border-gray-300 px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  />
                  <p className="mt-1 text-xs text-gray-500">{className.trim().length}/100 characters</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">Lead trainer *</label>
                  <select
                    value={trainerId}
                    onChange={(event) => setTrainerId(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="">Assign trainer</option>
                    {activeTrainers.map((trainer) => (
                      <option key={trainer.id} value={trainer.id}>{trainerName(trainer)}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">Class code</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={classCode}
                      readOnly
                      className="min-w-0 flex-1 rounded-xl border border-gray-300 bg-gray-50 px-3 py-2.5 font-mono text-sm"
                    />
                    <button
                      type="button"
                      onClick={regenerateCode}
                      disabled={generatingCode}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-gray-300 px-3 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {generatingCode ? <Loader className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                      Regenerate
                    </button>
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold text-gray-800">Initial status</label>
                  <select
                    value={finalStatus}
                    onChange={(event) => setFinalStatus(event.target.value)}
                    className="w-full rounded-xl border border-gray-300 bg-white px-3 py-2.5 focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
                  >
                    <option value="Draft">Draft – trainer preparation</option>
                    <option value="Active">Active – ready to use</option>
                  </select>
                </div>
              </div>

              <fieldset>
                <legend className="mb-2 text-sm font-semibold text-gray-800">Class content</legend>
                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => setCreationMode('empty')}
                    className={`rounded-xl border p-4 text-left ${
                      creationMode === 'empty'
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500'
                        : 'border-gray-200 hover:border-blue-300'
                    }`}
                  >
                    <BookOpen className="mb-2 h-5 w-5 text-blue-600" />
                    <p className="font-semibold text-gray-900">Start with module headings</p>
                    <p className="mt-1 text-xs text-gray-500">Use an editable outline without copying teaching content.</p>
                  </button>
                  <button
                    type="button"
                    onClick={() => selectedCourse?.hasContent === true && setCreationMode('template')}
                    disabled={selectedCourse?.hasContent !== true}
                    className={`rounded-xl border p-4 text-left disabled:cursor-not-allowed disabled:opacity-50 ${
                      creationMode === 'template'
                        ? 'border-violet-500 bg-violet-50 ring-1 ring-violet-500'
                        : 'border-gray-200 hover:border-violet-300'
                    }`}
                  >
                    <Copy className="mb-2 h-5 w-5 text-violet-600" />
                    <p className="font-semibold text-gray-900">Copy complete template</p>
                    <p className="mt-1 text-xs text-gray-500">
                      {selectedCourse?.hasContent === true
                        ? 'Copy topics, materials, assessments, answer keys, and assignments.'
                        : 'This program has no complete template yet.'}
                    </p>
                  </button>
                </div>
              </fieldset>

              {creationMode === 'empty' && selectedCourse && (
                <SubjectListEditor
                  subjects={subjects}
                  onChange={setSubjects}
                  label="Module outline"
                  hint="These headings become published module sections. The assigned trainer can edit them later."
                />
              )}

              {selectedCourse && (
                <div className="border-t border-gray-100 pt-5">
                  <ClassAppearanceEditor
                    color={color}
                    imageUrl={imageUrl}
                    imageFile={imageFile}
                    onColorChange={setColor}
                    onImageChange={handleImageChange}
                    onRemoveImage={() => {
                      setImageFile(null);
                      setImageUrl('');
                      setImagePath('');
                    }}
                    disabled={saving}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl border border-blue-200 bg-blue-50 p-5">
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-6 w-6 flex-shrink-0 text-blue-600" />
                  <div>
                    <h3 className="font-bold text-blue-950">{className.trim()}</h3>
                    <p className="mt-1 text-sm text-blue-800">
                      {selectedCourse?.name} · {selectedSector?.name}
                    </p>
                  </div>
                </div>
              </div>

              <dl className="grid gap-4 rounded-2xl border border-gray-200 p-5 sm:grid-cols-2">
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Lead trainer</dt>
                  <dd className="mt-1 flex items-center gap-2 font-medium text-gray-900">
                    <Users className="h-4 w-4 text-gray-400" />
                    {trainerName(selectedTrainer)}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Class code</dt>
                  <dd className="mt-1 font-mono font-bold text-gray-900">{classCode}</dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Content</dt>
                  <dd className="mt-1 font-medium text-gray-900">
                    {creationMode === 'template' ? 'Complete program template' : `${subjects.length} module heading${subjects.length === 1 ? '' : 's'}`}
                  </dd>
                </div>
                <div>
                  <dt className="text-xs font-semibold uppercase tracking-wide text-gray-400">Initial status</dt>
                  <dd className="mt-1 font-medium text-gray-900">{finalStatus}</dd>
                </div>
              </dl>

              <p className="rounded-xl bg-amber-50 p-4 text-sm text-amber-800">
                The class remains hidden in Provisioning until its content and appearance finish successfully.
              </p>
            </div>
          )}
        </div>

        <div className="flex flex-col-reverse justify-end gap-2 border-t border-gray-100 p-4 sm:flex-row sm:p-6">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-xl px-5 py-2.5 font-medium text-gray-700 hover:bg-gray-100 disabled:opacity-50"
          >
            Cancel
          </button>
          {step === 'form' ? (
            <button
              type="button"
              onClick={showReview}
              className="rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700"
            >
              Review Class
            </button>
          ) : (
            <button
              type="button"
              onClick={createClass}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {saving && <Loader className="h-4 w-4 animate-spin" />}
              {saving ? 'Creating class…' : 'Create Class'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminCreateClassModal;
