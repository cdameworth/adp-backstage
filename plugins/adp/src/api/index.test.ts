import { AdpClient } from './index';

describe('AdpClient', () => {
  const discoveryApi = {
    getBaseUrl: jest.fn().mockResolvedValue('http://localhost:7007/api/adp'),
  };

  beforeEach(() => {
    discoveryApi.getBaseUrl.mockClear();
  });

  function makeFetchApi(response: Partial<Response>) {
    return { fetch: jest.fn().mockResolvedValue(response) };
  }

  it('resolves the base URL via discoveryApi and calls fetchApi (not global fetch)', async () => {
    const fetchApi = makeFetchApi({
      ok: true,
      json: async () => ({ items: [], total: 0, limit: 50, offset: 0 }),
    } as Response);

    const client = new AdpClient({ discoveryApi, fetchApi } as any);
    await client.getSessions({ limit: 50, status: 'active' });

    expect(discoveryApi.getBaseUrl).toHaveBeenCalledWith('adp');
    expect(fetchApi.fetch).toHaveBeenCalledWith(
      'http://localhost:7007/api/adp/sessions?limit=50&status=active',
      expect.objectContaining({
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );
  });

  it('sends PATCH with a JSON body when resolving an approval', async () => {
    const fetchApi = makeFetchApi({
      ok: true,
      json: async () => ({ id: 'a1', status: 'approved' }),
    } as Response);

    const client = new AdpClient({ discoveryApi, fetchApi } as any);
    await client.resolveApproval('a1', { status: 'approved', comment: 'ok' });

    const [url, init] = fetchApi.fetch.mock.calls[0];
    expect(url).toBe('http://localhost:7007/api/adp/governance/approvals/a1');
    expect(init.method).toBe('PATCH');
    expect(JSON.parse(init.body)).toEqual({ status: 'approved', comment: 'ok' });
  });

  it('throws a descriptive error on a non-ok response', async () => {
    const fetchApi = makeFetchApi({
      ok: false,
      status: 500,
      statusText: 'Internal Server Error',
    } as Response);

    const client = new AdpClient({ discoveryApi, fetchApi } as any);
    await expect(client.getSession('abc')).rejects.toThrow('ADP API error: 500');
  });
});
