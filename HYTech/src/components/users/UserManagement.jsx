import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  Search, 
  Filter, 
  Plus, 
  MoreVertical, 
  Eye, 
  Edit2, 
  X,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Mail,
  User
} from 'lucide-react';
import { createUserWithEmailAndPassword, getAuth, sendPasswordResetEmail } from 'firebase/auth';
import { deleteApp, initializeApp } from 'firebase/app';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { auth, db, firebaseConfig, firebaseInitError, hasValidFirebaseConfig } from '../../firebase';
import { useToast } from '../../context/ToastContext';

const UserManagement = () => {
  const { addToast } = useToast();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [isResettingPassword, setIsResettingPassword] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const dropdownRef = useRef(null);

  const [users, setUsers] = useState([]);
  const [userAvatars, setUserAvatars] = useState({});

  // Form state for adding new user
  const [newUser, setNewUser] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nameExtension: '',
    birthDate: '',
    email: '',
    password: '',
    role: '',
  });

  // Form state for editing user
  const [editUser, setEditUser] = useState({
    firstName: '',
    middleName: '',
    lastName: '',
    nameExtension: '',
    email: '',
    role: '',
  });

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setActiveDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!db || !hasValidFirebaseConfig) {
      setIsLoadingUsers(false);
      return;
    }

    let isMounted = true;
    let unsubscribeListener = null;

    const loadUsers = async () => {
      const currentUser = auth?.currentUser;
      if (!currentUser?.uid) {
        if (isMounted) setIsLoadingUsers(false);
        return;
      }

      try {
        // Ensure current user doc exists
        const currentUserRef = doc(db, 'users', currentUser.uid);
        const currentUserSnap = await getDoc(currentUserRef);
        if (!currentUserSnap.exists()) {
          const normalizedEmail = String(currentUser.email || '').trim().toLowerCase();
          const fallbackName = normalizedEmail.split('@')[0] || 'User';
          await setDoc(
            currentUserRef,
            {
              uid: currentUser.uid,
              name: fallbackName,
              email: normalizedEmail,
              role: 'admin',
              status: 'Active',
              createdAt: serverTimestamp(),
              createdBy: 'system-backfill',
            },
            { merge: true }
          );
        }

        // Set up real-time listener for users
        if (isMounted) {
          try {
            const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'asc'));
            
            unsubscribeListener = onSnapshot(
              usersQuery,
              (snapshot) => {
                if (!isMounted) return;

                const mappedUsers = snapshot.docs.map((docSnap, index) => {
                  const data = docSnap.data();
                  const normalizedRole = (data.role || 'student').toString();
                  const prettyRole =
                    normalizedRole.charAt(0).toUpperCase() + normalizedRole.slice(1).toLowerCase();

                  return {
                    id: docSnap.id,
                    rowNumber: index + 1,
                    name: data.name || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Unnamed User',
                    idNumber: data.idNumber || '-',
                    email: data.email || '-',
                    role: prettyRole,
                    status: data.status || 'Active',
                  };
                });

                if (isMounted) {
                  setUsers(mappedUsers);
                  setIsLoadingUsers(false);
                }
              },
              (err) => {
                console.error('Error loading users:', err);
                if (isMounted) {
                  addToast(`Failed to load users: ${err?.message || 'Unknown error'}`, 'error');
                  setIsLoadingUsers(false);
                }
              }
            );
          } catch (err) {
            console.error('Error setting up user listener:', err);
            if (isMounted) {
              addToast(`Failed to load users: ${err?.message || 'Unknown error'}`, 'error');
              setIsLoadingUsers(false);
            }
          }
        }
      } catch (err) {
        console.warn('Error in load users:', err);
        if (isMounted) {
          setIsLoadingUsers(false);
        }
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
      if (unsubscribeListener) {
        unsubscribeListener();
        unsubscribeListener = null;
      }
    };
  }, [addToast]);

  // Filter users based on search
  const filteredUsers = users.filter(user => 
    user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.idNumber.includes(searchQuery) ||
    user.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const paginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);

  const handleAddUser = async (e) => {
    e.preventDefault();
    if (!db || !hasValidFirebaseConfig) {
      addToast(firebaseInitError || 'Firebase is not configured correctly.', 'error');
      return;
    }

    if (!newUser.birthDate) {
      addToast('Please select a birth date to generate the temporary password.', 'error');
      return;
    }

    if (newUser.password.length < 8) {
      addToast('Temporary password must be at least 8 characters.', 'error');
      return;
    }

    setIsAddingUser(true);

    const fullName = `${newUser.firstName} ${newUser.middleName ? `${newUser.middleName} ` : ''}${newUser.lastName}${newUser.nameExtension ? ` ${newUser.nameExtension}` : ''}`.trim();
    const numericIdNumbers = users
      .map((u) => Number(u.idNumber))
      .filter((idNum) => !Number.isNaN(idNum));
    const nextIdNumber = numericIdNumbers.length > 0
      ? String(Math.max(...numericIdNumbers) + 1)
      : '5684236526';

    let secondaryApp = null;

    try {
      secondaryApp = initializeApp(firebaseConfig, `user-management-${Date.now()}`);
      const secondaryAuth = getAuth(secondaryApp);

      const credential = await createUserWithEmailAndPassword(
        secondaryAuth,
        newUser.email.trim().toLowerCase(),
        newUser.password
      );

      await setDoc(doc(db, 'users', credential.user.uid), {
        uid: credential.user.uid,
        firstName: newUser.firstName.trim(),
        middleName: newUser.middleName.trim(),
        lastName: newUser.lastName.trim(),
        nameExtension: newUser.nameExtension.trim(),
        idNumber: nextIdNumber,
        name: fullName,
        email: newUser.email.trim().toLowerCase(),
        role: newUser.role.trim().toLowerCase(),
        status: 'Active',
        createdAt: serverTimestamp(),
        createdBy: 'admin',
      });

      await secondaryAuth.signOut();

      setNewUser({
        firstName: '',
        middleName: '',
        lastName: '',
        nameExtension: '',
        birthDate: '',
        email: '',
        password: '',
        role: '',
      });
      setShowAddModal(false);
      addToast('User account created in Firebase Authentication.', 'success');
    } catch (error) {
      const errorMessages = {
        'auth/email-already-in-use': 'This email already exists in Firebase Authentication.',
        'auth/invalid-email': 'Please enter a valid email address.',
        'auth/weak-password': 'Please use a stronger password.',
        'auth/operation-not-allowed': 'Email/password sign-in is disabled in Firebase Authentication.',
      };
      addToast(errorMessages[error?.code] || `Unable to add user (${error?.code || 'unknown error'}).`, 'error');
    } finally {
      if (secondaryApp) {
        await deleteApp(secondaryApp);
      }
      setIsAddingUser(false);
    }
  };

  const handleDeleteUser = () => {
    if (selectedUser) {
      // Delete removed: replaced by deactivation toggle. Keep function stub removed.
    }
  };

  const toggleUserStatus = async (user) => {
    if (!user || !db) return;
    const newStatus = user.status === 'Active' ? 'Inactive' : 'Active';
    try {
      await updateDoc(doc(db, 'users', user.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      addToast(`User marked ${newStatus}.`, 'success');
    } catch {
      addToast('Unable to update user status.', 'error');
    }
  };

  const handleResetPassword = async (user) => {
    if (!user || !auth) return;
    setSelectedUser(user);
    setShowResetPasswordModal(true);
    setActiveDropdown(null);
  };

  const sendResetEmail = async () => {
    if (!selectedUser || !selectedUser.email) return;

    setIsResettingPassword(true);
    try {
      await sendPasswordResetEmail(auth, selectedUser.email);
      addToast(`Password reset email sent to ${selectedUser.email}.`, 'success');
      setShowResetPasswordModal(false);
      setSelectedUser(null);
    } catch (error) {
      const errorMessages = {
        'auth/user-not-found': 'User not found in authentication system.',
        'auth/invalid-email': 'Invalid email address.',
        'auth/too-many-requests': 'Too many attempts. Please try again later.',
      };
      addToast(errorMessages[error?.code] || 'Unable to send reset email. Please try again.', 'error');
    } finally {
      setIsResettingPassword(false);
    }
  };

  const handleViewUser = (user) => {
    setSelectedUser(user);
    setShowViewModal(true);
    setActiveDropdown(null);
  };

  const handleEditUser = (user) => {
    const nameParts = user.name.split(' ');
    setSelectedUser(user);
    setEditUser({
      firstName: nameParts[0] || '',
      middleName: nameParts.length > 3 ? nameParts.slice(1, -1).join(' ') : (nameParts.length > 2 ? nameParts[1] : ''),
      lastName: nameParts.length > 1 ? nameParts[nameParts.length - 1] : '',
      nameExtension: '',
      email: user.email || '',
      role: user.role,
    });
    setShowEditModal(true);
    setActiveDropdown(null);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    const fullName = `${editUser.firstName} ${editUser.middleName ? editUser.middleName + ' ' : ''}${editUser.lastName}${editUser.nameExtension ? ' ' + editUser.nameExtension : ''}`;

    try {
      await updateDoc(doc(db, 'users', selectedUser.id), {
        firstName: editUser.firstName.trim(),
        middleName: editUser.middleName.trim(),
        lastName: editUser.lastName.trim(),
        nameExtension: editUser.nameExtension.trim(),
        name: fullName,
        email: editUser.email.trim().toLowerCase(),
        role: editUser.role.trim().toLowerCase(),
        updatedAt: serverTimestamp(),
      });

      addToast('User profile updated in Firestore.', 'success');
      setShowEditModal(false);
      setSelectedUser(null);
      setEditUser({ firstName: '', middleName: '', lastName: '', nameExtension: '', email: '', role: '' });
    } catch {
      addToast('Unable to update user.', 'error');
    }
  };

  const getRoleBadgeColor = (role) => {
    switch (role.toLowerCase()) {
      case 'admin': return 'bg-purple-100 text-purple-600';
      case 'trainer': return 'bg-blue-100 text-blue-600';
      case 'supervisor': return 'bg-indigo-100 text-indigo-600';
      case 'student': return 'bg-green-100 text-green-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const getInitials = (name) => {
    if (!name) return '?';
    const parts = name.trim().split(' ').filter(part => part);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  const fetchUserAvatar = useCallback(async (userId, userName) => {
    try {
      if (!db) return;
      const settingsRef = doc(db, 'userSettings', userId);
      const settingsSnap = await getDoc(settingsRef);
      
      if (settingsSnap.exists()) {
        const data = settingsSnap.data();
        // Try to find avatar in any of the role settings
        const roles = ['admin', 'trainer', 'supervisor', 'student'];
        for (const role of roles) {
          const roleData = data[role];
          if (roleData?.avatarUrl || roleData?.avatarPreview || roleData?.avatarBase64) {
            const avatar = roleData.avatarUrl || roleData.avatarPreview || roleData.avatarBase64;
            setUserAvatars(prev => ({ ...prev, [userId]: avatar }));
            return;
          }
        }
      }
    } catch (error) {
      console.warn(`Error fetching avatar for user ${userId}:`, error);
    }
  }, [db]);

  // Fetch avatars for paginated users
  useEffect(() => {
    // Calculate paginatedUsers here
    const totalPages = Math.ceil(filteredUsers.length / rowsPerPage);
    const startIndex = (currentPage - 1) * rowsPerPage;
    const currentPaginatedUsers = filteredUsers.slice(startIndex, startIndex + rowsPerPage);
    
    currentPaginatedUsers.forEach(user => {
      if (user.id && !userAvatars[user.id]) {
        fetchUserAvatar(user.id, user.name);
      }
    });
  }, [currentPage, rowsPerPage, filteredUsers, userAvatars, fetchUserAvatar]);

  return (
    <div className="space-y-4">
      {/* Top Bar */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <button className="p-2 border border-gray-200 rounded-lg hover:bg-gray-50:bg-gray-700 transition-colors">
              <Filter className="w-5 h-5 text-gray-500" />
            </button>
            <div className="relative flex-1 sm:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all bg-white"
              />
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors shadow-md hover:shadow-lg"
          >
            <Plus className="w-5 h-5" />
            <span>Add User</span>
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-100">
              <tr>
                <th className="table-header w-12">#</th>
                <th className="table-header">NAME</th>
                <th className="table-header">ROLE</th>
                <th className="table-header">STATUS</th>
                <th className="table-header w-24">ACTION</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoadingUsers && (
                <tr>
                  <td className="table-cell text-center text-gray-500" colSpan={5}>Loading users...</td>
                </tr>
              )}
              {!isLoadingUsers && paginatedUsers.length === 0 && (
                <tr>
                  <td className="table-cell text-center text-gray-500" colSpan={5}>No users found.</td>
                </tr>
              )}
              {paginatedUsers.map((user, index) => (
                <tr 
                  key={user.id}
                  className="hover:bg-gray-50:bg-gray-700 transition-colors animate-fade-in"
                  style={{ animationDelay: `${index * 0.05}s` }}
                >
                  <td className="table-cell text-gray-500">{startIndex + index + 1}</td>
                  <td className="table-cell">
                    <div className="flex items-center gap-3">
                      <div className="relative w-10 h-10 flex-shrink-0">
                        {userAvatars[user.id] ? (
                          <img 
                            src={userAvatars[user.id]} 
                            alt={user.name}
                            className="w-10 h-10 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-semibold border border-gray-200">
                            {getInitials(user.name)}
                          </div>
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-gray-800">{user.name}</p>
                        <p className="text-xs text-gray-400">{user.idNumber}</p>
                      </div>
                    </div>
                  </td>
                  <td className="table-cell">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(user.role)}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="table-cell">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${user.status === 'Active' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.status}
                    </span>
                  </td>
                  <td className="table-cell relative" ref={activeDropdown === user.id ? dropdownRef : null}>
                    <button
                      onClick={() => setActiveDropdown(activeDropdown === user.id ? null : user.id)}
                      className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                    >
                      <MoreVertical className="w-5 h-5 text-gray-400" />
                    </button>
                    
                    {activeDropdown === user.id && (
                      <div className="absolute right-0 top-full mt-1 bg-white rounded-lg shadow-xl border border-gray-100 py-1 z-10 min-w-[160px] animate-slide-down">
                        <button 
                          onClick={() => handleViewUser(user)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                        >
                          <Eye className="w-4 h-4 flex-shrink-0" />
                          <span>View</span>
                        </button>
                        <button 
                          onClick={() => handleEditUser(user)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                        >
                          <Edit2 className="w-4 h-4 flex-shrink-0" />
                          <span>Edit</span>
                        </button>
                        <button
                          onClick={() => handleResetPassword(user)}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                        >
                          <Mail className="w-4 h-4 flex-shrink-0" />
                          <span>Reset Password</span>
                        </button>
                        <button
                          onClick={() => {
                            setActiveDropdown(null);
                            toggleUserStatus(user);
                          }}
                          className="w-full flex items-center gap-3 px-4 py-2.5 text-gray-700 hover:bg-gray-50 transition-colors text-sm whitespace-nowrap"
                        >
                          <span className={`${user.status === 'Active' ? 'text-red-600' : 'text-green-600'}`}>
                            {user.status === 'Active' ? 'Mark Inactive' : 'Mark Active'}
                          </span>
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="text-sm text-gray-500">
            {startIndex + 1}-{Math.min(startIndex + rowsPerPage, filteredUsers.length)} of {filteredUsers.length}
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Rows per page:</span>
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-5 h-5 text-gray-500" />
              </button>
              <span className="text-sm text-gray-600">{currentPage}/{totalPages}</span>
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronRight className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Add User Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowAddModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-scale-in flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-gray-600" />
                <h2 className="text-lg font-semibold text-gray-800">Add User</h2>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleAddUser} className="flex flex-1 min-h-0 flex-col">
              <div className="flex-1 overflow-y-auto p-6 pt-5 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.firstName}
                  onChange={(e) => setNewUser({ ...newUser, firstName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={newUser.middleName}
                  onChange={(e) => setNewUser({ ...newUser, middleName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.lastName}
                  onChange={(e) => setNewUser({ ...newUser, lastName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name Extension
                </label>
                <input
                  type="text"
                  placeholder="Jr., Sr., III, etc."
                  value={newUser.nameExtension}
                  onChange={(e) => setNewUser({ ...newUser, nameExtension: e.target.value })}
                  className="input-field"
                />
              </div>
              <div className="sm:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Birth Date <span className="text-red-500">*</span>
                </label>
                <input
                  type="date"
                  value={newUser.birthDate}
                  onChange={(e) => {
                    const birthDate = e.target.value;
                    setNewUser({ ...newUser, birthDate });
                    // Auto-generate password
                    if (birthDate && newUser.lastName) {
                      const birthYear = new Date(birthDate).getFullYear();
                      const generatedPassword = `${newUser.lastName.toLowerCase()}_hytech_${birthYear}`;
                      setNewUser(prev => ({ ...prev, password: generatedPassword }));
                    }
                  }}
                  className="input-field"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={newUser.email}
                  onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                  placeholder="user@hytech.com"
                  className="input-field"
                  required
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Temporary Password <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={newUser.password}
                  readOnly
                  placeholder="lastname_hytech_year-of-birth"
                  className="input-field bg-gray-50 cursor-not-allowed"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  Format: lastname_hytech_year-of-birth
                </p>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
                    className="input-field appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select</option>
                    <option value="Admin">Admin</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Student">Student</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
              </div>

              <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingUser}
                  className="px-5 py-2.5 bg-green-500 text-white rounded-xl font-semibold hover:bg-green-600 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isAddingUser ? 'Adding...' : 'Add User'}
                </button>
              </div>
            </form>
          </div>
          </div>
        </div>
      )}

      {/* Delete action removed — use Mark Active/Inactive toggle instead. */}

      {/* View User Modal */}
      {showViewModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowViewModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-scale-in flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">User Details</h2>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Full Name</label>
                  <p className="text-gray-900 font-medium">{selectedUser.name}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">ID Number</label>
                  <p className="text-gray-900 font-medium">{selectedUser.idNumber}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Email</label>
                  <p className="text-gray-900 font-medium">{selectedUser.email}</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Role</label>
                  <p className="text-gray-900 font-medium">
                    <span className={`px-3 py-1 rounded-full text-xs font-medium ${getRoleBadgeColor(selectedUser.role)}`}>
                      {selectedUser.role}
                    </span>
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-600 mb-1">Status</label>
                  <p className="text-gray-900 font-medium">
                    <span className="badge-success">{selectedUser.status}</span>
                  </p>
                </div>

                <div className="flex justify-end gap-3 pt-4">
                  <button
                    onClick={() => setShowViewModal(false)}
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowEditModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[calc(100vh-2rem)] sm:max-h-[calc(100vh-4rem)] overflow-hidden animate-scale-in flex flex-col">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <Edit2 className="w-5 h-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Edit User</h2>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="flex flex-1 min-h-0 flex-col">
                <div className="p-6 space-y-4 overflow-y-auto">
                <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editUser.firstName}
                  onChange={(e) => setEditUser({ ...editUser, firstName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Middle Name
                </label>
                <input
                  type="text"
                  value={editUser.middleName}
                  onChange={(e) => setEditUser({ ...editUser, middleName: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editUser.lastName}
                  onChange={(e) => setEditUser({ ...editUser, lastName: e.target.value })}
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name Extension
                </label>
                <input
                  type="text"
                  placeholder="Jr., Sr., III, etc."
                  value={editUser.nameExtension}
                  onChange={(e) => setEditUser({ ...editUser, nameExtension: e.target.value })}
                  className="input-field"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editUser.email}
                  onChange={(e) => setEditUser({ ...editUser, email: e.target.value })}
                  placeholder="user@hytech.com"
                  className="input-field"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Role <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <select
                    value={editUser.role}
                    onChange={(e) => setEditUser({ ...editUser, role: e.target.value })}
                    className="input-field appearance-none cursor-pointer"
                    required
                  >
                    <option value="">Select</option>
                    <option value="Admin">Admin</option>
                    <option value="Trainer">Trainer</option>
                    <option value="Supervisor">Supervisor</option>
                    <option value="Student">Student</option>
                  </select>
                  <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
                </div>
              </div>
                </div>

                <div className="px-6 py-4 border-t border-gray-100 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowEditModal(false)}
                    className="px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-blue-600 text-white rounded-xl font-medium hover:bg-blue-700 transition-colors"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showResetPasswordModal && selectedUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto p-4 sm:p-6">
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowResetPasswordModal(false)}
          />
          <div className="relative mx-auto my-auto flex min-h-full items-center justify-center">
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md animate-scale-in">
              <div className="flex items-center justify-between p-6 border-b border-gray-100">
                <h2 className="text-lg font-semibold text-gray-900">Reset Password</h2>
                <button
                  onClick={() => setShowResetPasswordModal(false)}
                  className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
                  disabled={isResettingPassword}
                >
                  <X className="w-5 h-5 text-gray-500" />
                </button>
              </div>

              <div className="p-6 space-y-4">
                <p className="text-sm text-gray-600">
                  Send a password reset email to:
                </p>
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <p className="font-medium text-gray-900">{selectedUser.name}</p>
                  <p className="text-sm text-gray-600">{selectedUser.email}</p>
                </div>
                <p className="text-xs text-gray-500">
                  They will receive an email with instructions to reset their password.
                </p>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowResetPasswordModal(false)}
                    className="flex-1 px-5 py-2.5 text-gray-700 hover:bg-gray-100 rounded-xl font-medium transition-colors"
                    disabled={isResettingPassword}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={sendResetEmail}
                    disabled={isResettingPassword}
                    className="flex-1 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-semibold hover:bg-blue-700 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    {isResettingPassword ? 'Sending...' : 'Send Email'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
