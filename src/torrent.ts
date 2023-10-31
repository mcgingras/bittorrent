import fs from "fs";
import { decodeBufferBencode } from "./decode-buffer";
import { bencodeToBuffer } from "./encode-buffer";
import { sha1, sha1URL, sha1Buffer, request } from "./utils";
import { Torrent as TTorrent, TorrentInfo, TorrentMetadata } from "./types";

const parsePeers = (buffer: Buffer) => {
  if (buffer.length % 6 !== 0) {
    throw new Error("Invalid peer list buffer length");
  }

  const peers = [];
  for (let i = 0; i < buffer.length; i += 6) {
    const ip = `${buffer[i]}.${buffer[i + 1]}.${buffer[i + 2]}.${
      buffer[i + 3]
    }`;
    const port = buffer.readUInt16BE(i + 4);
    peers.push(`${ip}:${port}`);
  }

  return peers;
};

const buildUrlQueryString = (params: { [key: string]: string | number }) => {
  const keys = Object.keys(params);
  const queryString = keys.map((key) => `${key}=${params[key]}`).join("&");
  return queryString;
};

// assumes that all trackers are http, not udp, despite udp being more common in "real world"
class Torrent {
  announce: string;
  info: TorrentInfo;
  metadata: TorrentMetadata;
  infoHash: string;
  infoHashBuffer: Buffer;
  urlEncodedInfoHash: string;
  peerId: Buffer;
  peers: string[];

  constructor(public url: string) {
    const torrentContent = decodeBufferBencode(
      fs.readFileSync(url)
    ) as TTorrent;
    this.announce = torrentContent.announce;
    this.info = torrentContent.info;
    this.metadata = {
      lpIndex: Math.ceil(this.info.length / this.info["piece length"]) - 1,
      lpLength: this.info.length % this.info["piece length"],
    };

    this.infoHash = sha1(bencodeToBuffer(this.info));
    this.infoHashBuffer = sha1Buffer(bencodeToBuffer(this.info));
    this.urlEncodedInfoHash = sha1URL(bencodeToBuffer(this.info));
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
    const response = await request(`${this.announce}?${queryString}`);
    const peerValues = decodeBufferBencode(response) as { peers: Buffer };
    const peers = parsePeers(peerValues.peers);
    this.peers = peers;

    return peers;
  }
}

export default Torrent;
