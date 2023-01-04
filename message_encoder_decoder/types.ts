export interface MessageEncoderDecoder {
  contentEncoding?: string;
  encode(data: Uint8Array): Uint8Array;
  decode(data: Uint8Array): Uint8Array;
}
