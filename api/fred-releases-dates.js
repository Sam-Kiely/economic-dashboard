// Vercel API route for FRED releases/dates data

// Cache implementation
const cache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

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

  const { realtime_start, realtime_end, limit, sort_order, include_release_dates_with_no_data } = req.query;

  // Create cache key
  const cacheKey = `${realtime_start || ''}_${realtime_end || ''}_${limit || ''}_${sort_order || ''}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log('Returning cached FRED releases/dates data');
    res.status(200).json(cached.data);
    return;
  }

  try {
    const params = new URLSearchParams({
      api_key: process.env.FRED_API_KEY || '7b2b5891d1e72a3dff72e1806e851d20',
      file_type: 'json'
    });

    if (realtime_start) params.append('realtime_start', realtime_start);
    if (realtime_end) params.append('realtime_end', realtime_end);
    if (limit) params.append('limit', limit);
    if (sort_order) params.append('sort_order', sort_order);
    if (include_release_dates_with_no_data) params.append('include_release_dates_with_no_data', include_release_dates_with_no_data);

    const url = `https://api.stlouisfed.org/fred/releases/dates?${params}`;

    console.log('Fetching FRED releases/dates data');
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
    console.error('FRED releases/dates API error:', error);
    res.status(500).json({
      error: 'Failed to fetch FRED releases/dates data',
      details: error.message
    });
  }
}
