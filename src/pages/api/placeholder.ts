import type { APIRoute } from 'astro';

export const GET: APIRoute = async () => {
  return new Response(JSON.stringify({ status: 'ok', version: '1.0.0' }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
};
