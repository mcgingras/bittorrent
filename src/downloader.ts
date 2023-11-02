import fs from "fs";
import TorrentPeer from "./peer";
import { Torrent as TTorrent } from "./types";
import { runByTimeOrThrow } from "./utils.js";

const TIME_TO_WAIT = 5000;
const MAX_RETIRES = 5;

/**
 * Class for managing the download of a file for a particular torrent.
 */
export default class Downloader {
  tracker: TTorrent;
  peers: string[];
  outputFilePath: string;
  fileBuffer: Buffer;
  workQueue: number[];
  piecesCompleted: number;

  constructor(tracker: TTorrent, peers: string[], outputFilePath: string) {
    this.tracker = tracker;
    this.peers = peers;
    this.outputFilePath = outputFilePath;
    this.fileBuffer = Buffer.alloc(this.tracker.info.length);
    this.workQueue = Array.from(
      { length: tracker.metadata.lpIndex + 1 },
      (_, i) => i
    );
    this.piecesCompleted = 0;
  }

  async download() {
    console.log(`starting from ${this.peers.length} peers`);
    console.log(`downloading ${this.tracker.metadata.lpIndex + 1} pieces.`);
    const workers = this.peers.map((peer) => this.#startDownloadWorker(peer));
    await Promise.allSettled(workers);
    fs.writeFileSync(this.outputFilePath, this.fileBuffer, "binary");
    console.log("Download complete!");
    return;
  }

  async #startDownloadWorker(peerString: string) {
    const peer = new TorrentPeer({
      ip: peerString.split(":")[0],
      port: parseInt(peerString.split(":")[1]),
      tracker: this.tracker,
    });

    let retries = 0;

    while (
      retries < MAX_RETIRES &&
      this.piecesCompleted < this.tracker.metadata.lpIndex + 1
    ) {
      console.log(
        `${peer.ip}:${peer.port} attempting to download... ${this.workQueue.length} pieces remaining`
      );

      try {
        await this.#workerAttempt(peer);
        this.piecesCompleted++;
        continue;
      } catch (error: any) {
        console.log(`Error with peer ${peer.ip}:${peer.port}...`);
        retries++;
        if (error.code === "ECONNREFUSED") {
          console.log(`Peer ${peer.ip}:${peer.port} disconnecting.`);
          console.log("terminating...");
          break;
        }
      }
    }

    console.log(`Peer ${peer.ip}:${peer.port} disconnecting.`);
  }

  async #workerAttempt(peer: TorrentPeer): Promise<void> {
    let pieceIndex: number | undefined;
    try {
      // runWithDeadline?
      await runByTimeOrThrow(() => peer.connect(), TIME_TO_WAIT);
      await runByTimeOrThrow(() => peer.getBitField(), TIME_TO_WAIT);
      await runByTimeOrThrow(() => peer.sendInterested(), TIME_TO_WAIT);
      await runByTimeOrThrow(() => peer.getUnchoke(), TIME_TO_WAIT);

      while (this.workQueue.length > 0) {
        pieceIndex = this.workQueue.pop() as number;
        // TODO: checkbitfield to see if we have this piece
        const piece = await peer.getPiece(pieceIndex);
        // could compare to hash here to make sure it's valid...
        if (!piece) {
          this.workQueue.push(pieceIndex);
          return;
        }
        console.log(`Downloaded piece ${pieceIndex}`);
        const offset = pieceIndex * this.tracker.info["piece length"];
        piece.copy(this.fileBuffer, offset);
      }
      peer.disconnect();
      return;
    } catch (error) {
      if (pieceIndex) {
        this.workQueue.push(pieceIndex);
      }
      peer.disconnect();
      throw error;
    }
  }
}
