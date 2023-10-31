"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const process_1 = __importDefault(require("process"));
const decode_buffer_js_1 = require("./decode-buffer.js");
const client_js_1 = require("./client.js");
const peer_js_1 = __importDefault(require("./peer.js"));
const torrent_js_1 = __importDefault(require("./torrent.js"));
const downloader_js_1 = __importDefault(require("./downloader.js"));
const utils_js_1 = require("./utils.js");
async function main() {
    const command = process_1.default.argv[2];
    try {
        if (command === "decode") {
            const rawValue = process_1.default.argv[3];
            var buf = Buffer.from(rawValue, "utf8");
            console.log(JSON.stringify((0, decode_buffer_js_1.decodeBufferBencode)(buf)));
        }
        else if (command === "info") {
            const tracker = new torrent_js_1.default(process_1.default.argv[3]);
            console.log(`Tracker URL: ${tracker.announce}`);
            console.log(`Length: ${tracker.info.length}`);
            console.log(`Info Hash: ${tracker.infoHash}`);
            console.log(`Piece Length: ${tracker.info["piece length"]}`);
            const hashes = (0, client_js_1.getPieceHashes)(tracker.info);
            console.log(`Piece Hashes:`);
            hashes.forEach((hash) => {
                console.log(hash);
            });
        }
        else if (command === "peers") {
            const tracker = new torrent_js_1.default(process_1.default.argv[3]);
            const peers = await tracker.getPeers();
            peers.forEach((hash) => {
                console.log(hash);
            });
        }
        else if (command === "handshake") {
            const tracker = new torrent_js_1.default(process_1.default.argv[3]);
            const peer = process_1.default.argv[4];
            const [ip, port] = peer.split(":");
            const torrentPeer = new peer_js_1.default({
                ip: ip,
                port: parseInt(port),
                tracker,
            });
            await torrentPeer.connect();
            torrentPeer.disconnect();
        }
        else if (command === "download_piece") {
            async function downloadPiece() {
                try {
                    const outputFilePath = process_1.default.argv[4];
                    const tracker = new torrent_js_1.default(process_1.default.argv[5]);
                    const pieceIndex = parseInt(process_1.default.argv[6]);
                    const peers = await tracker.getPeers();
                    console.log("we have " + peers.length + " peers");
                    for (const peer of peers) {
                        const [ip, port] = peer.split(":");
                        const torrentPeer = new peer_js_1.default({
                            ip: ip,
                            port: parseInt(port),
                            tracker,
                        });
                        try {
                            await (0, utils_js_1.runByTimeOrThrow)(() => torrentPeer.connect(), 500);
                            await (0, utils_js_1.runByTimeOrThrow)(() => torrentPeer.getBitField(), 500);
                            await (0, utils_js_1.runByTimeOrThrow)(() => torrentPeer.sendInterested(), 500);
                            await (0, utils_js_1.runByTimeOrThrow)(() => torrentPeer.getUnchoke(), 500);
                            const piece = await torrentPeer.getPiece(pieceIndex);
                            console.log("about the write to the file!");
                            await (0, utils_js_1.createOrOpenFile)(outputFilePath);
                            fs_1.default.writeFileSync(outputFilePath, piece);
                            torrentPeer.disconnect();
                            console.log(`Piece ${pieceIndex} downloaded to ${outputFilePath}.`);
                            return;
                        }
                        catch (e) {
                            console.error(`Error with peer...`);
                            torrentPeer.disconnect();
                        }
                    }
                }
                catch (e) {
                    console.error(`Error downloading piece... exhaused all peers.`);
                }
            }
            await downloadPiece();
        }
        else if (command === "download") {
            const outputFilePath = process_1.default.argv[4];
            const tracker = new torrent_js_1.default(process_1.default.argv[5]);
            const peers = await tracker.getPeers();
            const downloader = new downloader_js_1.default(tracker, peers, outputFilePath);
            await downloader.download();
        }
        else {
            throw new Error(`Unknown command ${command}`);
        }
    }
    catch (e) {
        console.log(e);
    }
}
main();
