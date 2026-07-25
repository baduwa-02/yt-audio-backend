const express = require('express');
const youtubedl = require('youtube-dl-exec');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => {
    res.json({ status: 'online', message: 'Secure YouTube Audio Backend is running!' });
});

// 1. සෙවුම් Endpoint එක
app.get('/api/search', async (req, res) => {
    const searchQuery = req.query.q;
    if (!searchQuery) {
        return res.status(400).json({ success: false, error: 'Search query (q) is required' });
    }

    try {
        const output = await youtubedl(`ytsearch10:${searchQuery}`, {
            dumpJson: true,
            defaultSearch: 'ytsearch',
            extractorArgs: 'youtube:player_client=android',
            // IP බ්ලොක් වීම වැළැක්වීමට අමතර පරාමිතීන්
            noCheckCertificates: true,
            geoBypass: true,
            preferFreeFormats: true
        });

        const lines = output.trim().split('\n');
        const results = lines.map(line => {
            try {
                const data = JSON.parse(line);
                return {
                    id: data.id,
                    title: data.title,
                    duration: data.duration_string || data.duration,
                    thumbnail: data.thumbnail,
                    uploader: data.uploader
                };
            } catch (err) {
                return null;
            }
        }).filter(item => item !== null);

        res.json({ success: true, data: results });
    }CATCH (error) {
        console.error('Search Error:', error);
        res.status(500).json({ success: false, error: 'Failed to fetch search results' });
    }
});

// 2. ශ්‍රව්‍ය ධාවන සබැඳිය ලබා දෙන Endpoint එක
app.get('/api/stream/:id', async (req, res) => {
    const videoId = req.params.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        const output = await youtubedl(videoUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            format: 'bestaudio',
            // Bot Detection මඟහරවා ගැනීමට ප්‍රධාන ක්‍රමවේදයන්:
            extractorArgs: 'youtube:player_client=android,web',
            noCheckCertificates: true,
            geoBypass: true,
            // ඔබගේ ගිණුමේ cookies ගොනුවක් (cookies.txt) Railway වෙත ලබා දෙන්නේ නම් පහත පේළිය සක්‍රීය කරන්න:
            // cookies: './cookies.txt'
        });

        const streamUrl = output.url;

        if (!streamUrl) {
            return res.status(404).json({ success: false, error: 'Stream URL not found' });
        }

        res.json({
            success: true,
            id: output.id,
            title: output.title,
            duration: output.duration,
            thumbnail: output.thumbnail,
            streamUrl: streamUrl
        });
    } catch (error) {
        console.error('Stream Extraction Error:', error);
        res.status(500).json({ success: false, error: 'Failed to extract audio stream due to bot detection' });
    }
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
