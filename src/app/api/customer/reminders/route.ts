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
      SELECT * FROM reminders
      WHERE user_id = ?
      ORDER BY reminder_date DESC, reminder_time DESC
    `);
    const reminders = query.all(userId);

    return NextResponse.json({ reminders });
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

    const { reminder_type, title, message, reminder_date, reminder_time, related_prescription_id, related_session_id } = await request.json();

    const id = generateId();
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO reminders (id, user_id, reminder_type, title, message, reminder_date, reminder_time, related_prescription_id, related_session_id)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(id, userId, reminder_type, title, message, reminder_date, reminder_time, related_prescription_id || null, related_session_id || null);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
