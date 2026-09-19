import { NextResponse } from 'next/server';
import { publicModels } from '@/lib/rubiks/models';
import { isConfigured, requiresAccessKey } from '@/lib/rubiks/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    configured: isConfigured(),
    requiresAccessKey: requiresAccessKey(),
    models: publicModels(),
  });
}
