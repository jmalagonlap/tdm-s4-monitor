/**
 * API Endpoint: Dispara el workflow de polling
 * Llamado por EasyCron cada 30 segundos
 */

export default async function handler(req, res) {
  // Solo permitir GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verificar token de seguridad en query param
  const token = req.query.token;
  const expectedToken = process.env.CRON_TRIGGER_TOKEN;

  if (!token || token !== expectedToken) {
    console.warn('⚠️ Intento de disparo sin token válido');
    return res.status(401).json({ error: 'Unauthorized' });
  }

  try {
    // Disparar workflow en GitHub
    const response = await fetch(
      'https://api.github.com/repos/jmalagonlap/tdm-s4-monitor/actions/workflows/poll-gps.yml/dispatches',
      {
        method: 'POST',
        headers: {
          'Accept': 'application/vnd.github+json',
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'X-GitHub-Api-Version': '2022-11-28',
        },
        body: JSON.stringify({
          ref: 'main',
        }),
      }
    );

    if (!response.ok) {
      const error = await response.text();
      console.error('❌ Error disparando workflow:', response.status, error);
      return res.status(response.status).json({
        error: 'Failed to trigger workflow',
        details: error,
      });
    }

    console.log('✅ Workflow disparado exitosamente');
    return res.status(200).json({
      success: true,
      message: 'Workflow triggered successfully',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('❌ Error:', error.message);
    return res.status(500).json({
      error: 'Internal server error',
      message: error.message,
    });
  }
}
