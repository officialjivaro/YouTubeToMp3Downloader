const express = require('express');
const ytdlp = require('yt-dlp-exec');
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

    try {
        const videoInfo = await ytdlp(videoUrl, { dumpSingleJson: true });
        const audioStream = ytdlp(videoUrl, { format: 'bestaudio', output: '-' });

        const fileName = `${uuidv4()}.mp3`;
        const filePath = path.join(downloadsDir, fileName);
        const outputStream = fs.createWriteStream(filePath);

        ffmpeg(audioStream)
            .setFfmpegPath(ffmpegPath)
            .audioBitrate(128)
            .format('mp3')
            .on('end', () => {
                console.log(`Conversion finished: ${filePath}`);
                res.status(200).json({ success: true, downloadUrl: `/downloads/${fileName}` });
            })
            .on('error', (err) => {
                console.error('Error during conversion:', err);
                res.status(500).json({ success: false, message: 'An error occurred during the conversion process' });
            })
            .pipe(outputStream, { end: true });

    } catch (error) {
        console.error('Error processing video URL:', videoUrl, error);
        res.status(500).json({ success: false, message: 'An error occurred while processing the video' });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});

module.exports = app;
