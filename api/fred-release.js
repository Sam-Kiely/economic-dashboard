// Serverless function to fetch FRED series release information
export default async function handler(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }

    const { seriesId } = req.query;

    if (!seriesId) {
        return res.status(400).json({ error: 'Series ID required' });
    }

    const apiKey = '7b2b5891d1e72a3dff72e1806e851d20';

    try {
        // Fetch series info including release dates
        const seriesUrl = `https://api.stlouisfed.org/fred/series?series_id=${seriesId}&api_key=${apiKey}&file_type=json`;
        const seriesResponse = await fetch(seriesUrl);

        if (!seriesResponse.ok) {
            throw new Error(`FRED API error: ${seriesResponse.status}`);
        }

        const seriesData = await seriesResponse.json();

        // Also fetch the latest observation to get the actual release info
        const obsUrl = `https://api.stlouisfed.org/fred/series/observations?series_id=${seriesId}&api_key=${apiKey}&file_type=json&limit=2&sort_order=desc`;
        const obsResponse = await fetch(obsUrl);

        if (!obsResponse.ok) {
            throw new Error(`FRED API error: ${obsResponse.status}`);
        }

        const obsData = await obsResponse.json();

        // Extract relevant info
        const result = {
            seriesId: seriesId,
            title: seriesData.seriess?.[0]?.title || '',
            lastUpdated: seriesData.seriess?.[0]?.last_updated || '',
            observationStart: seriesData.seriess?.[0]?.observation_start || '',
            observationEnd: seriesData.seriess?.[0]?.observation_end || '',
            frequency: seriesData.seriess?.[0]?.frequency || '',
            units: seriesData.seriess?.[0]?.units || '',
            // Latest two observations for current and previous values
            current: obsData.observations?.[0] || null,
            previous: obsData.observations?.[1] || null
        };

        return res.status(200).json(result);
    } catch (error) {
        console.error('Error fetching FRED release info:', error);
        return res.status(500).json({
            error: 'Failed to fetch FRED release info',
            details: error.message
        });
    }
}