import fs from "fs";
import { decodeBufferBencode } from "./decode-buffer.js";
import { Torrent, TorrentInfo } from "./types";

export const getDataFromPath = (filePath: string) => {
  const data = fs.readFileSync(filePath);
  return decodeBufferBencode(data) as Torrent;
};

const splitBuffer = (buffer: Buffer, chunkSize = 20) => {
  const chunks = [];
  for (let i = 0; i < buffer.length; i += chunkSize) {
    const chunk = buffer.slice(i, i + chunkSize);
    chunks.push(chunk.toString("hex"));
  }
  return chunks;
};

export const getPieceHashes = (info: TorrentInfo) => {
  const hashes = splitBuffer(info.pieces);
  return hashes;
};
