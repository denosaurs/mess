export interface EncoderDecoder {
  contentEncoding?: string;
  encode(data: Uint8Array): Uint8Array;
  decode(data: Uint8Array): Uint8Array;
}
