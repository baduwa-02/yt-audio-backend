const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. සෙවුම් API එක (Search Endpoint) - Invidious API හරහා
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    
    if (!query) {
        return res.status(400).json({ error: 'Search query (q) is required' });
    }

    try {
        // Invidious public instance එකක් හරහා සෙවුම් ප්‍රතිඵල ලබා ගැනීම
        const response = await fetch(`https://invidious.privacydev.net/api/v1/search?q=${encodeURIComponent(query)}&type=video`);
        const data = await response.json();

        if (!Array.isArray(data)) {
            return res.status(500).json({ success: false, error: 'Invalid response from search API' });
        }

        const results = data.map(item => ({
            id: item.videoId,
            title: item.title,
            duration: item.lengthSeconds,
            thumbnail: item.videoThumbnails && item.videoThumbnails.length > 0 
                ? item.videoThumbnails[0].url 
                : `https://i.ytimg.com/vi/${item.videoId}/hqdefault.jpg`
        }));

        res.json({ success: true, data: results });
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch search results' });
    }
});

// 2. ශ්‍රව්‍ය ධාවන සබැඳිය ලබා දෙන API එක (Audio Stream Endpoint)
app.get('/api/stream/:id', async (req, res) => {
    const videoId = req.params.id;

    if (!videoId) {
        return res.status(400).json({ error: 'Video ID is required' });
    }

    try {
        // Invidious API හරහා අදාළ වීඩියෝවේ විස්තර සහ stream URL ලබා ගැනීම
        const response = await fetch(`https://invidious.privacydev.net/api/v1/videos/${videoId}`);
        const data = await response.json();

        if (!data || !data.adaptiveFormats) {
            return res.status(404).json({ success: false, error: 'Stream not found' });
        }

        // හොඳම Audio Only ෆෝමැට් එක තෝරා ගැනීම
        const audioFormats = data.adaptiveFormats.filter(format => format.type && format.type.includes('audio'));
        
        if (audioFormats.length === 0) {
            return res.status(404).json({ success: false, error: 'Audio stream format not found' });
        }

        // උසස්ම තත්ත්වයේ audio URL එක ලබා ගැනීම
        const bestAudio = audioFormats[audioFormats.length - 1];

        res.json({ 
            success: true, 
            videoId: videoId, 
            streamUrl: bestAudio.url 
        });
    } catch (error) {
        console.error('Stream Extraction Error:', error);
        res.status(500).json({ success: false, error: 'Failed to extract audio stream' });
    }
});

app.listen(PORT, () => {
    console.log(`Music Player Backend is running on port ${PORT}`);
});
