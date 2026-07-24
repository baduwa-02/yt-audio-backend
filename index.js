import express from 'express';
import cors from 'cors';
import { Innertube, ClientType } from 'youtubei.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

let youtube;

// Initialize YouTube.js with Android/iOS Client Override
async function initYoutube() {
  try {
    youtube = await Innertube.create({
      client_type: ClientType.ANDROID, // Bot Detection bypass කිරීමට Android context එක පාවිච්චි කරයි
      generate_session_locally: true
    });
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

// 2. Direct Audio Stream Endpoint
app.get('/api/stream/:id', async (req, res) => {
  try {
    const videoId = req.params.id;

    if (!youtube) {
      return res.status(503).json({ error: 'YouTube client is initializing' });
    }

    // Direct info request using YouTube Android API context
    const info = await youtube.getBasicInfo(videoId, 'ANDROID');
    
    const formats = info.streaming_data?.adaptive_formats || [];
    const audioFormats = formats.filter(f => f.has_audio && !f.has_video);

    if (audioFormats.length === 0) {
      return res.status(404).json({ error: 'Audio stream not found' });
    }

    // High Quality audio track තේරීම
    const bestAudio = audioFormats.reduce((prev, curr) => 
      (curr.bitrate > prev.bitrate) ? curr : prev
    );

    // Direct Stream URL හෝ Deciphered URL එක ගැනීම
    let streamUrl = bestAudio.url;

    if (!streamUrl && typeof bestAudio.decipher === 'function') {
      streamUrl = bestAudio.decipher(youtube.session.player);
    }

    if (!streamUrl) {
      return res.status(500).json({ error: 'Could not resolve stream URL' });
    }

    res.json({
      id: videoId,
      streamUrl: streamUrl,
      mimeType: bestAudio.mime_type,
      bitrate: bestAudio.bitrate,
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to extract audio stream', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
