import { AdpEntityProvider } from './AdpEntityProvider';
import type { AdpClient, Service } from '../client';

const logger: any = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
  child: jest.fn(function child() {
    return logger;
  }),
};

function makeClient(services: Partial<Service>[]): AdpClient {
  return {
    listServices: jest.fn().mockResolvedValue({
      items: services,
      total: services.length,
      limit: 100,
      offset: 0,
    }),
  } as unknown as AdpClient;
}

describe('AdpEntityProvider', () => {
  it('maps ADP services to Backstage Component entities', async () => {
    const provider = new AdpEntityProvider({
      adpClient: makeClient([
        {
          id: 'svc-1',
          name: 'My Service!',
          description: 'demo',
          repository_url: 'https://github.com/acme/widget',
          owner_team: 'platform',
          created_at: '2026-01-01T00:00:00Z',
        },
      ]),
      logger,
    });

    const applyMutation = jest.fn().mockResolvedValue(undefined);
    await provider.connect({ applyMutation, refresh: jest.fn() } as any);

    expect(applyMutation).toHaveBeenCalledTimes(1);
    const mutation = applyMutation.mock.calls[0][0];
    expect(mutation.type).toBe('full');
    expect(mutation.entities).toHaveLength(1);

    const { entity } = mutation.entities[0];
    expect(entity.kind).toBe('Component');
    expect(entity.metadata.name).toBe('my-service');
    expect(entity.metadata.title).toBe('My Service!');
    expect(entity.metadata.annotations['adp.io/service-id']).toBe('svc-1');
    expect(entity.metadata.annotations['github.com/project-slug']).toBe(
      'acme/widget',
    );
    expect(entity.spec.owner).toBe('group:default/platform');

    await provider.disconnect();
  });

  it('throws when refresh is called before connect', async () => {
    const provider = new AdpEntityProvider({
      adpClient: makeClient([]),
      logger,
    });

    await expect(provider.refresh()).rejects.toThrow('Not connected');
  });
});
