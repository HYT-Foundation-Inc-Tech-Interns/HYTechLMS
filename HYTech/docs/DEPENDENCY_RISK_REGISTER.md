# Dependency risk register

## React Router RSC advisory

- Package: `react-router-dom` / `react-router` 7.18.2
- Advisory: GHSA-qwww-vcr4-c8h2
- npm severity: High
- Review result: the HYTech LMS is a Vite client-rendered SPA and does not enable
  React Server Components, server actions, or React Router framework/server mode.
  The affected RSC action-processing path is not present in the deployed runtime.
- Compensating controls: Firebase Hosting serves static assets; no application
  Node/React server accepts action requests; CSP is enforced; dependency auditing
  remains enabled.
- Disposition: temporarily accepted as non-applicable while staying on the newer
  router release that fixes the applicable redirect/XSS advisories reported for
  7.11.0 and earlier.
- Owner and expiry: assign an engineering owner and review on every router release
  or within 30 days, whichever occurs first.

No Critical, Moderate, or Low npm advisories remain in the current root audit.
The Functions production dependency audit is clean at the time of this review.
