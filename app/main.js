const fs = require("fs");
const process = require("process");
const { request, sha1, sha1URL, sha1Buffer } = require("./utils.js");
const { bencodeToBuffer } = require("./encode-buffer.js");
const { decodeBufferBencode } = require("./decode-buffer.js");
const { createHandshake } = require("./handshake.js");

const splitBuffer = (buffer, chunkSize = 20) => {
  const chunks = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, i + chunkSize);
    chunks.push(chunk.toString("hex"));
  }
  return chunks;
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

async function main() {
  const command = process.argv[2];

  try {
    if (command === "decode") {
      const rawValue = process.argv[3];
      var buf = Buffer.from(rawValue, "utf8");
      console.log(JSON.stringify(decodeBufferBencode(buf)));
    } else if (command === "info") {
      const filePath = process.argv[3];
      const data = fs.readFileSync(filePath);
      const value = decodeBufferBencode(data);
      const bencodeInfo = bencodeToBuffer(value.info);
      console.log(`Tracker URL: ${value.announce}`);
      console.log(`Length: ${value.info.length}`);
      console.log(`Info Hash: ${sha1(bencodeInfo)}`);
      console.log(`Piece Length: ${value.info["piece length"]}`);
      const hashes = splitBuffer(value.info.pieces);
      console.log(`Piece Hashes:`);
      hashes.forEach((hash) => {
        console.log(hash);
      });
    } else if (command === "peers") {
      const filePath = process.argv[3];
      const data = fs.readFileSync(filePath);
      const value = decodeBufferBencode(data);

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

      peers.forEach((hash) => {
        console.log(hash);
      });
    } else if (command === "handshake") {
      const filePath = process.argv[3];
      const data = fs.readFileSync(filePath);
      const value = decodeBufferBencode(data);

      const peer = process.argv[4];
      const [ip, port] = peer.split(":");
      const peerId = Buffer.from("00112233445566778899", "hex");
      const infoHash = sha1Buffer(bencodeToBuffer(value.info));
      const response = await createHandshake({
        peerAddress: ip,
        peerPort: port,
        infoHash,
        peerId,
      });
      console.log(`Peer ID: ${response}`);
    } else {
      throw new Error(`Unknown command ${command}`);
    }
  } catch (e) {
    console.log(e);
  }
}

main();
