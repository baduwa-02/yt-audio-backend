import express from 'express';
import cors from 'cors';
import youtubedl from 'youtube-dl-exec';

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
  res.json({ status: 'online', message: 'YouTube Audio API with yt-dlp is running!' });
});

app.get('/api/search', async (req, res) => {
  try {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Search query (q) is required' });
    }

    const output = await youtubedl(`ytsearch5:${query}`, {
      dumpJson: true,
      noWarnings: true,
      preferFreeFormats: true,
      flatPlaylist: true,
      extractorArgs: 'youtube:player_client=android',
    });

    let results = [];
    if (typeof output === 'string') {
      results = output.split('\n')
        .filter(Boolean)
        .map(line => JSON.parse(line))
        .map(video => ({
          id: video.id,
          title: video.title,
          artist: video.uploader || 'Unknown',
          thumbnail: video.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
          duration: video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : '03:00'
        }));
    } else if (Array.isArray(output)) {
      results = output.map(video => ({
        id: video.id,
        title: video.title,
        artist: video.uploader || 'Unknown',
        thumbnail: video.thumbnails?.[0]?.url || `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg`,
        duration: video.duration ? `${Math.floor(video.duration / 60)}:${String(video.duration % 60).padStart(2, '0')}` : '03:00'
      }));
    }

    res.json({ results });
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

app.get('/api/stream/:id', async (req, res) => {
  try {
    const videoId = req.params.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    const output = await youtubedl(videoUrl, {
      dumpSingleJson: true,
      noWarnings: true,
      format: 'bestaudio',
      extractorArgs: 'youtube:player_client=android',
    });

    if (!output || !output.url) {
      return res.status(404).json({ error: 'Audio stream not found' });
    }

    res.json({
      id: videoId,
      streamUrl: output.url,
      mimeType: output.ext ? `audio/${output.ext}` : 'audio/webm',
      bitrate: output.abr || 160,
    });
  } catch (error) {
    console.error('Stream error:', error);
    res.status(500).json({ error: 'Failed to extract audio stream', details: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
