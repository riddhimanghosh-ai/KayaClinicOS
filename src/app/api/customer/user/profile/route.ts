import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/customer-db';

export async function GET(request: NextRequest) {
  try {
    initializeDatabase();
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const query = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = query.get(userId) as any;

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    return NextResponse.json({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      dob: user.dob,
      profile_image: user.profile_image,
      loyalty_tier: user.loyalty_tier,
      loyalty_points: user.loyalty_points,
      referral_code: user.referral_code,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
