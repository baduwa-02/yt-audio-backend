import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Stable Invidious Instances
const INVIDIOUS_INSTANCES = [
  'https://invidious.privacyredirect.com',
  'https://vid.priv.au',
  'https://invidious.nerdvpn.de'
];

async function fetchFromInvidious(endpoint) {
  let lastError;
  for (const instance of INVIDIOUS_INSTANCES) {
    try {
      const response = await fetch(`${instance}${endpoint}`, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      });
      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
      return await response.json();
    } catch (err) {
      lastError = err;
    }
  }
  throw new Error(lastError ? lastError.message : 'All Invidious instances failed');
}

app.get('/', (req, res) => {
  res.json({ status: 'online', message: 'Invidious Audio API is running!' });
});

// 1. Search Track Endpoint
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const data = await fetchFromInvidious(`/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
    
    const results = data.map((video) => ({
      id: video.videoId,
      title: video.title,
      artist: video.author,
      thumbnail: video.videoThumbnails?.[0]?.url || '',
      duration: video.lengthSeconds ? `${Math.floor(video.lengthSeconds / 60)}:${video.lengthSeconds % 60}` : '00:00',
    }));

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// 2. Direct Audio Stream URL Endpoint
app.get('/api/stream/:id', async (req, res) => {
  try {
    const videoId = req.params.id;
    const data = await fetchFromInvidious(`/api/v1/videos/${videoId}`);

    const adaptiveFormats = data.adaptiveFormats || [];
    const audioFormats = adaptiveFormats.filter(f => f.type && f.type.includes('audio'));

    if (audioFormats.length === 0) {
      return res.status(404).json({ error: 'Audio stream not found' });
    }

    const bestAudio = audioFormats.reduce((prev, curr) => 
      (Number(curr.bitrate || 0) > Number(prev.bitrate || 0)) ? curr : prev
    );

    res.json({
      id: videoId,
      streamUrl: bestAudio.url,
      mimeType: bestAudio.type,
      bitrate: bestAudio.bitrate,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to extract audio stream', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
