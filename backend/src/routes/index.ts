import { Router } from 'express';
import { forgotPasswordHandler, loginHandler, resetPasswordHandler, sendTestEmailHandler } from '../controllers/auth.controller.js';
import { checkInHandler, checkOutHandler, termReportHandler,undoCheckInHandler } from '../controllers/attendance.controller.js';
import { listStudentsHandler } from '../controllers/student.controller.js';
import { listGroupsHandler } from '../controllers/group.controller.js';
import { listSchoolYearsHandler } from '../controllers/schoolYear.controller.js';
import { dashboardSummaryHandler } from '../controllers/dashboard.controller.js';
import { listAuditLogsHandler } from '../controllers/audit.controller.js';
import {
  createEventHandler,
  deleteEventHandler,
  eventAttendanceHandler,
  getEventReportHandler,
  listEventsHandler,
  upsertEventReportHandler,
  updateEventHandler
} from '../controllers/event.controller.js';
import {
  assignTeacherGroupHandler,
  createAcademicYearHandler,
  createGuardianHandler,
  createStudentHandler,
  updateStudentHandler,
  archiveStudentEnrollmentHandler,
  deleteStudentHandler,
  createTeacherHandler,
  listAcademicYearsHandler,
  listUsersHandler,
  rolloverAcademicYearHandler,
  listTeachersHandler,
  createUserHandler,
  deleteUserHandler,
  updateEnrollmentPaymentHandler,
  updateUserHandler
} from '../controllers/admin.controller.js';
import { assignGroupSchoolYearHandler } from '../controllers/groupSchoolYear.controller.js';
import { requireAuth, requireRole } from '../middleware/auth.js';

const router = Router();

router.post('/auth/login', loginHandler);
router.post('/auth/forgot-password', forgotPasswordHandler);
router.post('/auth/reset-password', resetPasswordHandler);

// Route to send a test email
router.post('/auth/send-test-email', sendTestEmailHandler);

router.get('/students', requireAuth, requireRole('admin', 'teacher'), listStudentsHandler);
router.get('/groups', requireAuth, requireRole('admin', 'teacher'), listGroupsHandler);
router.get('/school-years', requireAuth, requireRole('admin', 'teacher'), listSchoolYearsHandler);
router.get('/dashboard/summary', requireAuth, requireRole('admin', 'teacher'), dashboardSummaryHandler);
router.get('/events', requireAuth, requireRole('admin', 'teacher'), listEventsHandler);
router.get('/events/:eventId/report', requireAuth, requireRole('admin', 'teacher'), getEventReportHandler);
router.put('/events/:eventId/report', requireAuth, requireRole('admin', 'teacher'), upsertEventReportHandler);

router.post('/admin/students', requireAuth, requireRole('admin'), createStudentHandler);
router.patch('/admin/students/:studentId', requireAuth, requireRole('admin'), updateStudentHandler);
router.patch('/admin/students/enrollments/:enrollmentId/archive', requireAuth, requireRole('admin'), archiveStudentEnrollmentHandler);
router.delete('/admin/students/:studentId', requireAuth, requireRole('admin'), deleteStudentHandler);
router.post('/admin/guardians', requireAuth, requireRole('admin'), createGuardianHandler);
router.get('/admin/teachers', requireAuth, requireRole('admin'), listTeachersHandler);
router.post('/admin/teachers', requireAuth, requireRole('admin'), createTeacherHandler);
router.post('/admin/teacher-groups', requireAuth, requireRole('admin'), assignTeacherGroupHandler);
router.post('/admin/group-school-years', requireAuth, requireRole('admin'), assignGroupSchoolYearHandler);
router.get('/admin/academic-years', requireAuth, requireRole('admin'), listAcademicYearsHandler);
router.get('/admin/audit-logs', requireAuth, requireRole('admin'), listAuditLogsHandler);
router.post('/admin/academic-years', requireAuth, requireRole('admin'), createAcademicYearHandler);
router.post('/admin/academic-years/rollover', requireAuth, requireRole('admin'), rolloverAcademicYearHandler);
router.patch('/admin/enrollments/:enrollmentId/payment', requireAuth, requireRole('admin'), updateEnrollmentPaymentHandler);
router.get('/admin/users', requireAuth, requireRole('admin'), listUsersHandler);
router.post('/admin/users', requireAuth, requireRole('admin'), createUserHandler);
router.patch('/admin/users/:userId', requireAuth, requireRole('admin'), updateUserHandler);
router.delete('/admin/users/:userId', requireAuth, requireRole('admin'), deleteUserHandler);
router.get('/admin/events', requireAuth, requireRole('admin'), listEventsHandler);
router.post('/admin/events', requireAuth, requireRole('admin'), createEventHandler);
router.patch('/admin/events/:eventId', requireAuth, requireRole('admin'), updateEventHandler);
router.delete('/admin/events/:eventId', requireAuth, requireRole('admin'), deleteEventHandler);
router.get('/admin/events/:eventId/attendance', requireAuth, requireRole('admin'), eventAttendanceHandler);

router.post('/attendance/checkin', requireAuth, requireRole('admin', 'teacher'), checkInHandler);
router.post('/attendance/checkout', requireAuth, requireRole('admin', 'teacher'), checkOutHandler);
router.post('/attendance/undo-checkin', requireAuth, requireRole('admin', 'teacher'), undoCheckInHandler);

router.get('/reports/term', requireAuth, requireRole('admin'), termReportHandler);

router.get('/health', (_req, res) => res.json({ ok: true }));

export default router;
