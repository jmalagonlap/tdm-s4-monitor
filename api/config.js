/**
 * API Route: Expone la configuración con variables de entorno
 * Vercel la ejecutará como serverless function
 */

export default function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Retornar configuración con variables de entorno
  res.status(200).json({
    API_USERNAME: process.env.ARTIMO_USERNAME || '',
    API_PASSWORD: process.env.ARTIMO_PASSWORD || '',
  });
}
