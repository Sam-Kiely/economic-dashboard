// Vercel API route for Yahoo Finance data

// Cache implementation
const cache = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute for quotes

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

  const { symbol, range, interval } = req.query;

  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required' });
    return;
  }

  // Create cache key including range and interval
  const cacheKey = `${symbol}_${range || 'default'}_${interval || 'default'}`;

  // Check cache
  const cached = cache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log(`Returning cached data for ${cacheKey}`);
    res.status(200).json(cached.data);
    return;
  }

  try {
    // Build URL with optional range and interval parameters
    let url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const params = [];
    if (range) params.push(`range=${range}`);
    if (interval) params.push(`interval=${interval}`);
    if (params.length > 0) {
      url += '?' + params.join('&');
    }

    console.log(`Fetching Yahoo Finance data for: ${url}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the response with the cache key
    cache.set(cacheKey, {
      data: data,
      timestamp: Date.now()
    });

    res.status(200).json(data);
  } catch (error) {
    console.error('Yahoo Finance API error:', error);
    res.status(500).json({
      error: 'Failed to fetch Yahoo Finance data',
      details: error.message
    });
  }
}