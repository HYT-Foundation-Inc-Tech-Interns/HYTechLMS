import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Scan the whole repository, not the npm working directory. Documentation and
// workflows live outside HYTech/, so a cwd-relative walk never sees them.
const selfPath = fileURLToPath(import.meta.url);
const root = path.resolve(path.dirname(selfPath), '..', '..');
const ignored = new Set([
  '.git', 'node_modules', 'dist', '.firebase', 'playwright-report', 'test-results',
]);
const extensions = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.json', '.md', '.yml', '.yaml', '.rules',
  '.html', '.css', '.txt', '.example',
]);
const findings = [];
const patterns = [
  { name: 'private key', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
  // The demo-account array removed in f2f777d published eight pairs across two
  // domains: {admin,trainer,supervisor,student} x {123, 1234}.
  { name: 'legacy published password', regex: /\b(?:admin|trainer|supervisor|student)123[4]?\b/i },
  { name: 'service-account private key', regex: /"private_key"\s*:\s*"-----BEGIN/i },
  { name: 'App Check debug token', regex: /VITE_APPCHECK_DEBUG_TOKEN\s*=\s*[^\s$<{][^\s]*/i },
];

// Security documentation has to quote the credentials it reports on, so the
// risk register and the audit reports trip the very pattern that exists to
// catch the incident they describe. Exempt those files from that ONE pattern
// rather than skipping them wholesale: a real private key or service-account
// blob pasted into the same document is still caught. Both path separators are
// matched so this behaves the same on Windows and in CI.
const documentedIncidents = [
  { file: /^HYTech[\\/]docs[\\/]TURNOVER_RISK_REGISTER\.md$/, pattern: 'legacy published password' },
  { file: /^HYTech_LMS_Comprehensive_Audit_Report_\d{4}-\d{2}-\d{2}\.md$/, pattern: 'legacy published password' },
];

const isDocumentedIncident = (relative, patternName) => documentedIncidents.some(
  (entry) => entry.pattern === patternName && entry.file.test(relative)
);

const walk = (directory) => {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const fullPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }
    const extension = entry.name.startsWith('.env') ? '.example' : path.extname(entry.name);
    if (!extensions.has(extension)) continue;
    const relative = path.relative(root, fullPath);
    if (fullPath === selfPath) continue;
    const text = fs.readFileSync(fullPath, 'utf8');
    for (const pattern of patterns) {
      if (!pattern.regex.test(text)) continue;
      if (isDocumentedIncident(relative, pattern.name)) continue;
      findings.push(`${relative}: ${pattern.name}`);
    }
  }
};

walk(root);
if (findings.length) {
  console.error(`Potential committed secrets found:\n${findings.join('\n')}`);
  process.exit(1);
}
console.log('No blocked secret patterns found.');
