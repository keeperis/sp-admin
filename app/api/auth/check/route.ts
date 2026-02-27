import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth/config';

export const dynamic = 'force-dynamic';

/**
 * GET /api/auth/check – patikrinti ar vartotojas prisijungęs.
 * Grąžina session info arba { ok: false } jei neprisijungęs.
 */
export async function GET() {
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({
      ok: false,
      loggedIn: false,
      message: 'Neprisijungęs',
    });
  }

  return NextResponse.json({
    ok: true,
    loggedIn: true,
    user: {
      email: session.user.email,
      name: session.user.name,
      image: session.user.image ? '[yra]' : null,
      adminId: (session as any).adminId ?? null,
      adminRole: (session as any).adminRole ?? null,
    },
  });
}
