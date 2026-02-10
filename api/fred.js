// Vercel API route for FRED data

// Cache implementation
const cache = new Map();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  const { series, start_date, end_date } = req.query;

  if (!series) {
    res.status(400).json({ error: 'Series ID is required' });
    return;
  }

  // Create cache key
  const cacheKey = `${series}_${start_date || 'no-start'}_${end_date || 'no-end'}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log(`Returning cached data for ${series}`);
    res.status(200).json(cached.data);
    return;
  }

  try {
    // Build FRED API URL - use environment variable or fallback
    const params = new URLSearchParams({
      series_id: series,
      api_key: process.env.FRED_API_KEY || '7b2b5891d1e72a3dff72e1806e851d20',
      file_type: 'json',
      sort_order: 'desc'
    });

    if (start_date) params.append('observation_start', start_date);
    if (end_date) params.append('observation_end', end_date);

    const url = `https://api.stlouisfed.org/fred/series/observations?${params}`;

    console.log(`Fetching FRED data for series: ${series}`);
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`FRED API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the response
    cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('FRED API error:', error);
    res.status(500).json({
      error: 'Failed to fetch FRED data',
      details: error.message
    });
  }
}