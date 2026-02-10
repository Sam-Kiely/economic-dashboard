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

  const { symbol } = req.query;

  if (!symbol) {
    res.status(400).json({ error: 'Symbol is required' });
    return;
  }

  // Check cache
  const cached = cache.get(symbol);
  if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
    console.log(`Returning cached data for ${symbol}`);
    res.status(200).json(cached.data);
    return;
  }

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;

    console.log(`Fetching Yahoo Finance data for: ${symbol}`);
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error: ${response.status}`);
    }

    const data = await response.json();

    // Cache the response
    cache.set(symbol, {
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