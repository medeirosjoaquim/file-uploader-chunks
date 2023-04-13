
const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { pipeline } = require('stream').promises;

// Configure multer storage
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Create the Express app
const app = express();

// Enable CORS
app.use(cors());

// Set up the upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  if (!req.file) {
    return res.status(400).json({ error: 'No file was uploaded' });
  }

  const { chunkIndex, totalChunks, uuid } = req.body;
  const chunkFolder = path.join('./uploads', uuid + req.file.originalname);
  const chunkFilename = `${chunkIndex}.part`;
  const chunkFilePath = path.join(chunkFolder, chunkFilename);
  if (!fs.existsSync(chunkFolder)) {
    fs.mkdirSync(chunkFolder, { recursive: true });
  }

  fs.writeFileSync(chunkFilePath, req.file.buffer);

  if (parseInt(chunkIndex, 10) === parseInt(totalChunks, 10) - 1) {
    const outputFile = path.join('uploads', `${req.file.originalname}.complete`);
    const writeStream = fs.createWriteStream(outputFile);

    const onFinish = new Promise((resolve) => {
      writeStream.on('finish', () => {
        fs.rmSync(chunkFolder, { recursive: true, force: true });

        res.status(200).json({ message: 'File uploaded and reassembled successfully' });
        resolve();
      });
    });

    try {
      for (let i = 0; i < totalChunks; i++) {
        const currentChunkFile = path.join(chunkFolder, `${i}.part`);
        const readStream = fs.createReadStream(currentChunkFile);
        await pipeline(readStream, writeStream);
        fs.unlinkSync(currentChunkFile);
      }
      writeStream.end();
      await onFinish;
    } catch (error) {
      res.status(500).json({ error: 'Error reassembling the file' });
      console.log(error)
      // res.end();
    } finally {
      if (!writeStream.destroyed) {
        writeStream.end();
      }
    }
  } else {
    res.status(200).json({ message: 'Chunk uploaded successfully' });
    // res.end();
  }
});
// Start the server
const port = process.env.PORT || 4004;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
