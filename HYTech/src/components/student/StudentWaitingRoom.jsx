import React, { useEffect, useMemo, useState } from 'react';
import { Bell, Check, GraduationCap, KeyRound, LogOut, Users } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  createNotification,
  getTrainers,
  joinClassByCode,
  logActivity,
} from '../../utils/firestoreService';

const NOTIFY_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour per trainer

const getNotifyLog = () => {
  try {
    return JSON.parse(localStorage.getItem('hyt:waiting-room:notified') || '{}');
  } catch {
    return {};
  }
};

const StudentWaitingRoom = () => {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const [trainers, setTrainers] = useState([]);
  const [isLoadingTrainers, setIsLoadingTrainers] = useState(true);
  const [selectedTrainerId, setSelectedTrainerId] = useState('');
  const [isNotifying, setIsNotifying] = useState(false);
  const [notifyLog, setNotifyLog] = useState(getNotifyLog);
  const [classCode, setClassCode] = useState('');
  const [isJoining, setIsJoining] = useState(false);

  useEffect(() => {
    let isMounted = true;

    const loadTrainers = async () => {
      try {
        const trainerList = await getTrainers();
        if (isMounted) {
          setTrainers(trainerList);
        }
      } catch (error) {
        console.error('Error loading trainers:', error);
        if (isMounted) {
          addToast('Unable to load trainers. Please refresh the page.', 'error');
        }
      } finally {
        if (isMounted) {
          setIsLoadingTrainers(false);
        }
      }
    };

    loadTrainers();
    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const selectedTrainer = useMemo(
    () => trainers.find((trainer) => trainer.id === selectedTrainerId) || null,
    [trainers, selectedTrainerId]
  );

  const isOnCooldown = (trainerId) => {
    const lastNotified = notifyLog[trainerId];
    return Boolean(lastNotified && Date.now() - lastNotified < NOTIFY_COOLDOWN_MS);
  };

  const handleNotify = async () => {
    if (!selectedTrainer) {
      addToast('Select your trainer first.', 'error');
      return;
    }

    if (isOnCooldown(selectedTrainer.id)) {
      addToast('You already notified this trainer recently. Please wait for them to add you.', 'info');
      return;
    }

    setIsNotifying(true);
    try {
      const studentName = user?.displayName || user?.name || user?.email || 'A student';
      await createNotification({
        toUid: selectedTrainer.id,
        type: 'student_waiting',
        text: `${studentName} (${user?.email}) signed up and is waiting to be added to your class.`,
        fromUid: user?.uid || '',
        fromName: studentName,
      });

      logActivity(user?.uid, 'notify_trainer', 'users', selectedTrainer.id, {
        trainerName: selectedTrainer.name || selectedTrainer.displayName || '',
      });

      const updatedLog = { ...notifyLog, [selectedTrainer.id]: Date.now() };
      setNotifyLog(updatedLog);
      localStorage.setItem('hyt:waiting-room:notified', JSON.stringify(updatedLog));

      addToast('Your trainer has been notified!', 'success');
    } catch (error) {
      console.error('Error notifying trainer:', error);
      addToast('Unable to notify the trainer. Please try again.', 'error');
    } finally {
      setIsNotifying(false);
    }
  };

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!classCode.trim()) {
      addToast('Enter a class code first.', 'error');
      return;
    }

    setIsJoining(true);
    try {
      const enrollment = await joinClassByCode(user.uid, classCode);
      logActivity(user.uid, 'join_class', 'enrollments', enrollment.id, {
        className: enrollment.className,
      });
      addToast(`Joined ${enrollment.className}! Loading your dashboard...`, 'success');
      // The enrollment subscription in the layout will switch the view automatically.
    } catch (error) {
      addToast(error.message || 'Unable to join class.', 'error');
    } finally {
      setIsJoining(false);
    }
  };

  const trainerDisplayName = (trainer) =>
    trainer.name || trainer.displayName || trainer.email || 'Trainer';

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-orange-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-100 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="bg-[#0B005C] text-white p-8 text-center">
            <div className="w-20 h-20 bg-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
              <GraduationCap className="w-10 h-10" />
            </div>
            <h1 className="text-2xl font-bold mb-2">
              Welcome{user?.displayName ? `, ${user.displayName}` : ''}!
            </h1>
            <p className="text-white/80">
              Your account is ready, but you're not in a class yet.
            </p>
          </div>

          <div className="p-8 space-y-8">
            {/* Waiting message */}
            <div className="text-center">
              <h2 className="text-lg font-semibold text-gray-800 mb-1">
                Wait for a Trainer to add you to their class
              </h2>
              <p className="text-gray-500 text-sm">
                Once a trainer adds you (or you join with a class code), your dashboard will unlock automatically.
              </p>
            </div>

            {/* Trainer picker + notify */}
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Users className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-800">Who is your trainer?</h3>
              </div>

              {isLoadingTrainers ? (
                <div className="flex justify-center py-6">
                  <div className="w-8 h-8 rounded-full border-4 border-gray-200 border-t-[#0B005C] animate-spin" />
                </div>
              ) : trainers.length === 0 ? (
                <p className="text-sm text-gray-500 bg-gray-50 rounded-lg p-4 text-center">
                  No trainers are registered yet. Please check back later.
                </p>
              ) : (
                <div className="space-y-3">
                  <div className="grid gap-2 max-h-56 overflow-y-auto pr-1">
                    {trainers.map((trainer) => (
                      <button
                        key={trainer.id}
                        type="button"
                        onClick={() => setSelectedTrainerId(trainer.id)}
                        className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                          selectedTrainerId === trainer.id
                            ? 'border-[#0B005C] bg-blue-50/60 ring-1 ring-[#0B005C]'
                            : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-gray-800 truncate">{trainerDisplayName(trainer)}</p>
                          <p className="text-xs text-gray-500 truncate">{trainer.email}</p>
                        </div>
                        {selectedTrainerId === trainer.id && (
                          <Check className="w-5 h-5 text-[#0B005C] flex-shrink-0" />
                        )}
                      </button>
                    ))}
                  </div>

                  <button
                    type="button"
                    onClick={handleNotify}
                    disabled={!selectedTrainer || isNotifying || (selectedTrainer && isOnCooldown(selectedTrainer.id))}
                    className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-[#0B005C] text-white font-medium hover:bg-[#1a0f7a] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <Bell className="w-4 h-4" />
                    {selectedTrainer && isOnCooldown(selectedTrainer.id)
                      ? 'Trainer notified — please wait'
                      : isNotifying
                        ? 'Notifying...'
                        : 'Notify my trainer'}
                  </button>
                </div>
              )}
            </div>

            {/* Divider */}
            <div className="flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wide">or</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Join by class code */}
            <form onSubmit={handleJoinByCode}>
              <div className="flex items-center gap-2 mb-3">
                <KeyRound className="w-5 h-5 text-gray-500" />
                <h3 className="font-semibold text-gray-800">Have a class code?</h3>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={classCode}
                  onChange={(e) => setClassCode(e.target.value.toUpperCase())}
                  placeholder="e.g. ABC123"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0B005C] focus:border-transparent font-mono tracking-widest"
                  maxLength={12}
                />
                <button
                  type="submit"
                  disabled={isJoining || !classCode.trim()}
                  className="px-6 py-3 rounded-xl bg-orange-500 text-white font-medium hover:bg-orange-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isJoining ? 'Joining...' : 'Join'}
                </button>
              </div>
            </form>
          </div>

          {/* Footer */}
          <div className="px-8 py-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
            <p className="text-xs text-gray-400">Signed in as {user?.email}</p>
            <button
              type="button"
              onClick={logout}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-red-600 transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentWaitingRoom;
