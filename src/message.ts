const messageIdentifier = {
  0: "choke",
  1: "unchoke",
  2: "interested",
  3: "not interested",
  4: "have",
  5: "bitfield",
  6: "request",
  7: "piece",
  8: "cancel",
};

export class Message {
  id: number;
  payload: Buffer;
  constructor(id: number, payload: Buffer) {
    this.id = id;
    this.payload = payload;
  }

  /**
   * Serialize message to buffer
   * @returns {Buffer}
   */
  serialize() {
    const buffer = Buffer.alloc(5 + this.payload.length);
    buffer.writeUInt32BE(this.payload.length + 1, 0);
    buffer.writeUInt8(this.id, 4);
    this.payload.copy(buffer, 5);
    return buffer;
  }
}

export const toMessage = (buf: Buffer) => {
  if (buf.length > 4) {
    const messageLength = buf.readUInt32BE(0);
    if (buf.length < messageLength + 4) {
      throw new Error("Message buffer is incomplete.");
    }
    const id = buf.readUInt8(4);
    const payload = buf.subarray(5);
    return new Message(id, payload);
  } else {
    throw new Error("Message buffer is too short.");
  }
};
