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
      SELECT * FROM prescriptions
      WHERE user_id = ?
      ORDER BY created_at DESC
    `);
    const prescriptions = query.all(userId);

    return NextResponse.json({ prescriptions });
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

    const { medication_name, dosage, frequency, duration, start_date, end_date, doctor_name, notes } = await request.json();

    const id = generateId();
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO prescriptions (id, user_id, medication_name, dosage, frequency, duration, start_date, end_date, doctor_name, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insert.run(id, userId, medication_name, dosage, frequency, duration, start_date, end_date || null, doctor_name || null, notes || null);

    return NextResponse.json({ success: true, id });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
