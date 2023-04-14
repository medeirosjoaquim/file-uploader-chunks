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
  const chunkFolder = path.resolve('./uploads', uuid + req.file.originalname);
  const chunkFilename = `${uuid}_${chunkIndex}.part`;
  const chunkFilePath = path.resolve(chunkFolder, chunkFilename);
  if (!fs.existsSync(chunkFolder)) {
    fs.mkdirSync(chunkFolder, { recursive: true });
  }

  fs.writeFileSync(chunkFilePath, req.file.buffer);

  if (parseInt(chunkIndex, 10) === parseInt(totalChunks, 10) - 1) {

    const outputFile = path.resolve('uploads', `${req.file.originalname}`);
    const writeStream = fs.createWriteStream(outputFile);

    const onFinish = new Promise((resolve) => {
      writeStream.on('finish', () => {
        resolve(true);
      });
    });

    const filesToDelete = [];

    try {
      for (let i = 0; i < totalChunks; i++) {
        const currentChunkFile = path.resolve(chunkFolder, `${uuid}_${i}.part`);
        if (fs.existsSync(currentChunkFile)) {
          const readStream = fs.createReadStream(currentChunkFile);
          await pipeline(readStream, writeStream, { end: false });
          filesToDelete.push(currentChunkFile);
        }
      }
      writeStream.end();
      const isFinished = await onFinish;
      if (isFinished) {
        filesToDelete.forEach((file) => {
          if (fs.existsSync(file)) {
            fs.unlinkSync(file);
          }
        });
        fs.rmSync(chunkFolder, { recursive: true, force: true });
        res.status(200).json({ message: 'File uploaded and reassembled successfully' });
      } else {
        console.log('Error reassembling the file')
        res.status(500).json({ error: 'Error reassembling the file' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Error reassembling the file' });
      console.log(error);
    } finally {
      if (!writeStream.destroyed) {
        writeStream.end();
      }
    }
  } else {
    res.status(200).json({ message: 'Chunk uploaded successfully' });
  }
});

// Start the server
const port = process.env.PORT || 4004;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});