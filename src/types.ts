export type Torrent = {
  announce: string;
  info: TorrentInfo;
  metadata: TorrentMetadata;
  infoHash: string;
  infoHashBuffer: Buffer;
  urlEncodedInfoHash: string;
  peers: string[];
  peerId: Buffer;
};

export type TorrentInfo = {
  length: number;
  name: string;
  "piece length": number;
  pieces: Buffer;
};

export type TorrentMetadata = { lpIndex: number; lpLength: number };
