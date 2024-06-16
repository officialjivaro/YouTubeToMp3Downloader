const express = require('express');
const ytdl = require('ytdl-core');
const ffmpegPath = require('ffmpeg-static');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());  // Enable CORS

// Ensure the downloads directory exists
const downloadsDir = path.join(__dirname, 'downloads');
if (!fs.existsSync(downloadsDir)) {
    fs.mkdirSync(downloadsDir);
}

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

// Serve the converted files
app.use('/downloads', express.static(path.join(__dirname, 'downloads')));

app.post('/api/convert', async (req, res) => {
    const videoUrl = req.body.url;
    console.log('Received request to convert URL:', videoUrl);

    if (!videoUrl || typeof videoUrl !== 'string') {
        console.error('Invalid request: No URL provided');
        return res.status(400).json({ success: false, message: 'Invalid request: No URL provided' });
    }

    try {
        console.log('Fetching video info...');
        const info = await ytdl.getInfo(videoUrl);
        console.log('Video info fetched:', info);

        console.log('Starting audio stream...');
        const stream = ytdl(videoUrl, { quality: 'highestaudio' });
        const fileName = `${uuidv4()}.mp3`;
        const filePath = path.join(downloadsDir, fileName);
        const outputStream = fs.createWriteStream(filePath);

        ffmpeg(stream)
            .setFfmpegPath(ffmpegPath)
            .audioBitrate(128)
            .format('mp3')
            .on('start', () => {
                console.log(`Starting conversion: ${filePath}`);
            })
            .on('end', () => {
                console.log(`Conversion finished: ${filePath}`);
                res.status(200).json({ success: true, downloadUrl: `/downloads/${fileName}` });
            })
            .on('error', (err) => {
                console.error('Error during conversion:', err.message);
                res.status(500).json({ success: false, message: `An error occurred during the conversion process: ${err.message}` });
            })
            .pipe(outputStream, { end: true });

    } catch (error) {
        console.error('Error processing video URL:', videoUrl, error.message);
        res.status(500).json({ success: false, message: `An error occurred while processing the video: ${error.message}` });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

module.exports = app;
