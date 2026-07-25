import { applicationDefault, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';

const STAGING_PROJECT_ID = 'hytech-lms-staging';
const QA_EMAIL_SUFFIX = '@your-test-domain.com';

const identities = [
  {
    key: 'admin',
    email: `qa.admin${QA_EMAIL_SUFFIX}`,
    displayName: 'QA Admin',
    firstName: 'QA',
    lastName: 'Admin',
    role: 'admin',
    status: 'Active',
    disabled: false,
  },
  {
    key: 'trainer',
    email: `qa.trainer${QA_EMAIL_SUFFIX}`,
    displayName: 'QA Trainer',
    firstName: 'QA',
    lastName: 'Trainer',
    role: 'trainer',
    status: 'Active',
    disabled: false,
  },
  {
    key: 'enrolled',
    email: `qa.student.enrolled${QA_EMAIL_SUFFIX}`,
    displayName: 'QA Enrolled Trainee',
    firstName: 'QA',
    lastName: 'Enrolled Trainee',
    role: 'student',
    status: 'Active',
    disabled: false,
  },
  {
    key: 'unenrolled',
    email: `qa.student.unenrolled${QA_EMAIL_SUFFIX}`,
    displayName: 'QA Unenrolled Trainee',
    firstName: 'QA',
    lastName: 'Unenrolled Trainee',
    role: 'student',
    status: 'Active',
    disabled: false,
  },
  {
    key: 'pending',
    email: `qa.student.pending${QA_EMAIL_SUFFIX}`,
    displayName: 'QA Pending Trainee',
    firstName: 'QA',
    lastName: 'Pending Trainee',
    role: 'student',
    status: 'Active',
    disabled: false,
  },
  {
    key: 'disabled',
    email: `qa.student.disabled${QA_EMAIL_SUFFIX}`,
    displayName: 'QA Disabled Trainee',
    firstName: 'QA',
    lastName: 'Disabled Trainee',
    role: 'student',
    status: 'Inactive',
    disabled: true,
  },
];

function assertSafeEnvironment() {
  const credentialPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  if (!credentialPath) {
    throw new Error(
      'GOOGLE_APPLICATION_CREDENTIALS is required. Point it to the staging QA service-account JSON.'
    );
  }

  const configuredProject =
    process.env.GOOGLE_CLOUD_PROJECT
    || process.env.GCLOUD_PROJECT
    || STAGING_PROJECT_ID;

  if (configuredProject !== STAGING_PROJECT_ID) {
    throw new Error(
      `Refusing to seed project "${configuredProject}". Only "${STAGING_PROJECT_ID}" is allowed.`
    );
  }

  for (const identity of identities) {
    if (!identity.email.startsWith('qa.') || !identity.email.endsWith(QA_EMAIL_SUFFIX)) {
      throw new Error(`Unsafe QA identity: ${identity.email}`);
    }
  }
}

async function getOrCreateAuthUser(auth, identity) {
  try {
    return await auth.getUserByEmail(identity.email);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;

    const password = process.env.QA_BOOTSTRAP_PASSWORD;
    if (!password || password.length < 12) {
      throw new Error(
        `${identity.email} is missing. Set a temporary QA_BOOTSTRAP_PASSWORD of at least 12 characters `
        + 'to allow creation, then rerun the command.'
      );
    }

    return auth.createUser({
      email: identity.email,
      password,
      displayName: identity.displayName,
      emailVerified: true,
      disabled: identity.disabled,
    });
  }
}

async function seedIdentity(auth, db, identity) {
  const existingAuthUser = await getOrCreateAuthUser(auth, identity);
  const authUser = await auth.updateUser(existingAuthUser.uid, {
    displayName: identity.displayName,
    emailVerified: true,
    disabled: identity.disabled,
  });

  const profileRef = db.collection('users').doc(authUser.uid);
  const existingProfile = await profileRef.get();
  const now = FieldValue.serverTimestamp();

  await profileRef.set(
    {
      uid: authUser.uid,
      email: identity.email,
      name: identity.displayName,
      displayName: identity.displayName,
      firstName: identity.firstName,
      middleName: '',
      lastName: identity.lastName,
      nameExtension: '',
      role: identity.role,
      status: identity.status,
      profileComplete: true,
      emailVerified: true,
      qaManaged: true,
      qaPurpose: 'automated-e2e',
      createdBy: 'qa-seed',
      updatedAt: now,
      ...(existingProfile.exists ? {} : { createdAt: now }),
    },
    { merge: true }
  );

  return {
    key: identity.key,
    uid: authUser.uid,
    role: identity.role,
    status: identity.status,
    authState: identity.disabled ? 'disabled' : 'enabled',
  };
}

async function main() {
  assertSafeEnvironment();

  const app = getApps()[0] || initializeApp({
    credential: applicationDefault(),
    projectId: STAGING_PROJECT_ID,
  });
  const auth = getAuth(app);
  const db = getFirestore(app);

  const results = [];
  for (const identity of identities) {
    results.push(await seedIdentity(auth, db, identity));
  }

  console.table(results);
  console.log(`Seeded ${results.length} QA identities in ${STAGING_PROJECT_ID}.`);
}

main().catch((error) => {
  console.error(`QA identity seed failed: ${error.message}`);
  process.exitCode = 1;
});
