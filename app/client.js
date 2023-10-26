const fs = require("fs");
const { request, sha1URL } = require("./utils.js");
const { bencodeToBuffer } = require("./encode-buffer.js");
const { decodeBufferBencode } = require("./decode-buffer.js");

const getDataFromPath = (filePath) => {
  const data = fs.readFileSync(filePath);
  return decodeBufferBencode(data);
};

function parsePeers(buffer) {
  if (buffer.length % 6 !== 0) {
    throw new Error("Invalid peer list buffer length");
  }

  const peers = [];
  for (let i = 0; i < buffer.length; i += 6) {
    const ip = `${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.${
      buffer[i + 3]
    }`;
    const port = buffer.readUInt16BE(i + 4);
    peers.push(`${ip}:${port}`);
  }

  return peers;
}

const getPeers = async (filePath) => {
  const value = getDataFromPath(filePath);

  const trackerURL = value.announce;
  const info_hash = sha1URL(bencodeToBuffer(value.info));
  const peer_id = 11112233445566778899;
  const port = 6881;
  const uploaded = 0;
  const downloaded = 0;
  const left = value.info.length;
  const compact = 1;

  const url = `${trackerURL}?info_hash=${info_hash}&peer_id=${peer_id}&port=${port}&uploaded=${uploaded}&downloaded=${downloaded}&left=${left}&compact=${compact}`;
  const response = await request(url);
  const peerValues = decodeBufferBencode(response);
  const peers = parsePeers(peerValues.peers);

  return peers;
};

const splitBuffer = (buffer, chunkSize = 20) => {
  const chunks = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, i + chunkSize);
    chunks.push(chunk.toString("hex"));
  }
  return chunks;
};

const getPieceHashes = (info) => {
  const hashes = splitBuffer(info.pieces);
  return hashes;
};

module.exports = { getDataFromPath, getPeers, getPieceHashes };
