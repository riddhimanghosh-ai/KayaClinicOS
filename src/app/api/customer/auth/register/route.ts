import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/customer-db';
import { hashPassword, generateUserId, generateReferralCode } from '@/lib/customer-auth';

export async function POST(request: NextRequest) {
  try {
    initializeDatabase();
    const { email, password, name, phone, dob } = await request.json();

    if (!email || !password || !name) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const userId = generateUserId();
    const hashedPassword = await hashPassword(password);
    const referralCode = generateReferralCode();

    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO users (id, email, password, name, phone, dob, referral_code)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(userId, email, hashedPassword, name, phone || null, dob || null, referralCode);

    return NextResponse.json({
      success: true,
      user: { id: userId, email, name, referral_code: referralCode },
    });
  } catch (error: any) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return NextResponse.json({ error: 'Email already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
