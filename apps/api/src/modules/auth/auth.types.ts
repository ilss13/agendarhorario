import type { Request } from 'express';
import type { UserRole } from '../users/user.entity';

export interface AuthenticatedUser {
  id: string;
  firebaseUid: string;
  email: string;
  name: string;
  role: UserRole;
  companyId: string | null;
  emailVerified: boolean;
  phoneVerified: boolean;
}

export interface AuthenticatedRequest extends Request {
  user: AuthenticatedUser;
}
