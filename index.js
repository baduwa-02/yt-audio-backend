import express from 'express';
import cors from 'cors';
import { Innertube } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let youtube;

// Initialize YouTube.js
async function initYoutube() {
  try {
    youtube = await Innertube.create();
    console.log('✅ YouTube.js Client Successfully Initialized!');
  } catch (err) {
    console.error('❌ Failed to initialize YouTube.js:', err);
  }
}

initYoutube();

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

    if (!youtube) {
      return res.status(503).json({ error: 'YouTube client is initializing, please try again in a few seconds' });
    }

    const search = await youtube.search(query, { type: 'video' });
    
    const results = search.videos.map((video) => ({
      id: video.id,
      title: video.title?.text || 'Unknown Title',
      artist: video.author?.name || 'Unknown Channel',
      thumbnail: video.thumbnails?.[0]?.url || '',
      duration: video.duration?.text || '00:00',
    }));

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

// 2. Direct Audio Stream URL Endpoint
app.get('/api/stream/:id', async (req, res) => {
  try {
    const videoId = req.params.id;
    
    if (!youtube) {
      return res.status(503).json({ error: 'YouTube client is initializing' });
    }

    const info = await youtube.getBasicInfo(videoId);

    // Filter .m4a Direct Audio Stream Format
    const audioFormat = info.streaming_data?.adaptive_formats.find(
      (format) => format.mime_type.includes('audio/mp4')
    );

    if (!audioFormat) {
      return res.status(404).json({ error: 'Direct audio stream not found' });
    }

    res.json({
      id: videoId,
      streamUrl: audioFormat.url,
      mimeType: audioFormat.mime_type,
      bitrate: audioFormat.bitrate,
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
