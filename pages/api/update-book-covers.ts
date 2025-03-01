// pages/api/update-book-covers.ts
import type { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  return res.status(503).json({ 
    message: "Cette fonctionnalité est temporairement désactivée puisque nous n'utilisons plus l'API OpenLibrary" 
  });
}