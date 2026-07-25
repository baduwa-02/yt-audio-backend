import express from 'express';
import cors from 'cors';
import ytdl from 'ytdl-core';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'online', message: 'YTDL-Core Audio API is running!' });
});

// Search Endpoint (Mock search or direct info lookup)
app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    // Using a reliable public search helper via ytdl info or fallback search
    const searchUrl = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`;
    const response = await fetch(searchUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    });
    const html = await response.text();
    
    // Extract video IDs and titles using basic regex from YouTube search results page
    const matches = [...html.matchAll(/"videoId":"(.{11})","thumbnail":{.*?"title":{.*?"runs":\[{"text":"(.*?)"}\]/g)];
    
    const results = matches.slice(0, 5).map(match => ({
      id: match[1],
      title: match[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&'),
      artist: 'YouTube',
      thumbnail: `https://i.ytimg.com/vi/${match[1]}/hqdefault.jpg`,
      duration: '03:00'
    }));

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Stream Endpoint
app.get('/api/stream/:id', async (req, res) => {
  try {
    const videoId = req.params.id;
    if (!ytdl.validateID(videoId)) {
      return res.status(400).json({ error: 'Invalid YouTube Video ID' });
    }

    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;
    const info = await ytdl.getInfo(videoUrl);
    const audioFormats = ytdl.filterFormats(info.formats, 'audioonly');

    if (audioFormats.length === 0) {
      return res.status(404).json({ error: 'Audio stream not found' });
    }

    res.json({
      id: videoId,
      streamUrl: audioFormats[0].url,
      mimeType: audioFormats[0].mimeType || 'audio/webm',
      bitrate: audioFormats[0].audioBitrate || 160,
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to extract audio stream', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
