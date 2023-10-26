const fs = require("fs");
const net = require("net");
const { sha1 } = require("./utils.js");

class TorrentPeer {
  constructor({
    peerAddress,
    peerPort,
    pieceLength,
    pieceIndex,
    pieceHashes,
    infoHash,
    peerId,
    outputFilePath = "",
    standardBlockSize = 2 ** 14,
  }) {
    this.peerAddress = peerAddress;
    this.peerPort = peerPort;
    this.infoHash = infoHash;
    this.peerId = peerId;
    this.pieceLength = pieceLength;
    this.pieceIndex = pieceIndex;
    this.pieceHashes = pieceHashes;
    this.outputFilePath = outputFilePath;
    this.standardBlockSize = standardBlockSize;
    this.socket = null;
    this.buffer = Buffer.alloc(0);
  }

  async connect() {
    this.socket = net.connect(this.peerPort, this.peerAddress);
    this.socket.on("data", this.handleData.bind(this));
    this.socket.on("error", this.handleError.bind(this));
    await this.sendHandshake();
  }

  async sendHandshake() {
    const handshake = Buffer.alloc(68);
    handshake.writeUInt8(19, 0);
    handshake.write("BitTorrent protocol", 1);
    handshake.writeUInt32BE(0, 20);
    handshake.writeUInt32BE(0, 24);
    this.infoHash.copy(handshake, 28);
    Buffer.from(this.peerId, "ascii").copy(handshake, 48);
    this.socket.write(handshake);

    const response = await this.waitForData();
    const protocolLength = response.readUInt8(0);
    const infohashResponse = response.slice(
      protocolLength + 9,
      protocolLength + 29
    );
    const peerIdResponse = response.slice(
      protocolLength + 29,
      protocolLength + 49
    );

    if (infohashResponse.toString("hex") !== this.infoHash.toString("hex")) {
      throw new Error("Infohash mismatch");
    }

    console.log(`Peer ID: ${peerIdResponse.toString("hex")}`);
    this.buffer = Buffer.alloc(0);
  }

  waitForData() {
    return new Promise((resolve) => {
      const onData = (data) => {
        this.socket.removeListener("data", onData);
        resolve(data);
      };
      this.socket.on("data", onData);
    });
  }

  handleData(data) {
    this.buffer = Buffer.concat([this.buffer, data]);

    while (this.buffer.length > 4) {
      const messageLength = this.buffer.readUInt32BE(0);
      if (this.buffer.length >= messageLength + 4) {
        const id = this.buffer.readUInt8(4);
        this.handleRequest(id, messageLength);
        this.buffer = this.buffer.subarray(messageLength + 5);
      } else {
        break;
      }
    }
  }

  handleRequest(id, length) {
    if (id === 5) {
      // bitfield
      const message = Buffer.alloc(5);
      message.writeUInt32BE(1, 0);
      message.writeUInt8(2, 4);
      this.sendMessage(message);
    }
    if (id === 1) {
      const message = Buffer.alloc(17);
      message.writeUInt32BE(13, 0);
      message.writeUInt8(6, 4);
      message.writeUInt32BE(this.pieceIndex, 5);
      message.writeUInt32BE(0, 9);
      message.writeUInt32BE(16384, 13);
      this.sendMessage(message);
    }
    if (id === 7) {
      // piece
      const incoming_piece_length = this.buffer.readUInt32BE(0);
      const incoming_piece_index = this.buffer.readUInt32BE(5);
      const incoming_block_offset = this.buffer.readUInt32BE(9);
      const incoming_data = this.buffer.subarray(13);
      // have to remember to clear this out
      fs.appendFileSync(this.outputFilePath, incoming_data);

      console.log(
        `Downloaded block ${incoming_block_offset} of piece ${incoming_piece_index} with length ${incoming_piece_length}.`
      );

      const blockOffset = incoming_block_offset + this.standardBlockSize;
      const remainingBytesInPiece = this.pieceLength - blockOffset;

      let blockLength;
      if (remainingBytesInPiece < this.standardBlockSize) {
        // This is the last block of the piece and it is smaller than standard block size
        blockLength = remainingBytesInPiece;
      } else {
        blockLength = this.standardBlockSize;
      }

      console.log(
        `after ${incoming_block_offset} we still have ${remainingBytesInPiece} bytes left in the piece`
      );

      if (remainingBytesInPiece > 0) {
        const message = Buffer.alloc(17);
        message.writeUInt32BE(13, 0); // length - 9
        message.writeUInt8(6, 4); // id - 6
        message.writeUInt32BE(this.pieceIndex, 5); // piece index
        message.writeUInt32BE(blockOffset, 9); // block-offset
        message.writeUInt32BE(blockLength, 13);
        this.sendMessage(message);
      } else {
        this.processCompletion();
      }
    }
  }

  processCompletion() {
    // console.log(
    //   `Piece ${this.pieceIndex} downloaded to ${this.outputFilePath}.`
    // );
    // check if hashes match
    console.log(
      `Hash of piece ${this.pieceIndex} is ${
        this.pieceHashes[this.pieceIndex]
      }.`
    );
    console.log(
      "Hash of file is " + sha1(fs.readFileSync(this.outputFilePath))
    );
    this.disconnect();
  }

  handleError(error) {
    console.error("Error:", error);
  }

  sendMessage(message) {
    this.socket.write(message);
  }

  disconnect() {
    this.socket.end();
  }
}

module.exports = { TorrentPeer };
