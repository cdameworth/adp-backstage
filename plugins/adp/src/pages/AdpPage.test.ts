import { resolveActiveTabIndex } from './AdpPage';

describe('resolveActiveTabIndex', () => {
  const root = '/adp';

  it.each([
    ['/adp', 0],
    ['/adp/', 0],
    ['/adp/sessions', 1],
    ['/adp/approvals', 2],
    ['/adp/approvals/abc-123', 2],
    ['/adp/audit', 3],
    ['/adp/reports', 4],
    ['/adp/unknown', 0],
  ])('maps %s to tab %i', (pathname, expected) => {
    expect(resolveActiveTabIndex(pathname, root)).toBe(expected);
  });

  it('respects a non-default app base path', () => {
    expect(resolveActiveTabIndex('/custom/base/adp/sessions', '/custom/base/adp')).toBe(1);
  });
});
