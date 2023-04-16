importScripts("../node_modules/crypto-js/crypto-js.js")
importScripts("../node_modules/crypto-js/sha256.js")
importScripts("../node_modules/crypto-js/enc-hex.js")

function generateUUID() {
  const randomBytes = crypto.getRandomValues(new Uint8Array(16))
  randomBytes[6] = (randomBytes[6] & 0x0f) | 0x40
  randomBytes[8] = (randomBytes[8] & 0x3f) | 0x80

  const byteToHex = (byte) => byte.toString(16).padStart(2, "0")

  const uuid = Array.from(randomBytes)
    .map((byte, index) => {
      if (index === 4 || index === 6 || index === 8 || index === 10) {
        return "-" + byteToHex(byte)
      }
      return byteToHex(byte)
    })
    .join("")

  return uuid
}

self.addEventListener("message", async (event) => {
  const { file } = event.data
  const fileBuffer = await file.arrayBuffer()
  const fileHash = CryptoJS.SHA256(CryptoJS.enc.Hex.parse(fileBuffer)).toString()
  self.postMessage({ fileHash })

  const uuid = generateUUID()
  const chunkSize = 1024 * 1024 * 4 // 1 MB
  const totalChunks = Math.ceil(file.size / chunkSize)
  let uploadedChunks = 0
  async function* fileChunkGenerator() {
    for (let i = 0; i < totalChunks; i++) {
      const start = i * chunkSize
      const end = start + chunkSize
      const chunk = file.slice(start, end)
      yield chunk
    }
  }

  async function onUploadProgress() {
    uploadedChunks++
    const progress = (uploadedChunks / totalChunks) * 100
    self.postMessage({ progress })
  }

  for await (const chunk of fileChunkGenerator()) {
    const formData = new FormData()
    formData.append("file", chunk, file.name)
    formData.append("chunkIndex", uploadedChunks)
    formData.append("totalChunks", totalChunks)
    formData.append("uuid", uuid)

    const response = await fetch("http://localhost:4004/upload", {
      method: "POST",
      body: formData,
    })

    if (!response.ok) {
      throw new Error(`Upload failed with status ${response.status}`)
    }

    await onUploadProgress()
  }

  self.postMessage({ complete: true })
})
