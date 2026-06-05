import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/customer-db';
import { verifyPassword } from '@/lib/customer-auth';

export async function POST(request: NextRequest) {
  try {
    initializeDatabase();
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json({ error: 'Missing email or password' }, { status: 400 });
    }

    const db = getDb();
    const query = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = query.get(email) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 401 });
    }

    const passwordValid = await verifyPassword(password, user.password);
    if (!passwordValid) {
      return NextResponse.json({ error: 'Invalid password' }, { status: 401 });
    }

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        loyalty_tier: user.loyalty_tier,
        loyalty_points: user.loyalty_points,
        referral_code: user.referral_code,
      },
    });

    response.cookies.set('user_id', user.id, { httpOnly: true, maxAge: 86400 * 7 });
    return response;
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
