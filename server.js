const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. සෙවුම් API එක (Search Endpoint) - Piped API හරහා
app.get('/api/search', async (req, res) => {
    const query = req.query.q;
    
    if (!query) {
        return res.status(400).json({ error: 'Search query (q) is required' });
    }

    try {
        const response = await fetch(`https://pipedapi.kavin.rocks/search?q=${encodeURIComponent(query)}&filter=videos`);
        const data = await response.json();

        if (!data || !data.items) {
            return res.status(500).json({ success: false, error: 'Invalid response from search API' });
        }

        const results = data.items.map(item => ({
            id: item.url.split('/watch?v=')[1],
            title: item.title,
            duration: item.duration,
            thumbnail: item.thumbnail || `https://i.ytimg.com/vi/${item.url.split('/watch?v=')[1]}/hqdefault.jpg`
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
        // Piped API එක හරහා වීඩියෝ විස්තර සහ ශ්‍රව්‍ය ප්‍රභව ලබා ගැනීම
        const response = await fetch(`https://pipedapi.kavin.rocks/streams/${videoId}`);
        const data = await response.json();

        if (!data || !data.audioStreams || data.audioStreams.length === 0) {
            return res.status(404).json({ success: false, error: 'Audio stream not found' });
        }

        // වැඩ කරන හොඳම audio stream URL එක තෝරා ගැනීම
        const bestAudio = data.audioStreams.find(s => s.url) || data.audioStreams[0];

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
