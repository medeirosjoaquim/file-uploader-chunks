importScripts("../node_modules/crypto-js/crypto-js.js");
importScripts("../node_modules/crypto-js/sha256.js");
importScripts("../node_modules/crypto-js/enc-hex.js");

async function getLastSuccessfulChunk(hash, fileName) {
  const response = await fetch(`http://localhost:4004/uploaded_chunks/${hash}/${fileName}`);
  if (!response.ok) {
    return 0;
  }
  if (response.status === 404) {
    return 0;
  }
  const lastSuccessfulChunk = await response.json();
  console.log(
    lastSuccessfulChunk.uploadedChunks[lastSuccessfulChunk.uploadedChunks.length - 1]
  )
  return lastSuccessfulChunk.uploadedChunks[lastSuccessfulChunk.uploadedChunks.length - 1];
}

self.addEventListener("message", async (event) => {
  const { file } = event.data;
  const fileBuffer = await file.arrayBuffer();
  const fileHash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(fileBuffer)).toString();

  const chunkSize = 1024 * 1024 * 4; // 4 MB
  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadedChunks = await getLastSuccessfulChunk(fileHash, file.name);
  async function* fileChunkGenerator() {
    for (let i = uploadedChunks; i < totalChunks; i++) {
      console.log(i)
      const start = i * chunkSize;
      const end = start + chunkSize;
      const chunk = file.slice(start, end);
      yield chunk;
    }
  }

  async function onUploadProgress() {
    uploadedChunks++;
    const progress = (uploadedChunks / totalChunks) * 100;
    self.postMessage({ progress });
  }

  for await (const chunk of fileChunkGenerator()) {
    const formData = new FormData();
    formData.append("file", chunk, file.name);
    formData.append("chunkIndex", uploadedChunks);
    formData.append("totalChunks", totalChunks);
    formData.append("hash", fileHash);

    const response = await fetch("http://localhost:4004/upload", {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`);
    }

    await onUploadProgress();
  }

  self.postMessage({ complete: true });
});