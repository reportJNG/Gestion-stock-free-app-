import type { User, UserRow } from '@/types';

export const mapUserRow = (row: UserRow): User => ({
  id: row.id,
  name: row.name,
  businessType: row.business_type,
  avatarInitials: row.avatar_initials,
  isActive: row.is_active,
  createdAt: row.created_at,
});
