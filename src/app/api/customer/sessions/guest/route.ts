import { NextRequest, NextResponse } from 'next/server';
import { getDb, initializeDatabase } from '@/lib/customer-db';
import { generateId } from '@/lib/customer-auth';

export async function POST(request: NextRequest) {
  try {
    initializeDatabase();
    const { name, phone, doctor_name, session_date, session_time, treatment_type } = await request.json();

    if (!name || !phone) {
      return NextResponse.json({ error: 'Name and phone are required' }, { status: 400 });
    }

    const id = generateId();
    const db = getDb();
    const insert = db.prepare(`
      INSERT INTO guest_bookings (id, name, phone, doctor_name, session_date, session_time, treatment_type, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')
    `);
    insert.run(id, name, phone, doctor_name || null, session_date || null, session_time || null, treatment_type || null);

    return NextResponse.json({ success: true, id, reference: 'KYB-' + id.slice(-6).toUpperCase() });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
