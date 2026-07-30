import { describe, expect, it } from 'vitest';
import { csvCell, toCsvDocument, toCsvRow } from '../../src/utils/csv';

describe('CSV hardening', () => {
  it.each([
    '=HYPERLINK("https://evil.example","x")',
    '+cmd|\' /C calc\'!A0',
    '-1+1',
    '@SUM(1,1)',
    '   =IMPORTDATA("https://evil.example")',
    '\t=1+1',
  ])('neutralizes formula-like cell %j', (value) => {
    expect(csvCell(value)).toBe(`"'${value.replace(/"/g, '""')}"`);
  });

  it('quotes commas and doubles embedded quotes', () => {
    expect(toCsvRow(['a,b', 'a "quote"'])).toBe('"a,b","a ""quote"""');
  });

  it('adds an Excel-compatible UTF-8 BOM and CRLF rows', () => {
    expect(toCsvDocument([['Name'], ['José']])).toBe('\uFEFF"Name"\r\n"José"');
  });
});
