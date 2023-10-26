const fs = require("fs");
const process = require("process");
const { sha1, sha1Buffer } = require("./utils.js");
const { bencodeToBuffer } = require("./encode-buffer.js");
const { decodeBufferBencode } = require("./decode-buffer.js");
const { getPeers, getDataFromPath, getPieceHashes } = require("./client.js");
const { TorrentPeer } = require("./handshake.js");

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
      const hashes = getPieceHashes(value.info);
      console.log(`Piece Hashes:`);
      hashes.forEach((hash) => {
        console.log(hash);
      });
    } else if (command === "peers") {
      const filePath = process.argv[3];
      const peers = await getPeers(filePath);

      peers.forEach((hash) => {
        console.log(hash);
      });
    } else if (command === "handshake") {
      const filePath = process.argv[3];
      const peer = process.argv[4];
      const value = getDataFromPath(filePath);
      const [ip, port] = peer.split(":");
      const peerId = Buffer.from("00112233445566778899", "hex");
      const infoHash = sha1Buffer(bencodeToBuffer(value.info));
      const torrentPeer = new TorrentPeer({
        peerAddress: ip,
        peerPort: port,
        infoHash,
        peerId,
      });

      torrentPeer.connect();
    } else if (command === "download_piece") {
      const outputFilePath = process.argv[4];
      const torrentFilePath = process.argv[5];
      const pieceIndex = parseInt(process.argv[6]);

      const value = getDataFromPath(torrentFilePath);
      const peers = await getPeers(torrentFilePath);
      const peer = peers[0];
      const [ip, port] = peer.split(":");
      const infoHash = sha1Buffer(bencodeToBuffer(value.info));
      const peerId = Buffer.from("00112233445566778899", "hex");

      const totalLength = value.info.length;
      const pieceLength = value.info["piece length"];
      const lastPiece = Math.floor(totalLength / pieceLength); // since 0 indexed
      const lastPieceLength = totalLength % pieceLength;

      const torrentPeer = new TorrentPeer({
        peerAddress: ip,
        peerPort: port,
        pieceHashes: getPieceHashes(value.info),
        pieceLength: pieceIndex === lastPiece ? lastPieceLength : pieceLength,
        pieceIndex,
        outputFilePath,
        infoHash,
        peerId,
      });

      torrentPeer
        .connect()
        .then(async () => {
          // const response = await torrentPeer.waitForData();
          // console.log("response!!", response);
          // const responseId = unchock.readUInt8(4);
          // console.log(responseId);
        })
        .catch((error) => {
          console.error("Failed to connect:", error);
        });
    } else {
      throw new Error(`Unknown command ${command}`);
    }
  } catch (e) {
    console.log(e);
  }
}

main();
