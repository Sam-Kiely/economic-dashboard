// Vercel API route for batch Yahoo Finance data fetching

// Cache implementation
const cache = new Map();
const CACHE_DURATION = 60 * 1000; // 1 minute for quotes

async function fetchSymbol(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`;
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Yahoo Finance API error for ${symbol}: ${response.status}`);
    }

    const data = await response.json();
    return { symbol, data, success: true };
  } catch (error) {
    console.error(`Error fetching ${symbol}:`, error.message);
    return { symbol, error: error.message, success: false };
  }
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let symbols = [];

  // Support both GET and POST
  if (req.method === 'GET') {
    const symbolsParam = req.query.symbols;
    if (!symbolsParam) {
      res.status(400).json({ error: 'Symbols parameter is required' });
      return;
    }
    symbols = symbolsParam.split(',').map(s => s.trim());
  } else if (req.method === 'POST') {
    symbols = req.body.symbols;
    if (!symbols || !Array.isArray(symbols)) {
      res.status(400).json({ error: 'Symbols array is required in request body' });
      return;
    }
  }

  // Limit number of symbols to prevent abuse
  if (symbols.length > 50) {
    res.status(400).json({ error: 'Maximum 50 symbols allowed per request' });
    return;
  }

  try {
    const results = {};
    const toFetch = [];

    // Check cache for each symbol
    for (const symbol of symbols) {
      const cached = cache.get(symbol);
      if (cached && (Date.now() - cached.timestamp < CACHE_DURATION)) {
        console.log(`Using cached data for ${symbol}`);
        results[symbol] = cached.data;
      } else {
        toFetch.push(symbol);
      }
    }

    // Fetch missing symbols in parallel
    if (toFetch.length > 0) {
      console.log(`Fetching ${toFetch.length} symbols from Yahoo Finance`);
      const fetchPromises = toFetch.map(symbol => fetchSymbol(symbol));
      const fetchResults = await Promise.all(fetchPromises);

      for (const result of fetchResults) {
        if (result.success) {
          // Cache successful results
          cache.set(result.symbol, {
            data: result.data,
            timestamp: Date.now()
          });
          results[result.symbol] = result.data;
        } else {
          results[result.symbol] = { error: result.error };
        }
      }
    }

    res.status(200).json(results);
  } catch (error) {
    console.error('Batch Yahoo Finance API error:', error);
    res.status(500).json({
      error: 'Failed to fetch Yahoo Finance data',
      details: error.message
    });
  }
}