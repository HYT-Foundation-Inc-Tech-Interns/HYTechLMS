/**
 * Render a Markdown document to a paginated A4 PDF.
 *
 * One-time setup (puts `marked` next to the existing Playwright install so both
 * resolve from the same place):
 *
 *   npm install --save-dev marked --prefix HYTech
 *
 * Usage, from the repository root:
 *
 *   node scripts/md-to-pdf.mjs HYTECH_LMS_DEVELOPER_TURNOVER_BRIEF.md \
 *        HYTECH_LMS_DEVELOPER_TURNOVER_BRIEF.pdf "HYTech LMS - Developer Turnover Brief"
 *
 * Uses `marked` for Markdown and Playwright's bundled Chromium for print, both
 * resolved from HYTech/node_modules first so the repo's pinned Playwright is
 * reused rather than downloading a second browser. Output is A4 with running
 * headers and "Page N of M" footers. No network access required.
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const [input, output, titleArg] = process.argv.slice(2);
if (!input || !output) {
  console.error('Usage: node md-to-pdf.mjs <input.md> <output.pdf> ["Title"]');
  process.exit(1);
}

const repoRoot = process.env.REPO_ROOT || process.cwd();
const candidates = [
  path.join(repoRoot, 'HYTech', 'node_modules'),
  path.join(repoRoot, 'node_modules'),
  path.join(import.meta.dirname, 'node_modules'),
];

async function load(name) {
  let mod;
  for (const dir of candidates) {
    try {
      const req = createRequire(pathToFileURL(path.join(dir, 'index.js')));
      mod = await import(pathToFileURL(req.resolve(name)).href);
      break;
    } catch { /* try next */ }
  }
  mod ??= await import(name);
  // CommonJS packages (playwright) expose their API on `default`.
  return { ...(mod.default ?? {}), ...mod };
}

const { marked } = await load('marked');
const { chromium } = await load('playwright');

const md = fs.readFileSync(input, 'utf8');
const title = titleArg || (md.match(/^#\s+(.+)$/m)?.[1] ?? path.basename(input));

marked.setOptions({ gfm: true, breaks: false });
const body = marked.parse(md);

const css = `
  @page { size: A4; margin: 18mm 16mm 20mm 16mm; }
  * { box-sizing: border-box; }
  html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  body {
    font: 10.5pt/1.55 "Segoe UI", "Helvetica Neue", Arial, sans-serif;
    color: #1a202c; margin: 0;
  }
  h1 {
    font-size: 22pt; line-height: 1.2; margin: 0 0 4mm;
    color: #1a365d; border-bottom: 2.5pt solid #2b6cb0; padding-bottom: 3mm;
  }
  h2 {
    font-size: 14pt; margin: 9mm 0 3mm; color: #1a365d;
    border-bottom: 0.6pt solid #cbd5e0; padding-bottom: 1.5mm;
    break-after: avoid; page-break-after: avoid;
  }
  h1 + h2, hr + h2 { margin-top: 4mm; }
  h3 { font-size: 11.5pt; margin: 6mm 0 2mm; color: #2a4365;
       break-after: avoid; page-break-after: avoid; }
  p, ul, ol { margin: 0 0 2.6mm; orphans: 3; widows: 3; }
  ul, ol { padding-left: 6mm; }
  li { margin-bottom: 1mm; }
  li > input[type=checkbox] { margin-right: 1.5mm; }
  strong { color: #1a202c; }
  a { color: #2b6cb0; text-decoration: none; }
  code {
    font: 9pt/1.4 "Cascadia Mono", Consolas, "Courier New", monospace;
    background: #f7fafc; border: 0.4pt solid #e2e8f0; border-radius: 2pt;
    padding: 0.3mm 1mm; color: #2d3748;
  }
  pre {
    background: #f7fafc; border: 0.5pt solid #e2e8f0; border-left: 2pt solid #4299e1;
    border-radius: 2pt; padding: 2.5mm 3mm; margin: 0 0 3mm;
    overflow: hidden; break-inside: avoid; page-break-inside: avoid;
  }
  pre code {
    background: none; border: 0; padding: 0; font-size: 8.3pt; line-height: 1.42;
    white-space: pre-wrap; word-break: break-word;
  }
  table {
    width: 100%; border-collapse: collapse; margin: 0 0 3.5mm; font-size: 9.2pt;
    break-inside: avoid; page-break-inside: avoid;
  }
  thead { background: #edf2f7; }
  th, td {
    border: 0.4pt solid #cbd5e0; padding: 1.4mm 2mm;
    text-align: left; vertical-align: top;
  }
  th { color: #1a365d; font-weight: 600; }
  tbody tr:nth-child(even) { background: #fafcfe; }
  blockquote {
    margin: 0 0 3mm; padding: 2mm 3mm; background: #fffaf0;
    border-left: 2.5pt solid #dd6b20; color: #4a3419;
    break-inside: avoid; page-break-inside: avoid;
  }
  blockquote p:last-child { margin-bottom: 0; }
  hr { border: 0; border-top: 0.5pt solid #e2e8f0; margin: 6mm 0; }
  em { color: #4a5568; }
`;

const html = `<!doctype html><html><head><meta charset="utf-8">
<title>${title.replace(/[<>&]/g, '')}</title><style>${css}</style>
</head><body>${body}</body></html>`;

const browser = await chromium.launch();
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
await page.pdf({
  path: output,
  format: 'A4',
  printBackground: true,
  displayHeaderFooter: true,
  headerTemplate: `<div style="font:7.5pt 'Segoe UI',Arial,sans-serif;color:#a0aec0;
    width:100%;padding:0 16mm;">
    <span style="float:left">${title.replace(/[<>&]/g, '')}</span>
    <span style="float:right">HYT Global Institute — Internal</span></div>`,
  footerTemplate: `<div style="font:7.5pt 'Segoe UI',Arial,sans-serif;color:#a0aec0;
    width:100%;padding:0 16mm;text-align:center;">
    Page <span class="pageNumber"></span> of <span class="totalPages"></span></div>`,
  margin: { top: '18mm', bottom: '20mm', left: '16mm', right: '16mm' },
});
await browser.close();

const kb = (fs.statSync(output).size / 1024).toFixed(0);
console.log(`Wrote ${output} (${kb} KB)`);
