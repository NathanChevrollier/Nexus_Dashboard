/**
 * Health Check Endpoint
 * Utilisé par Docker healthcheck et monitoring
 */

import { NextResponse } from 'next/server';
import { db } from '@/lib/db';

export async function GET() {
  try {
    // Vérifier la connexion à la base de données
    await db.execute('SELECT 1');

    return NextResponse.json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'nexus-dashboard',
      database: 'connected',
    }, { status: 200 });
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      service: 'nexus-dashboard',
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 503 });
  }
}
