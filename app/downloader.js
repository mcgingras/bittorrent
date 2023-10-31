"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const peer_1 = __importDefault(require("./peer"));
const utils_js_1 = require("./utils.js");
const TIME_TO_WAIT = 1000;
/**
 * Class for managing the download of a file for a particular torrent.
 */
class Downloader {
    tracker;
    peers;
    outputFilePath;
    fileBuffer;
    workQueue;
    constructor(tracker, peers, outputFilePath) {
        this.tracker = tracker;
        this.peers = peers;
        this.outputFilePath = outputFilePath;
        this.fileBuffer = Buffer.alloc(this.tracker.info.length);
        this.workQueue = Array.from({ length: tracker.metadata.lpIndex + 1 }, (_, i) => i);
    }
    async download() {
        const workers = this.peers.map((peer) => this.#startDownloadWorker(peer));
        await Promise.allSettled(workers);
        fs_1.default.writeFileSync(this.outputFilePath, this.fileBuffer);
        console.log("Download complete!");
    }
    async #startDownloadWorker(peerString) {
        const peer = new peer_1.default({
            ip: peerString.split(":")[0],
            port: parseInt(peerString.split(":")[1]),
            tracker: this.tracker,
        });
        // while there are remaining work items in the queue
        // attempt to download the next piece. If it fails for any reason
        // add it back the the queue, and retry with a new piece.
        while (this.workQueue.length > 0) {
            const pieceIndex = this.workQueue.pop();
            try {
                await this.#workerAttempt(peer, pieceIndex);
            }
            catch (_error) {
                this.workQueue.push(pieceIndex);
            }
        }
    }
    async #workerAttempt(peer, pieceIndex) {
        try {
            await (0, utils_js_1.runByTimeOrThrow)(() => peer.connect(), TIME_TO_WAIT);
            await (0, utils_js_1.runByTimeOrThrow)(() => peer.getBitField(), TIME_TO_WAIT);
            await (0, utils_js_1.runByTimeOrThrow)(() => peer.sendInterested(), TIME_TO_WAIT);
            await (0, utils_js_1.runByTimeOrThrow)(() => peer.getUnchoke(), TIME_TO_WAIT);
            // const piece = await runByTimeOrThrow(
            //   () => peer.getPiece(pieceIndex),
            //   TIME_TO_WAIT
            // );
            const piece = await peer.getPiece(pieceIndex);
            // could compare to hash here to make sure it's valid...
            if (!piece) {
                return;
            }
            // this.fileBuffer = Buffer.concat([this.fileBuffer, piece]);
            const offset = pieceIndex * this.tracker.info["piece length"];
            piece.copy(this.fileBuffer, offset);
            peer.disconnect();
            return;
        }
        catch (error) {
            peer.disconnect();
            throw error;
        }
    }
}
exports.default = Downloader;
