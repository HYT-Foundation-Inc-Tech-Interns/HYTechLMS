export const getNotificationDestination = (notification, role = 'student') => {
  const basePath = role === 'admin' ? '/admin' : role === 'trainer' ? '/trainer' : '/student';
  const metadata = notification?.metadata || {};

  if (
    typeof metadata.link === 'string'
    && metadata.link.startsWith(`${basePath}/`)
    && !metadata.link.startsWith('//')
  ) {
    return metadata.link;
  }

  switch (notification?.type) {
    case 'id_request':
    case 'id_request_approved':
    case 'id_request_rejected':
    case 'id_request_completed':
      return role === 'admin' ? '/admin/id-requests' : `${basePath}/request-id`;
    case 'incident_filed':
      return role === 'student'
        ? '/student/incident-form'
        : `${basePath}/incident-forms`;
    case 'join_request':
    case 'student_waiting':
    case 'notify_trainer':
    case 'join_class':
      return role === 'trainer' && (metadata.classId || metadata.className)
        ? `${basePath}/${encodeURIComponent(metadata.classId || metadata.className)}?tab=students`
        : basePath;
    case 'join_approved':
      return basePath;
    case 'announcement_posted':
    case 'assessment_published':
    case 'submission_published':
      return role === 'student' && metadata.classId
        ? `/student/${encodeURIComponent(metadata.classId)}`
        : `${basePath}/notifications`;
    default:
      return `${basePath}/notifications`;
  }
};
