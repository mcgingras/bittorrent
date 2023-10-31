"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const decode_buffer_1 = require("./decode-buffer");
const encode_buffer_1 = require("./encode-buffer");
const utils_1 = require("./utils");
const parsePeers = (buffer) => {
    if (buffer.length % 6 !== 0) {
        throw new Error("Invalid peer list buffer length");
    }
    const peers = [];
    for (let i = 0; i < buffer.length; i += 6) {
        const ip = `${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.${buffer[i + 3]}`;
        const port = buffer.readUInt16BE(i + 4);
        peers.push(`${ip}:${port}`);
    }
    return peers;
};
const buildUrlQueryString = (params) => {
    const keys = Object.keys(params);
    const queryString = keys.map((key) => `${key}=${params[key]}`).join("&");
    return queryString;
};
// assumes that all trackers are http, not udp, despite udp being more common in "real world"
class Torrent {
    url;
    announce;
    info;
    metadata;
    infoHash;
    infoHashBuffer;
    urlEncodedInfoHash;
    peerId;
    peers;
    constructor(url) {
        this.url = url;
        const torrentContent = (0, decode_buffer_1.decodeBufferBencode)(fs_1.default.readFileSync(url));
        this.announce = torrentContent.announce;
        this.info = torrentContent.info;
        this.metadata = {
            lpIndex: Math.ceil(this.info.length / this.info["piece length"]) - 1,
            lpLength: this.info.length % this.info["piece length"],
        };
        this.infoHash = (0, utils_1.sha1)((0, encode_buffer_1.bencodeToBuffer)(this.info));
        this.infoHashBuffer = (0, utils_1.sha1Buffer)((0, encode_buffer_1.bencodeToBuffer)(this.info));
        this.urlEncodedInfoHash = (0, utils_1.sha1URL)((0, encode_buffer_1.bencodeToBuffer)(this.info));
        this.peerId = Buffer.from("00112233445566778899", "hex");
        this.peers = [];
    }
    /**
     * @description get peers from tracker
     * @returns {Promise<bool>}
     * @note
     * const response = await fetch(url);
     * requires node > 18.18.0 (unsure on actual version)
     * also not sure if it returns buffer (returns Response)
     */
    async getPeers() {
        const params = {
            peer_id: 11112233445566778899,
            port: 6881,
            uploaded: 0,
            downloaded: 0,
            info_hash: this.urlEncodedInfoHash,
            left: this.info.length,
            compact: 1,
        };
        const queryString = buildUrlQueryString(params);
        const response = await (0, utils_1.request)(`${this.announce}?${queryString}`);
        const peerValues = (0, decode_buffer_1.decodeBufferBencode)(response);
        const peers = parsePeers(peerValues.peers);
        this.peers = peers;
        return peers;
    }
}
exports.default = Torrent;
