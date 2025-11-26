// apps/api/pages/api/revalidate.ts
import type { NextApiRequest, NextApiResponse } from 'next';

const SECRET = process.env.REVALIDATE_SECRET;

/**
 * POST /api/revalidate
 * Headers: { "x-revalidate-secret": "<secret>" }  OR ?secret=
 * Body: { path: "/profile/<userId>" }  OR { paths: [ "/profile/1", "/" ] }
 *
 * Returns { revalidated: true, path: "/profile/..." } on success.
 */
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const headerSecret = Array.isArray(req.headers['x-revalidate-secret'])
    ? req.headers['x-revalidate-secret'][0]
    : (req.headers['x-revalidate-secret'] as string | undefined);

  const qSecret = typeof req.query.secret === 'string' ? req.query.secret : undefined;
  const provided = headerSecret || qSecret;

  if (!SECRET) {
    console.error('REVALIDATE_SECRET is not set');
    return res.status(500).json({ error: 'Server not configured' });
  }

  if (!provided || provided !== SECRET) {
    return res.status(401).json({ error: 'Invalid or missing secret' });
  }

  const body = req.body || {};
  const singlePath = body.path as string | undefined;
  const paths = Array.isArray(body.paths) ? body.paths : (singlePath ? [singlePath] : []);

  if (!paths.length) {
    return res.status(400).json({ error: 'Missing path(s) to revalidate' });
  }

  try {
    for (const path of paths) {
      // next.js revalidate requires the actual route path, eg '/profile/123'
      await res.revalidate(path);
      console.log('Revalidated', path);
    }
    return res.status(200).json({ revalidated: true, paths });
  } catch (err) {
    console.error('Error revalidating', err);
    return res.status(500).json({ error: String(err) });
  }
}
