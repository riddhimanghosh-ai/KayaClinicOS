import bcrypt from 'bcryptjs';

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateUserId(): string {
  return 'user_' + Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export function generateReferralCode(): string {
  return 'KAYA' + Math.random().toString(36).substr(2, 8).toUpperCase();
}

export function generateDiscountCode(): string {
  return 'REFER' + Math.random().toString(36).substr(2, 6).toUpperCase();
}

export function generateId(): string {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

export const LOYALTY_TIERS = {
  Silver: { minPoints: 0, maxPoints: 999, benefits: ['5% discount'] },
  Gold: { minPoints: 1000, maxPoints: 4999, benefits: ['10% discount', 'Free consultation'] },
  Elite: { minPoints: 5000, maxPoints: 9999, benefits: ['15% discount', 'Priority booking', 'Free products quarterly'] },
  Platinum: { minPoints: 10000, maxPoints: Infinity, benefits: ['20% discount', 'VIP support', 'Free products monthly', 'Exclusive events'] },
};

export function getLoyaltyTier(points: number): string {
  if (points >= 10000) return 'Platinum';
  if (points >= 5000) return 'Elite';
  if (points >= 1000) return 'Gold';
  return 'Silver';
}
