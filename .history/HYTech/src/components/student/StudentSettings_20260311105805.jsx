import React, { useState, useRef, useEffect } from 'react';
import { 
  User,
  Bell,
  Camera,
  Mail,
  Phone,
  MapPin,
  Shield,
  ChevronRight,
  Check,
  Palette
} from 'lucide-react';

const StudentSettings = () => {
  const [profileData, setProfileData] = useState({
    firstName: 'Gerald Andrei',
    lastName: 'Lat',
    email: 'gerald.lat@email.com',
    phone: '+63 912 345 6789',
    address: 'Makati City, Philippines'
  });

const fileInputRef = useRef(null);
const [avatarPreview, setAvatarPreview] = useState(null);
const [selectedAvatarFile, setSelectedAvatarFile] = useState(null);

// load saved avatar (data URL) on mount
useEffect(() => {
  const saved = localStorage.getItem('student-avatar');
  if (saved) setAvatarPreview(saved);
}, []);

// open file picker
const handleAvatarButton = () => fileInputRef.current?.click();

// read file as data URL and set preview
const handleAvatarChange = (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file.');
    return;
  }
  const reader = new FileReader();
  reader.onload = () => {
    setAvatarPreview(reader.result);
    setSelectedAvatarFile(file);
  };
  reader.readAsDataURL(file);
};

  const [notifications, setNotifications] = useState({
    emailNotifications: true,
    pushNotifications: true,
    courseUpdates: true,
    taskReminders: true,
    newMaterials: false,
    gradeUpdates: true
  });

  const [showSaveToast, setShowSaveToast] = useState(false);

  const handleNotificationToggle = (key) => {
    setNotifications(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  const handleSaveChanges = () => {
    setShowSaveToast(true);
    setTimeout(() => setShowSaveToast(false), 3000);
  };

  const NotificationToggle = ({ label, description, checked, onChange }) => (
    <div className="flex items-center justify-between py-4 border-b border-gray-100 last:border-0">
      <div>
        <p className="font-medium text-gray-900">{label}</p>
        {description && <p className="text-sm text-gray-500">{description}</p>}
      </div>
      <button
        onClick={onChange}
        className={`relative w-12 h-6 rounded-full transition-colors ${
          checked ? 'bg-green-500' : 'bg-gray-300'
        }`}
      >
        <span 
          className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${
            checked ? 'left-7' : 'left-1'
          }`}
        />
      </button>
    </div>
  );

  return (
    <div className="p-6 space-y-6">
      {/* Save Toast */}
      {showSaveToast && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-green-500 text-white rounded-xl shadow-2xl px-6 py-3 flex items-center gap-3 animate-slide-down">
          <Check className="w-5 h-5" />
          <span className="font-medium">Changes saved successfully!</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Section */}
        <div className="lg:col-span-2 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-6">
              <User className="w-5 h-5 text-[#0D4291]" />
              <h2 className="font-bold text-gray-900 uppercase text-sm">Profile Information</h2>
            </div>

            {/* Avatar */}
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-20 h-20 bg-gradient-to-br from-[#0D4291] to-[#0B005C] rounded-full flex items-center justify-center text-white text-2xl font-bold">
                  GL
                </div>
                <button className="absolute bottom-0 right-0 p-1.5 bg-orange-500 rounded-full text-white hover:bg-orange-600 transition-colors">
                  <Camera className="w-3.5 h-3.5" />
                </button>
              </div>
              <div>
                <h3 className="font-bold text-gray-900 text-lg">{profileData.firstName} {profileData.lastName}</h3>
                <p className="text-sm text-gray-500">Student</p>
              </div>
            </div>

            {/* Form Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">First Name</label>
                <input 
                  type="text"
                  value={profileData.firstName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, firstName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D4291] transition-all bg-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Last Name</label>
                <input 
                  type="text"
                  value={profileData.lastName}
                  onChange={(e) => setProfileData(prev => ({ ...prev, lastName: e.target.value }))}
                  className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D4291] transition-all bg-white"
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D4291] transition-all bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Phone Number</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D4291] transition-all bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input 
                    type="text"
                    value={profileData.address}
                    onChange={(e) => setProfileData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#0D4291] transition-all bg-white"
                  />
                </div>
              </div>
            </div>

            {/* Save Button */}
            <div className="flex justify-end mt-6">
              <button 
                onClick={handleSaveChanges}
                className="px-6 py-2.5 bg-green-500 text-white rounded-xl font-medium hover:bg-green-600 transition-colors"
              >
                Save Changes
              </button>
            </div>
          </div>

          {/* Notifications Card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Bell className="w-5 h-5 text-[#0D4291]" />
              <h2 className="font-bold text-gray-900 uppercase text-sm">Notification Preferences</h2>
            </div>

            <NotificationToggle 
              label="Email Notifications"
              description="Receive notifications via email"
              checked={notifications.emailNotifications}
              onChange={() => handleNotificationToggle('emailNotifications')}
            />
            <NotificationToggle 
              label="Push Notifications"
              description="Receive browser push notifications"
              checked={notifications.pushNotifications}
              onChange={() => handleNotificationToggle('pushNotifications')}
            />
            <NotificationToggle 
              label="Course Updates"
              description="Get notified about course announcements"
              checked={notifications.courseUpdates}
              onChange={() => handleNotificationToggle('courseUpdates')}
            />
            <NotificationToggle 
              label="Task Reminders"
              description="Receive reminders for upcoming tasks"
              checked={notifications.taskReminders}
              onChange={() => handleNotificationToggle('taskReminders')}
            />
            <NotificationToggle 
              label="New Materials"
              description="Get notified when new materials are uploaded"
              checked={notifications.newMaterials}
              onChange={() => handleNotificationToggle('newMaterials')}
            />
            <NotificationToggle 
              label="Grade Updates"
              description="Receive notifications about grade changes"
              checked={notifications.gradeUpdates}
              onChange={() => handleNotificationToggle('gradeUpdates')}
            />
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Quick Links */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
            
            <div className="space-y-2">
              <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50:bg-gray-700 rounded-xl transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-blue-100 rounded-lg">
                    <Shield className="w-4 h-4 text-blue-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Change Password</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
              
              <button className="w-full flex items-center justify-between p-3 hover:bg-gray-50:bg-gray-700 rounded-xl transition-colors text-left">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <User className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-gray-700">Privacy Settings</span>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </button>
            </div>
          </div>

          {/* Account Info */}
          <div className="bg-gradient-to-br from-[#0D4291] to-[#0B005C] rounded-2xl p-5 text-white">
            <h3 className="font-bold mb-4">Account Status</h3>
            
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="text-white/70">Status</span>
                <span className="px-2 py-0.5 bg-green-500 rounded-full text-xs font-bold">Active</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Member Since</span>
                <span className="font-medium">Jan 2024</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-white/70">Last Login</span>
                <span className="font-medium">Today</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentSettings;
