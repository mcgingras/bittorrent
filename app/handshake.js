"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const net_1 = __importDefault(require("net"));
class TorrentPeer {
    ip;
    port;
    infoHash;
    peerId;
    pieceLength;
    pieceIndex;
    pieceHashes;
    file;
    standardBlockSize;
    socket;
    buffer;
    resolve;
    constructor({ ip, port, pieceLength, pieceIndex, pieceHashes, infoHash, peerId, outputFilePath = "output", standardBlockSize = 2 ** 14, }) {
        const file = fs_1.default.openSync(outputFilePath, "w+");
        this.ip = ip;
        this.port = port;
        this.infoHash = infoHash;
        this.peerId = peerId;
        this.pieceLength = pieceLength;
        this.pieceIndex = pieceIndex;
        this.pieceHashes = pieceHashes;
        this.file = file;
        this.standardBlockSize = standardBlockSize;
        this.socket = null;
        this.buffer = Buffer.alloc(0);
        this.resolve = null;
    }
    async connect() {
        return new Promise(async (resolve, reject) => {
            this.resolve = resolve;
            this.socket = net_1.default.connect(this.port, this.ip);
            this.socket.on("data", this.handleData.bind(this));
            this.socket.on("error", (error) => {
                this.handleError(error);
                reject(error);
            });
            await this.sendHandshake();
        });
    }
    async sendHandshake() {
        const handshake = Buffer.alloc(68);
        handshake.writeUInt8(19, 0);
        handshake.write("BitTorrent protocol", 1);
        handshake.writeUInt32BE(0, 20);
        handshake.writeUInt32BE(0, 24);
        this.infoHash.copy(handshake, 28);
        Buffer.from(this.peerId, "ascii").copy(handshake, 48);
        this.socket?.write(handshake);
        const response = (await this.waitForData());
        const protocolLength = response.readUInt8(0);
        const infohashResponse = response.subarray(protocolLength + 9, protocolLength + 29);
        const peerIdResponse = response.subarray(protocolLength + 29, protocolLength + 49);
        if (infohashResponse.toString("hex") !== this.infoHash.toString("hex")) {
            throw new Error("Infohash mismatch");
        }
        console.log(`Peer ID: ${peerIdResponse.toString("hex")}`);
        this.buffer = Buffer.alloc(0);
    }
    waitForData() {
        return new Promise((resolve) => {
            const onData = (data) => {
                this.socket?.removeListener("data", onData);
                resolve(data);
            };
            this.socket?.on("data", onData);
        });
    }
    handleData(data) {
        // could try adding data to buffer here
        // then making async calls to check steps reads from buffer
        this.buffer = Buffer.concat([this.buffer, data]);
        while (this.buffer.length > 4) {
            const messageLength = this.buffer.readUInt32BE(0);
            if (this.buffer.length >= messageLength + 4) {
                const id = this.buffer.readUInt8(4);
                this.handleRequest(id);
                this.buffer = this.buffer.subarray(messageLength + 5);
            }
            else {
                break;
            }
        }
    }
    handleRequest(id) {
        if (id === 5) {
            // bitfield
            console.log("Received bitfield message");
            const message = Buffer.alloc(5);
            message.writeUInt32BE(1, 0);
            message.writeUInt8(2, 4);
            this.sendMessage(message);
        }
        if (id === 1) {
            console.log("Received unchoke message");
            const message = Buffer.alloc(17);
            message.writeUInt32BE(13, 0);
            message.writeUInt8(6, 4);
            message.writeUInt32BE(this.pieceIndex, 5);
            message.writeUInt32BE(0, 9);
            message.writeUInt32BE(16384, 13);
            this.sendMessage(message);
        }
        if (id === 7) {
            console.log("Received piece message");
            const incoming_block_offset = this.buffer.readUInt32BE(9);
            const incoming_data = this.buffer.subarray(13);
            fs_1.default.writeSync(this.file, incoming_data, 0, incoming_data.length, incoming_block_offset);
            const blockOffset = incoming_block_offset + this.standardBlockSize;
            const remainingBytesInPiece = this.pieceLength - blockOffset;
            let blockLength;
            if (remainingBytesInPiece < this.standardBlockSize) {
                // This is the last block of the piece and it is smaller than standard block size
                blockLength = remainingBytesInPiece;
            }
            else {
                blockLength = this.standardBlockSize;
            }
            if (remainingBytesInPiece > 0) {
                const message = Buffer.alloc(17);
                message.writeUInt32BE(13, 0); // length - 9
                message.writeUInt8(6, 4); // id - 6
                message.writeUInt32BE(this.pieceIndex, 5); // piece index
                message.writeUInt32BE(blockOffset, 9); // block-offset
                message.writeUInt32BE(blockLength, 13);
                this.sendMessage(message);
            }
            else {
                this.processCompletion();
            }
        }
    }
    processCompletion() {
        // console.log(
        //   `Hash of piece ${this.pieceIndex} is ${
        //     this.pieceHashes[this.pieceIndex]
        //   }.`
        // );
        // console.log(
        //   "Hash of file is " + sha1(fs.readFileSync(this.outputFilePath))
        // );
        this.resolve?.("Downloaded piece!");
        this.disconnect();
    }
    handleError(error) {
        console.error("Error:", error);
    }
    sendMessage(message) {
        this.socket?.write(message);
    }
    disconnect() {
        this.socket?.end();
    }
}
module.exports = { TorrentPeer };
