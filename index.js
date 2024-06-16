const express = require('express');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const cors = require('cors');
const app = express();

app.use(express.json());
app.use(cors());  // Enable CORS

// Serve static files from the 'public' directory
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/convert', async (req, res) => {
    const videoUrl = req.body.url;

    if (!ytdl.validateURL(videoUrl)) {
        console.log('Invalid YouTube URL:', videoUrl);
        return res.status(400).json({ success: false, message: 'Invalid YouTube URL' });
    }

    try {
        const info = await ytdl.getInfo(videoUrl);
        const stream = ytdl.downloadFromInfo(info, { quality: 'highestaudio' });
        const filePath = path.join(__dirname, `${uuidv4()}.mp3`);
        const outputStream = fs.createWriteStream(filePath);

        ffmpeg(stream)
            .audioBitrate(128)
            .format('mp3')
            .on('end', () => {
                res.download(filePath, `${info.videoDetails.title}.mp3`, (err) => {
                    if (err) {
                        console.error('Error sending file:', err);
                        res.status(500).json({ success: false, message: 'Error sending file' });
                    } else {
                        fs.unlink(filePath, (err) => {
                            if (err) {
                                console.error('Error deleting file:', err);
                            }
                        });
                    }
                });
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
