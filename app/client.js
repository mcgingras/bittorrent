"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPieceHashes = exports.getDataFromPath = void 0;
const fs_1 = __importDefault(require("fs"));
const decode_buffer_js_1 = require("./decode-buffer.js");
const getDataFromPath = (filePath) => {
    const data = fs_1.default.readFileSync(filePath);
    return (0, decode_buffer_js_1.decodeBufferBencode)(data);
};
exports.getDataFromPath = getDataFromPath;
const splitBuffer = (buffer, chunkSize = 20) => {
    const chunks = [];
    for (let i = 0; i < buffer.length; i += chunkSize) {
        const chunk = buffer.slice(i, i + chunkSize);
        chunks.push(chunk.toString("hex"));
    }
    return chunks;
};
const getPieceHashes = (info) => {
    const hashes = splitBuffer(info.pieces);
    return hashes;
};
exports.getPieceHashes = getPieceHashes;
