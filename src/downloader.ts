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
      const pieceIndex = this.workQueue.pop();
      console.log(`pieceIndex: ${pieceIndex}`);
      if (pieceIndex != undefined) {
        // TODO: check if this peer is able to download the piece via bitfield
        // if not, pop if back in the queue and try again with a new peer
        try {
          await this.#workerAttempt(peer, pieceIndex);
          console.log(
            `Downloaded piece ${pieceIndex} from ${peer.ip}:${peer.port}`
          );
          this.piecesCompleted++;
          continue;
        } catch (error: any) {
          console.log(`Error with peer ${peer.ip}:${peer.port}...`);
          this.workQueue.push(pieceIndex);
          retries++;
          if (error.code === "ECONNREFUSED") {
            console.log(`Peer ${peer.ip}:${peer.port} disconnecting.`);
            console.log("terminating...");
            break;
          }
        }
      } else {
        await new Promise((resolve) => setTimeout(resolve, TIME_TO_WAIT));
      }
    }

    console.log(`Peer ${peer.ip}:${peer.port} disconnecting.`);
  }

  async #workerAttempt(peer: TorrentPeer, pieceIndex: number): Promise<void> {
    try {
      // runWithDeadline?
      await runByTimeOrThrow(() => peer.connect(), TIME_TO_WAIT);
      await runByTimeOrThrow(() => peer.getBitField(), TIME_TO_WAIT);
      await runByTimeOrThrow(() => peer.sendInterested(), TIME_TO_WAIT);
      await runByTimeOrThrow(() => peer.getUnchoke(), TIME_TO_WAIT);

      const piece = await peer.getPiece(pieceIndex);
      // could compare to hash here to make sure it's valid...
      if (!piece) {
        return;
      }
      const offset = pieceIndex * this.tracker.info["piece length"];
      piece.copy(this.fileBuffer, offset);
      peer.disconnect();
      return;
    } catch (error) {
      peer.disconnect();
      // console.log(error);
      throw error;
    }
  }
}
