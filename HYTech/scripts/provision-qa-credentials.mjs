import { randomBytes } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { applicationDefault, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const projectId = 'hytech-lms-staging';
const outputPath = resolve('.env.e2e.local');
const accounts = [
  ['ADMIN', 'qa.admin@your-test-domain.com', false],
  ['TRAINER', 'qa.trainer@your-test-domain.com', false],
  ['STUDENT', 'qa.student.enrolled@your-test-domain.com', false],
  ['UNENROLLED_STUDENT', 'qa.student.unenrolled@your-test-domain.com', false],
  ['PENDING_STUDENT', 'qa.student.pending@your-test-domain.com', false],
  ['DISABLED_STUDENT', 'qa.student.disabled@your-test-domain.com', true],
];

if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
  throw new Error('GOOGLE_APPLICATION_CREDENTIALS is required.');
}
if ((process.env.GOOGLE_CLOUD_PROJECT || projectId) !== projectId) {
  throw new Error(`Refusing to provision credentials outside ${projectId}.`);
}

const existing = {};
if (existsSync(outputPath)) {
  for (const line of readFileSync(outputPath, 'utf8').split(/\r?\n/)) {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) existing[match[1]] = match[2];
  }
}

const app = initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth(app);
const output = {
  E2E_BASE_URL: 'http://127.0.0.1:4173',
  E2E_ALLOW_LOCAL: 'true',
  E2E_REQUIRE_AUTH: 'true',
};

for (const [key, email, disabled] of accounts) {
  const emailKey = `E2E_${key}_EMAIL`;
  const passwordKey = `E2E_${key}_PASSWORD`;
  const password = existing[passwordKey] || randomBytes(24).toString('base64url');
  const user = await auth.getUserByEmail(email);
  await auth.updateUser(user.uid, {
    password,
    emailVerified: true,
    disabled,
  });
  output[emailKey] = email;
  output[passwordKey] = password;
}

writeFileSync(
  outputPath,
  `${Object.entries(output).map(([key, value]) => `${key}=${value}`).join('\n')}\n`,
  { encoding: 'utf8', mode: 0o600 }
);
await app.delete();
console.log(`Provisioned ${accounts.length} staging QA credentials.`);
console.log(`Saved secrets to ignored local file: ${outputPath}`);
