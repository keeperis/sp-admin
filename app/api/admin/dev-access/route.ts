import { localDevelopmentAccess } from '@/lib/auth/local-development';

export function GET(request: Request) {
  return Response.json(
    { enabled: localDevelopmentAccess(request) },
    { headers: { 'Cache-Control': 'no-store, private' } },
  );
}
