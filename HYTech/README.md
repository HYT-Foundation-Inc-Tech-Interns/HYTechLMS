# HYTech Learning Management System (LMS)

A comprehensive, production-ready Learning Management System built with React and Firebase for HYT Global Institute. The platform supports multi-role authentication (Admin, Trainer, Student, Supervisor) with full course management, assessment handling, real-time notifications, and collaborative communication features.

## 📋 Table of Contents

- [Features](#features)
- [Technology Stack](#technology-stack)
- [Project Structure](#project-structure)
- [Installation & Setup](#installation--setup)
- [Quick Start](#quick-start)
- [Authentication](#authentication)
- [Key Features Guide](#key-features-guide)
- [Component Architecture](#component-architecture)
- [Database Schema](#database-schema)
- [API Integration](#api-integration)
- [Styling & Design](#styling--design)
- [Performance Optimizations](#performance-optimizations)
- [Troubleshooting](#troubleshooting)
- [Contributing](#contributing)

---

## ✨ Features

### 🔐 Multi-Role Access Control
- **Admin**: Full system management, user administration, sector creation, system monitoring
- **Trainer**: Class management, content creation, assignment/assessment posting, student management
- **Student**: Course enrollment, assignment submission, quiz participation, progress tracking

New sign-ups are always Students. Trainer/Admin accounts are created by an Admin in User Management.

### 📚 Course & Content Management
- Course creation and enrollment
- Module organization with sequential progression
- Interactive lesson topics with descriptions
- Learning materials library with file uploads
- Real-time content updates and synchronization
- Material versioning and archival

### ✏️ Assignments & Assessments
- Form builder for creating custom assessments
- Multiple question types support
- Point-based grading system
- Automatic score calculation
- Quiz attempt history tracking
- Pass/fail status determination
- Submission deadline management
- Retry capabilities with score tracking

### 📢 Communication & Collaboration
- Real-time announcements system
- Comment threads on announcements
- Inline editing of announcements
- File attachments with download support
- User mentions and notifications
- Inline comment deletion (author only)
- Timestamp tracking (absolute and relative)

### 📊 Analytics & Reporting
- Student performance dashboards
- Quiz completion rates
- Average score calculations
- Best score tracking
- Activity feed with real-time updates
- Progress visualization
- Detailed attempt history

### 🎨 User Experience
- Responsive design (mobile, tablet, desktop)
- Intuitive navigation with tabbed interfaces
- Real-time loading states and spinners
- Toast notifications for user feedback
- Dark/Light mode support (foundation)
- Accessibility-first design
- Smooth animations and transitions

### 🔔 Notifications
- Real-time assignment/assessment notifications
- Announcement updates
- Comment notifications
- System alerts
- User preference controls

---

## 🛠 Technology Stack

### Frontend
- **React 18+** - UI framework
- **React Router v6** - Client-side routing
- **Tailwind CSS** - Utility-first styling
- **Lucide React** - Icon library
- **Vite** - Build tool and dev server

### Backend & Database
- **Firebase/Firestore** - Real-time database
- **Firebase Auth** - Authentication & authorization
- **Firebase Storage** - File storage
- **Firebase Rules** - Security rules

### Development Tools
- **PostCSS** - CSS processing
- **ESLint** - Code linting
- **Git** - Version control

---

## 📁 Project Structure

```
HYTech/
├── public/
│   ├── 404.html
│   └── index.html
├── src/
│   ├── components/
│   │   ├── auth/                 # Authentication routes
│   │   │   ├── AuthenticatedRoute.jsx
│   │   │   ├── PublicOnlyRoute.jsx
│   │   │   ├── RoleProtectedRoute.jsx
│   │   │   ├── SignIn.jsx
│   │   │   └── SignUp.jsx
│   │   ├── dashboard/            # Dashboard components
│   │   │   └── Dashboard.jsx
│   │   ├── layout/               # Layout components
│   │   │   ├── AdminDashboardLayout.jsx
│   │   │   ├── DashboardLayout.jsx
│   │   │   ├── SupervisorDashboardLayout.jsx
│   │   │   ├── Navbar.jsx
│   │   │   ├── AdminNavbar.jsx
│   │   │   ├── SupervisorNavbar.jsx
│   │   │   ├── Sidebar.jsx
│   │   │   ├── AdminSidebar.jsx
│   │   │   └── SupervisorSidebar.jsx
│   │   ├── student/              # Student-specific components
│   │   │   ├── StudentHome.jsx
│   │   │   ├── StudentCourse.jsx
│   │   │   ├── StudentDashboardLayout.jsx
│   │   │   ├── StudentNavbar.jsx
│   │   │   ├── StudentSidebar.jsx
│   │   │   ├── StudentCalendar.jsx
│   │   │   ├── StudentTasks.jsx
│   │   │   ├── StudentCertificates.jsx
│   │   │   ├── StudentSettings.jsx
│   │   │   └── StudentArchivedCourses.jsx
│   │   ├── trainer/              # Trainer-specific components
│   │   │   ├── TrainerHome.jsx
│   │   │   ├── ClassDetail.jsx
│   │   │   ├── TrainerSectors.jsx
│   │   │   ├── SectorDetail.jsx
│   │   │   ├── Course.jsx
│   │   │   ├── ArchivedCourses.jsx
│   │   │   ├── Tasks.jsx
│   │   │   └── TrainerSettings.jsx
│   │   ├── supervisor/           # Supervisor-specific components
│   │   │   ├── SupervisorHome.jsx
│   │   │   ├── SupervisorStudents.jsx
│   │   │   ├── SupervisorTrainers.jsx
│   │   │   ├── SupervisorCourses.jsx
│   │   │   ├── SupervisorReports.jsx
│   │   │   └── SupervisorSettings.jsx
│   │   ├── users/                # User management
│   │   │   └── UserManagement.jsx
│   │   ├── logs/                 # System logs
│   │   │   └── SystemLogs.jsx
│   │   ├── sectors/              # Sector management
│   │   │   └── Sectors.jsx
│   │   ├── settings/             # Settings
│   │   │   └── Settings.jsx
│   │   ├── shared/               # Shared components
│   │   │   ├── FlappyBirdGame.jsx
│   │   │   ├── NotificationDropdown.jsx
│   │   │   └── NotificationsPage.jsx
│   │   ├── landing/              # Landing page
│   │   │   └── LandingPage.jsx
│   │   └── hytbot/               # AI Assistant
│   │       └── HytBot.jsx
│   ├── context/
│   │   ├── AuthContext.jsx       # Authentication state
│   │   ├── ToastContext.jsx      # Toast notifications
│   │   ├── useProfileAvatar.js   # Avatar management hook
│   │   ├── useRoleNotifications.js # Notifications hook
│   │   └── useUserSettings.js    # User settings hook
│   ├── utils/
│   │   ├── authRole.js           # Role-based access utilities
│   │   ├── avatarStorage.js      # Avatar handling
│   │   └── firestoreService.js   # Firebase/Firestore operations
│   ├── App.jsx                   # Main app component
│   ├── firebase.js               # Firebase config
│   ├── index.js                  # App entry point
│   ├── main.jsx                  # Vite entry point
│   └── index.css                 # Global styles
├── build/                        # Production build output
├── firebase.json                 # Firebase config
├── firestore.rules               # Firestore security rules
├── firestore.indexes.json        # Firestore indexes
├── package.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.js
└── README.md
```

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16+ and npm/yarn
- Firebase project setup
- Git for version control

### Step 1: Clone & Install Dependencies

```bash
# Clone the repository
git clone <repository-url>
cd HYTech

# Install dependencies
npm install
```

### Step 2: Configure Firebase

1. Create a Firebase project at [firebase.google.com](https://firebase.google.com)
2. Create a `.env.local` file in the project root:

```env
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_auth_domain
VITE_FIREBASE_PROJECT_ID=your_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_messaging_sender_id
VITE_FIREBASE_APP_ID=your_app_id
```

3. Update `src/firebase.js` with your Firebase configuration

### Step 3: Initialize Firestore

```bash
# Deploy Firestore rules and indexes
firebase deploy --only firestore:rules,firestore:indexes
```

### Step 4: Start Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:5174`

---

## ⚡ Quick Start

### Test Credentials

Use these credentials to test different roles (seeded in the dev Firebase project):

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@hyt.com | admin1234 |
| Trainer | trainer@hyt.com | trainer1234 |
| Student | student1@hyt.com | student1234 |
| Student | student2@hyt.com | student1234 |

A sample class **"Barista Class - Batch 1"** (class code `HYT101`) is seeded and owned by the test trainer. Students with no enrollment land in a waiting room where they can notify a trainer or join with a class code.

### First Steps

1. **Sign In**: Use test credentials above
2. **Navigate Dashboard**: Based on your role
3. **Create Content**: (Trainer/Admin) Create courses, assignments, assessments
4. **Enroll Students**: (Admin/Trainer) Add students to courses
5. **Submit Assignments**: (Student) Complete and submit assignments
6. **View Analytics**: Track progress and scores

---

## 🔐 Authentication

### Authentication Flow

1. **Sign Up**: New users register with email/password
2. **Email Verification**: Optional verification step
3. **Profile Setup**: Complete user profile
4. **Role Assignment**: Assign user role by admin
5. **Dashboard Access**: Role-based dashboard routing

### Protected Routes

- `/admin/*` - Admin only
- `/trainer/*` - Trainer only
- `/student/*` - Student only
- `/supervisor/*` - Supervisor only
- `/auth/*` - Public routes (Sign In, Sign Up)

### Session Management

- Firebase Auth handles sessions automatically
- Session persists across browser restarts
- Logout clears session and redirects to login

---

## 📖 Key Features Guide

### For Students

#### 1. **Course Dashboard**
- View enrolled courses
- Track progress per course
- Access course materials
- See assignments and deadlines

#### 2. **Assessments Tab**
```
- Total Assessments: Count of all available quizzes
- Completed: Number of finished assessments
- Pending: Assessments not yet started
- Average Score: Mean score across all assessments
- Take Quiz: Start or retake assessments
- View Scores: See attempt history
```

#### 3. **Materials Tab**
- Download course materials
- Access learning resources
- File type filtering
- Upload date tracking

#### 4. **Activity Feed**
- Real-time announcements
- Assignment updates
- Assessment releases
- Comment notifications

### For Trainers

#### 1. **Class Dashboard**
- Overview of all classes
- Student enrollment status
- Recent activity
- Performance metrics

#### 2. **Content Creation**
- Create modules and topics
- Upload learning materials
- Post announcements
- Create assignments and assessments

#### 3. **Assessment Form Builder**
- Add multiple question types
- Set point values
- Define correct answers
- Configure time limits
- Set passing criteria

#### 4. **Student Management**
- View enrolled students
- Remove students
- Monitor progress
- Track attempt history

### For Admins

#### 1. **User Management**
- Create/edit/delete users
- Assign roles
- Reset passwords
- Manage user profiles

#### 2. **Sector Management**
- Create educational sectors
- Organize courses by sector
- Manage sector-level settings

#### 3. **System Monitoring**
- View system logs
- Track user activity
- Monitor performance
- Generate reports

---

## 🏗 Component Architecture

### State Management

**Context API**
- `AuthContext`: User authentication and role data
- `ToastContext`: Global notifications
- Custom hooks for avatar, settings, notifications

### Data Flow

```
Firebase Firestore
    ↓
Firestore Service (utils)
    ↓
React Components (Context + State)
    ↓
UI Components (Tailwind + Lucide)
```

### Key Components

#### StudentCourse.jsx (Large Component)
```
- Tabs: Overview, Materials, Modules, Assessments, Activity
- Features:
  * Real-time announcements with comments
  * Quiz attempt tracking
  * Material downloads
  * Progress analytics
  * Activity feed
```

#### ClassDetail.jsx (Large Component - Trainer)
```
- Tabs: Overview, Modules, Assessments, Responses, Students
- Features:
  * Content management
  * Assessment form builder
  * Student response review
  * Google Meet integration
  * Real-time updates
```

---

## 🗄 Database Schema

### Collections

#### `users`
```javascript
{
  uid: string,
  email: string,
  displayName: string,
  role: 'admin' | 'trainer' | 'student' | 'supervisor',
  avatar: string (base64),
  enrolledCourses: string[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

#### `courses`
```javascript
{
  id: string,
  name: string,
  description: string,
  sector: string,
  trainer: string,
  students: string[],
  materials: Reference[],
  assignments: Reference[],
  assessments: Reference[],
  createdAt: timestamp,
  status: 'active' | 'archived'
}
```

#### `assessments`
```javascript
{
  id: string,
  title: string,
  description: string,
  courseId: string,
  questions: Question[],
  totalPoints: number,
  duration: number,
  passingScore: number,
  createdAt: timestamp,
  attempts: AttemptRecord[]
}
```

#### `announcements`
```javascript
{
  id: string,
  courseId: string,
  author: string,
  authorId: string,
  message: string,
  attachments: File[],
  comments: Comment[],
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 🔌 API Integration

### Firestore Operations

#### Assessment Management
```javascript
// Get assessments
const assessments = await getAssessments(courseId);

// Subscribe to real-time updates
subscribeToAssessments(courseId, (data) => {
  setAssessments(data);
});

// Submit quiz attempt
await submitQuizAttempt(courseId, quizId, {
  userId: user.uid,
  answers: answers,
  score: calculatedScore,
  passed: isPassed
});

// Check if student attempted quiz
const hasAttempted = await hasStudentAttempted(courseId, quizId, userId);
```

#### Comment Management
```javascript
// Add comment
await addCommentToAnnouncement(courseId, announcementId, {
  author: userName,
  authorId: userId,
  message: text
});

// Get comments
const comments = await getAnnouncementComments(courseId, announcementId);

// Subscribe to comments
subscribeToComments(courseId, announcementId, (comments) => {
  setComments(comments);
});
```

#### File Operations
```javascript
// Store announcement attachment
const fileUrl = await storeAnnouncementAttachment(
  courseId,
  announcementId,
  file
);

// Compress and store file
const compressedFile = await compressAndStoreFile(file, maxSize);
```

---

## 🎨 Styling & Design

### Tailwind CSS

**Key Classes Used**
- Layout: `flex`, `grid`, `gap-*`, `p-*`, `m-*`
- Colors: `bg-blue-*`, `text-gray-*`, `border-*`
- Typography: `text-sm`, `font-semibold`, `line-clamp-*`
- Responsive: `md:`, `lg:`, `xl:` prefixes
- States: `hover:`, `focus:`, `disabled:`, `group-*:`

### Custom Styling

- Global styles in `src/index.css`
- Tailwind configuration in `tailwind.config.js`
- PostCSS processing in `postcss.config.js`

### Icon Library

- **Lucide React** for consistent icons
- Over 300+ icons available
- Size variants: `w-3 h-3`, `w-4 h-4`, `w-5 h-5`, etc.

---

## ⚡ Performance Optimizations

### Code Splitting
- Route-based code splitting with React Router
- Lazy loading components where appropriate
- Dynamic imports for large components

### Real-Time Sync
- Firestore subscriptions for live updates
- Efficient query filtering
- Indexed fields for faster queries

### State Management
- Context API for global state
- Local state for component-specific data
- Memoization of expensive computations

### Bundle Optimization
- Tree-shaking of unused code
- Minification in production builds
- Asset compression and lazy loading

---

## 🐛 Troubleshooting

### Common Issues

#### 1. **Firebase Connection Error**
```
Error: Firebase is not initialized

Solution:
- Check VITE_FIREBASE_* environment variables
- Verify Firebase project exists
- Confirm .env.local file in root directory
```

#### 2. **Authorization Denied**
```
Error: Missing or insufficient permissions

Solution:
- Check Firestore security rules
- Verify user role in database
- Ensure user is authenticated
- Deploy updated firestore.rules
```

#### 3. **Quiz Scores Not Saving**
```
Error: Score submission fails

Solution:
- Verify submitQuizAttempt function
- Check Firestore assessments collection
- Ensure user has write permissions
- Check network connectivity
```

#### 4. **Comments Not Loading**
```
Error: Comments section empty

Solution:
- Verify subscribeToComments subscription
- Check announcement exists in database
- Verify collection structure
- Check user permissions
```

#### 5. **Vite Build Errors**
```
Error: Module not found

Solution:
npm install
npm run build
# Check for TypeScript errors
npm run lint
```

---

## 👥 Contributing

### Code Standards

1. **File Naming**: PascalCase for components, camelCase for utilities
2. **Component Structure**: Hooks → State → Effects → Render
3. **Imports**: Group imports (React, Libraries, Local)
4. **Comments**: Add comments for complex logic
5. **Error Handling**: Try-catch blocks for async operations

### Git Workflow

```bash
# Create feature branch
git checkout -b feature/feature-name

# Make changes and commit
git add .
git commit -m "feat: add feature description"

# Push and create PR
git push origin feature/feature-name
```

### Testing Checklist

- [ ] Test with all user roles
- [ ] Verify responsive design
- [ ] Check error handling
- [ ] Test real-time updates
- [ ] Validate form inputs
- [ ] Test file uploads
- [ ] Check performance metrics

---

## 🚀 Deployment

### Build for Production

```bash
npm run build
```

### Firebase Hosting Deployment

```bash
# Install Firebase CLI
npm install -g firebase-tools

# Login to Firebase
firebase login

# Deploy
firebase deploy
```

### Environment Setup for Production

```env
VITE_FIREBASE_API_KEY=prod_api_key
VITE_FIREBASE_AUTH_DOMAIN=prod_auth_domain
VITE_FIREBASE_PROJECT_ID=prod_project_id
# ... other production credentials
```

---

## 📞 Support & Contact

For issues or questions:
1. Check this README and troubleshooting section
2. Review Firebase documentation
3. Check component JSDoc comments
4. Contact development team

---

## 📝 Version History

### v1.0.0 (Current)
- Multi-role authentication system
- Course and content management
- Assessment form builder
- Real-time announcements with comments
- Student progress tracking
- Activity feeds
- File uploads and downloads
- Responsive design
- Real-time synchronization

---

## 📄 License

This project is proprietary to HYT Global Institute.
Unauthorized copying or distribution is prohibited.

---

## 🎓 About HYTech LMS

The HYTech Learning Management System is built with modern technologies to provide an intuitive, scalable, and feature-rich platform for educational institutions. It emphasizes user experience, real-time collaboration, and comprehensive learning analytics.

**Key Principles:**
- User-centric design
- Real-time data synchronization
- Security and privacy
- Scalability and performance
- Accessibility compliance

---

*Last Updated: April 22, 2026*
*Version: 1.0.0*
