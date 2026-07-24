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
      return res.status(503).json({ error: 'YouTube client is initializing' });
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

// 2. Direct Audio Stream URL Endpoint (Fixed Stream Extraction)
app.get('/api/stream/:id', async (req, res) => {
  try {
    const videoId = req.params.id;
    
    if (!youtube) {
      return res.status(503).json({ error: 'YouTube client is initializing' });
    }

    const info = await youtube.getInfo(videoId);

    // Filter Best Audio Format (.m4a)
    const format = info.chooseFormat({
      type: 'audio',
      quality: 'best'
    });

    if (!format) {
      return res.status(404).json({ error: 'Direct audio stream not found' });
    }

    // Direct Stream URL Decrypting via InnerTube built-in format URL solver
    const streamUrl = format.decipher ? format.decipher(youtube.session.player) : format.url;

    res.json({
      id: videoId,
      streamUrl: streamUrl,
      mimeType: format.mime_type,
      bitrate: format.bitrate,
    });
  } catch (error) {
    console.error('Stream error:', error);

    // Fallback: Try fetching via streamingData direct URL extraction
    try {
      const info = await youtube.getBasicInfo(req.params.id);
      const formats = info.streaming_data?.adaptive_formats || [];
      const audio = formats.find(f => f.has_audio && !f.has_video);

      if (audio && audio.url) {
        return res.json({
          id: req.params.id,
          streamUrl: audio.url,
          mimeType: audio.mime_type,
          bitrate: audio.bitrate
        });
      }
    } catch (fallbackError) {
      console.error('Fallback error:', fallbackError);
    }

    res.status(500).json({ error: 'Failed to extract playable audio URL' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
