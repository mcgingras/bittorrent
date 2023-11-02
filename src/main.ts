import fs from "fs";
import process from "process";
import { decodeBufferBencode } from "./decode-buffer.js";
import { getPieceHashes } from "./client.js";
import TorrentPeer from "./peer.js";
import Torrent from "./torrent.js";
import Downloader from "./downloader.js";
import { createOrOpenFile, runByTimeOrThrow } from "./utils.js";

async function main() {
  const command = process.argv[2];

  try {
    if (command === "decode") {
      const rawValue = process.argv[3];
      var buf = Buffer.from(rawValue, "utf8");
      console.log(JSON.stringify(decodeBufferBencode(buf)));
    } else if (command === "info") {
      const tracker = new Torrent(process.argv[3]);
      console.log(`Tracker URL: ${tracker.announce}`);
      console.log(`Length: ${tracker.info.length}`);
      console.log(`Info Hash: ${tracker.infoHash}`);
      console.log(`Piece Length: ${tracker.info["piece length"]}`);
      const hashes = getPieceHashes(tracker.info);
      console.log(`Piece Hashes:`);
      hashes.forEach((hash: string) => {
        console.log(hash);
      });
    } else if (command === "peers") {
      const tracker = new Torrent(process.argv[3]);
      const peers = await tracker.getPeers();

      if (!peers) {
        throw new Error("No peers found!");
      }

      peers.forEach((hash: string) => {
        console.log(hash);
      });
    } else if (command === "handshake") {
      const tracker = new Torrent(process.argv[3]);
      const peer = process.argv[4];
      const [ip, port] = peer.split(":");

      const torrentPeer = new TorrentPeer({
        ip: ip,
        port: parseInt(port),
        tracker,
      });

      await torrentPeer.connect();
      torrentPeer.disconnect();
    } else if (command === "download_piece") {
      async function downloadPiece() {
        try {
          const outputFilePath = process.argv[4];
          const tracker = new Torrent(process.argv[5]);
          const pieceIndex = parseInt(process.argv[6]);

          const peers = await tracker.getPeers();

          if (!peers) {
            throw new Error("No peers found!");
          }

          console.log("we have " + peers.length + " peers");

          for (const peer of peers) {
            const [ip, port] = peer.split(":");
            const torrentPeer = new TorrentPeer({
              ip: ip,
              port: parseInt(port),
              tracker,
            });
            try {
              await runByTimeOrThrow(() => torrentPeer.connect(), 5000);
              await runByTimeOrThrow(() => torrentPeer.getBitField(), 5000);
              await runByTimeOrThrow(() => torrentPeer.sendInterested(), 5000);
              await runByTimeOrThrow(() => torrentPeer.getUnchoke(), 5000);
              const piece = await torrentPeer.getPiece(pieceIndex);
              await createOrOpenFile(outputFilePath);
              fs.writeFileSync(outputFilePath, piece);
              torrentPeer.disconnect();
              console.log(
                `Piece ${pieceIndex} downloaded to ${outputFilePath}.`
              );
              return;
            } catch (e) {
              console.log(e);
              console.error(`Error with peer...`);
              torrentPeer.disconnect();
            }
          }
        } catch (e) {
          console.error(`Error downloading piece... exhaused all peers.`);
        }
      }
      await downloadPiece();
    } else if (command === "download") {
      const outputFilePath = process.argv[4];
      const tracker = new Torrent(process.argv[5]);
      const peers = await tracker.getPeers();

      if (!peers) {
        throw new Error("No peers found!");
      }
      const downloader = new Downloader(tracker, peers, outputFilePath);
      await downloader.download();
    } else {
      throw new Error(`Unknown command ${command}`);
    }
  } catch (e) {
    console.log(e);
  }
}

main();
