import express from 'express';
import cors from 'cors';
import axios from 'axios';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Public Piped API Instance
const PIPED_API = 'https://pipedapi.kavin.rocks';

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

    const response = await axios.get(`${PIPED_API}/search`, {
      params: { q: query, filter: 'videos' }
    });

    const results = response.data.items.map((video) => ({
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
    const response = await axios.get(`${PIPED_API}/streams/${videoId}`);

    const audioStreams = response.data.audioStreams;

    if (!audioStreams || audioStreams.length === 0) {
      return res.status(404).json({ error: 'Audio stream not found' });
    }

    // Select the audio stream with highest bitrate
    const bestAudio = audioStreams.reduce((prev, curr) =>
      curr.bitrate > prev.bitrate ? curr : prev
    );

    res.json({
      id: videoId,
      title: response.data.title,
      artist: response.data.uploader,
      thumbnail: response.data.thumbnailUrl,
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
