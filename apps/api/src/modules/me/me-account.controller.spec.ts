import type { AuthenticatedUser } from '../auth/auth.types';
import { MeAccountController } from './me-account.controller';
import type { DataExportDto, MeAccountService } from './me-account.service';

describe('MeAccountController', () => {
  const user: AuthenticatedUser = {
    id: 'user-1',
    firebaseUid: 'fb-1',
    email: 'user@example.com',
    name: 'User',
    phone: '+5511999999999',
    role: 'CUSTOMER',
    companyId: null,
    emailVerified: true,
    phoneVerified: true,
  };

  let service: jest.Mocked<Pick<MeAccountService, 'export' | 'deleteAccount'>>;
  let controller: MeAccountController;

  beforeEach(() => {
    service = {
      export: jest.fn(),
      deleteAccount: jest.fn(),
    };
    controller = new MeAccountController(service as unknown as MeAccountService);
  });

  it('export delegates to service', async () => {
    const payload: DataExportDto = {
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        createdAt: new Date().toISOString(),
      },
      customers: [],
      appointments: [],
      exportedAt: new Date().toISOString(),
    };
    service.export.mockResolvedValue(payload);

    await expect(controller.export(user)).resolves.toEqual(payload);
    expect(service.export).toHaveBeenCalledWith(user);
  });

  it('delete delegates to service', async () => {
    service.deleteAccount.mockResolvedValue(undefined);

    await expect(controller.delete(user)).resolves.toBeUndefined();
    expect(service.deleteAccount).toHaveBeenCalledWith(user);
  });

  it('propagates export failures', async () => {
    service.export.mockRejectedValue(new Error('export failed'));
    await expect(controller.export(user)).rejects.toThrow('export failed');
  });

  it('propagates delete failures', async () => {
    service.deleteAccount.mockRejectedValue(new Error('delete failed'));
    await expect(controller.delete(user)).rejects.toThrow('delete failed');
  });
});
