import { describe, expect, it } from 'vitest';
import {
  isDocumentedIncident,
  patterns,
  scanRepository,
  scanText,
} from '../../scripts/check-no-secrets.mjs';

// The scanner walks .js files, so it scans this suite too. Every fixture below
// is assembled at runtime: writing the secret as a source literal would make
// this file a genuine finding and fail the clean-tree assertion.
const pemHeader = (label = '') => `-----${'BEGIN'} ${label}PRIVATE KEY-----`;
const leakedPassword = `Admin${'1234'}`;
const registerProse = `credential pairs across two domains (\`admin@hytech.com/${'admin'}${'1234'}\` and`;

describe('secret scanner', () => {
  // The gate that guards the release pipeline: QA runs this before unit tests
  // with no continue-on-error, and deploy.yml only fires when QA is green.
  it('exits clean on the committed tree', () => {
    expect(scanRepository()).toEqual([]);
  });

  it.each([
    ['private key', () => `${pemHeader('RSA ')}\nabc\n`],
    ['legacy published password', () => `const pw = "${leakedPassword}";`],
    ['service-account private key', () => `{"private_key": "${pemHeader()}"}`],
    ['App Check debug token', () => `VITE_APPCHECK_DEBUG_TOKEN=${'9f3c1a2b-real-token'}`],
    // A service-account blob trips the bare `private key` pattern too, so assert
    // the expected finding is present rather than that it is the only one.
  ])('still catches %s in ordinary source', (name, build) => {
    expect(scanText('HYTech/src/leak.js', build())).toContain(`HYTech/src/leak.js: ${name}`);
  });

  it('allows security docs to quote the leaked password they report on', () => {
    expect(scanText('HYTech/docs/TURNOVER_RISK_REGISTER.md', registerProse)).toEqual([]);
    expect(scanText('HYTech_LMS_Comprehensive_Audit_Report_2026-07-30.md', registerProse)).toEqual([]);
  });

  it('matches allowlisted paths under either separator', () => {
    for (const separator of ['/', '\\']) {
      const docPath = ['HYTech', 'docs', 'TURNOVER_RISK_REGISTER.md'].join(separator);
      expect(isDocumentedIncident(docPath, 'legacy published password')).toBe(true);
    }
  });

  it('exempts only the one pattern, never the whole file', () => {
    const register = 'HYTech/docs/TURNOVER_RISK_REGISTER.md';
    expect(scanText(register, pemHeader())).toEqual([`${register}: private key`]);
    for (const { name } of patterns) {
      if (name === 'legacy published password') continue;
      expect(isDocumentedIncident(register, name)).toBe(false);
    }
  });

  it('does not exempt the password pattern anywhere else', () => {
    expect(isDocumentedIncident('README.md', 'legacy published password')).toBe(false);
    expect(isDocumentedIncident('HYTech/docs/OTHER.md', 'legacy published password')).toBe(false);
  });
});
