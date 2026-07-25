const required = [
  'E2E_ADMIN_EMAIL',
  'E2E_ADMIN_PASSWORD',
  'E2E_TRAINER_EMAIL',
  'E2E_TRAINER_PASSWORD',
  'E2E_STUDENT_EMAIL',
  'E2E_STUDENT_PASSWORD',
];

const missing = required.filter((name) => !process.env[name]?.trim());
if (missing.length) {
  console.error(`Full QA is blocked. Missing required secrets:\n- ${missing.join('\n- ')}`);
  process.exit(1);
}

const baseURL = new URL(process.env.E2E_BASE_URL || 'https://hytech-lms-staging.web.app');
const allowed = baseURL.hostname === 'hytech-lms-staging.web.app'
  || baseURL.hostname === '127.0.0.1'
  || baseURL.hostname === 'localhost';

if (!allowed) {
  console.error(`Full QA refuses to mutate or authenticate against ${baseURL.hostname}.`);
  process.exit(1);
}

console.log(`QA environment is complete and target is allowed: ${baseURL.origin}`);
