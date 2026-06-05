import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/customer-db';
import { generateId } from '@/lib/customer-auth';

export async function GET(request: NextRequest) {
  try {
    initializeDatabase();
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const db = getDb();
    const query = db.prepare(`
      SELECT * FROM sessions
      WHERE user_id = ?
      ORDER BY session_date DESC, session_time DESC
    `);
    const sessions = query.all(userId);

    return NextResponse.json({ sessions });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    initializeDatabase();
    const userId = request.cookies.get('user_id')?.value;

    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { doctor_name, doctor_image, session_date, session_time, status, notes, treatment_type } = await request.json();

    const id = generateId();
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO sessions (id, user_id, doctor_name, doctor_image, session_date, session_time, status, notes, treatment_type)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(id, userId, doctor_name, doctor_image || null, session_date, session_time, status || 'upcoming', notes || null, treatment_type || null);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
