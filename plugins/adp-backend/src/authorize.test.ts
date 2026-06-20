import { AuthorizeResult } from '@backstage/plugin-permission-common';
import { NotAllowedError } from '@backstage/errors';
import { authorizeRequest } from './router';
import { adpApprovalResolvePermission } from './permissions';

describe('authorizeRequest', () => {
  const httpAuth: any = {
    credentials: jest.fn().mockResolvedValue({ principal: { type: 'user' } }),
  };

  function makePermissions(result: AuthorizeResult) {
    return { authorize: jest.fn().mockResolvedValue([{ result }]) } as any;
  }

  it('resolves when the decision is ALLOW', async () => {
    const permissions = makePermissions(AuthorizeResult.ALLOW);

    await expect(
      authorizeRequest({
        req: {} as any,
        permission: adpApprovalResolvePermission,
        httpAuth,
        permissions,
      }),
    ).resolves.toBeUndefined();

    expect(permissions.authorize).toHaveBeenCalledWith(
      [{ permission: adpApprovalResolvePermission }],
      expect.objectContaining({ credentials: expect.any(Object) }),
    );
  });

  it('throws NotAllowedError when the decision is DENY', async () => {
    const permissions = makePermissions(AuthorizeResult.DENY);

    await expect(
      authorizeRequest({
        req: {} as any,
        permission: adpApprovalResolvePermission,
        httpAuth,
        permissions,
      }),
    ).rejects.toThrow(NotAllowedError);
  });
});
