"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const net_1 = __importDefault(require("net"));
const message_js_1 = require("./message.js");
const ERROR_CODES = {
    1: "Data buffer does not contain full message, please wait.",
};
class TorrentPeer {
    ip;
    port;
    standardBlockSize;
    socket;
    fileBuffer;
    tracker;
    constructor({ ip, port, standardBlockSize = 2 ** 14, tracker, }) {
        this.ip = ip;
        this.port = port;
        this.standardBlockSize = standardBlockSize;
        this.tracker = tracker;
        this.socket = undefined;
        this.fileBuffer = Buffer.alloc(0);
    }
    async connect() {
        return new Promise(async (resolve, reject) => {
            this.socket = net_1.default.connect(this.port, this.ip);
            this.socket.on("error", (error) => {
                console.error("Error:", error);
                reject(error);
            });
            await this.sendHandshake();
            resolve("Handshake approved!");
        });
    }
    async sendHandshake() {
        console.log("sending handshake");
        const handshake = Buffer.alloc(68);
        handshake.writeUInt8(19, 0);
        handshake.write("BitTorrent protocol", 1);
        handshake.writeUInt32BE(0, 20);
        handshake.writeUInt32BE(0, 24);
        Buffer.from(this.tracker.infoHashBuffer).copy(handshake, 28);
        Buffer.from(this.tracker.peerId).copy(handshake, 48);
        this.socket?.write(handshake);
        const response = (await this.waitForData());
        const protocolLength = response.readUInt8(0);
        const infohashResponse = response.subarray(protocolLength + 9, protocolLength + 29);
        const peerIdResponse = response.subarray(protocolLength + 29, protocolLength + 49);
        if (infohashResponse.toString("hex") !== this.tracker.infoHash) {
            throw new Error("Infohash mismatch");
        }
        console.log(`Peer ID: ${peerIdResponse.toString("hex")}`);
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
    /**
     * @description This method is used to wait for data and buffer it until we have a full message.
     * Once we have a full message, we return a Message object. From there, further processing can take place.
     */
    waitForDataAndBuffer() {
        return new Promise((resolve) => {
            let buffer = Buffer.alloc(0);
            const onData = (data) => {
                buffer = Buffer.concat([buffer, data]);
                try {
                    const message = (0, message_js_1.toMessage)(buffer);
                    resolve(message);
                    this.socket?.removeListener("data", onData);
                }
                catch (error) {
                    return;
                }
            };
            this.socket?.on("data", onData);
        });
    }
    async getBitField() {
        const message = await this.waitForDataAndBuffer();
        const id = message.id;
        if (id !== 5) {
            throw new Error("Data buffer does not contain bitfield id.");
        }
        return message.payload;
    }
    sendInterested() {
        const message = Buffer.alloc(5);
        message.writeUInt32BE(1, 0);
        message.writeUInt8(2, 4);
        this.sendMessage(message);
    }
    async getUnchoke() {
        const message = await this.waitForDataAndBuffer();
        const id = message.id;
        if (id !== 1) {
            throw new Error("Data buffer does not contain unchock id.");
        }
        return message.payload;
    }
    async getPiece(index) {
        // sends first message
        const message = Buffer.alloc(17);
        message.writeUInt32BE(13, 0);
        message.writeUInt8(6, 4);
        message.writeUInt32BE(index, 5);
        message.writeUInt32BE(0, 9);
        message.writeUInt32BE(16384, 13);
        this.sendMessage(message);
        const pieceLength = index === this.tracker.metadata.lpIndex
            ? this.tracker.metadata.lpLength
            : this.tracker.info["piece length"];
        while (true) {
            const message = await this.waitForDataAndBuffer();
            const id = message.id;
            if (id !== 7) {
                throw new Error("Data buffer does not contain piece message");
            }
            const piece_index = message.payload.readUInt32BE(0);
            const byte_offset = message.payload.readUInt32BE(4);
            const data = message.payload.subarray(8);
            this.fileBuffer = Buffer.concat([this.fileBuffer, data]);
            const blockOffset = byte_offset + this.standardBlockSize;
            const remainingBytesInPiece = pieceLength - blockOffset;
            let blockLength = remainingBytesInPiece < this.standardBlockSize
                ? remainingBytesInPiece
                : this.standardBlockSize;
            if (remainingBytesInPiece > 0) {
                const requestMessage = Buffer.alloc(17);
                requestMessage.writeUInt32BE(13, 0); // length - 9
                requestMessage.writeUInt8(6, 4); // id - 6
                requestMessage.writeUInt32BE(index, 5); // piece index
                requestMessage.writeUInt32BE(blockOffset, 9); // block-offset
                requestMessage.writeUInt32BE(blockLength, 13);
                this.sendMessage(requestMessage);
            }
            else {
                console.log("done!");
                const piece = this.fileBuffer;
                this.fileBuffer = Buffer.alloc(0);
                return piece;
            }
        }
    }
    sendMessage(message) {
        this.socket?.write(message);
    }
    disconnect() {
        this.socket?.end();
    }
}
exports.default = TorrentPeer;
