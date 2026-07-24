import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Public Active Piped Instances (Fallback List)
const PIPED_INSTANCES = [
  'https://pipedapi.kavin.rocks',
  'https://api.piped.privacydev.net',
  'https://pipedapi.palvelu.org',
  'https://pipedapi.projectsegfault.net'
];

// Helper function to fetch from working instance
async function fetchFromPiped(endpoint, params = {}) {
  let lastError;
  for (const instance of PIPED_INSTANCES) {
    try {
      const response = await axios.get(`${instance}${endpoint}`, {
        params,
        timeout: 5000 // 5 seconds timeout
      });
      return response.data;
    } catch (err) {
      console.warn(`Instance failed (${instance}):`, err.message);
      lastError = err;
    }
  }
  throw new Error(lastError ? lastError.message : 'All instances failed');
}

// Health Check
app.get('/', (req, res) => {
  res.json({ status: 'online', message: 'YouTube Audio API is running!' });
});

// 1. Search Track Endpoint
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const data = await fetchFromPiped('/search', { q: query, filter: 'videos' });

    const results = data.items.map((video) => ({
      id: video.url.split('v=')[1],
      title: video.title,
      artist: video.uploaderName,
      thumbnail: video.thumbnail,
      duration: video.duration,
    }));

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// 2. Stream URL Extraction Endpoint
app.get('/api/stream/:id', async (req, res) => {
  try {
    const videoId = req.params.id;
    const data = await fetchFromPiped(`/streams/${videoId}`);

    const audioStreams = data.audioStreams;

    if (!audioStreams || audioStreams.length === 0) {
      return res.status(404).json({ error: 'Audio stream not found' });
    }

    // Select the best quality audio stream
    const bestAudio = audioStreams.reduce((prev, curr) =>
      curr.bitrate > prev.bitrate ? curr : prev
    );

    res.json({
      id: videoId,
      title: data.title,
      artist: data.uploader,
      thumbnail: data.thumbnailUrl,
      streamUrl: bestAudio.url,
      mimeType: bestAudio.mimeType,
      bitrate: bestAudio.bitrate,
    });
  } catch (error) {
    console.error('Stream error:', error.message);
    res.status(500).json({ error: 'Failed to fetch stream', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
