import { NextRequest, NextResponse } from 'next/server';
import { publicModels } from '@/lib/rubiks/models';
import { authorize, isConfigured, requiresAccessKey } from '@/lib/rubiks/server';

export const dynamic = 'force-dynamic';

/**
 * Tells the page what it may do. `liveAllowed` is true only when the server
 * has an OpenRouter key and either no access key is configured or the request
 * carried the right one in `x-demo-key`.
 */
export async function GET(req: NextRequest) {
  return NextResponse.json({
    configured: isConfigured(),
    requiresAccessKey: requiresAccessKey(),
    liveAllowed: authorize(req) === null,
    models: publicModels(),
  });
}
