import { NextResponse } from 'next/server'

export async function POST() {
  return NextResponse.json({ error: 'Interventions not yet implemented (Sub-project B)' }, { status: 501 })
}
