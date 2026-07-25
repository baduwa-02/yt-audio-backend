const express = require('express');
const youtubedl = require('youtube-dl-exec');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// 1. Root Endpoint - සර්වර් එක ක්‍රියාත්මකදැයි පරීක්ෂා කිරීමට
app.get('/', (req, res) => {
    res.json({ 
        status: 'online', 
        message: 'YouTube Audio Extraction API is running successfully!' 
    });
});

// 2. සෙවුම් Endpoint එක (/api/search?q=query)
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
            noCheckCertificates: true,
            geoBypass: true
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
    } catch (error) {
        console.error('Search Error:', error);
        res.status(500).json({ 
            success: false, 
            error: 'Failed to fetch search results',
            details: error.message 
        });
    }
});

// 3. ශ්‍රව්‍ය ධාවන සබැඳිය ලබා දෙන Endpoint එක (/api/stream/:id)
app.get('/api/stream/:id', async (req, res) => {
    const videoId = req.params.id;
    const videoUrl = `https://www.youtube.com/watch?v=${videoId}`;

    try {
        const output = await youtubedl(videoUrl, {
            dumpSingleJson: true,
            noWarnings: true,
            // 1. Audio format එකක් නැතිනම් ස්වයංක්‍රීයව හොඳම Video+Audio format එකකට මාරු වන ලෙස Fallback යෙදීම:
            format: 'bestaudio[ext=m4a]/bestaudio/best',
            // 2. Client එක android ලෙස ලබා දී Bot Detection මඟහැරීම:
            extractorArgs: 'youtube:player_client=android',
            noCheckCertificates: true,
            geoBypass: true
        });

        // 3. Direct URL එක හෝ Formats array එකෙන් Stream URL එක තෝරාගැනීම:
        const streamUrl = output.url || (output.formats && output.formats.length > 0 ? output.formats[0].url : null);

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
        res.status(500).json({ 
            success: false, 
            error: 'Failed to extract audio stream',
            details: error.message 
        });
    }
});

// Server Start
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
