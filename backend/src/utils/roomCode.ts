import { randomInt } from "node:crypto";

const CHARSET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function generateRoomCode(length = 6): string {
  let output = "";
  for (let i = 0; i < length; i += 1) {
    output += CHARSET[randomInt(CHARSET.length)];
  }
  return output;
}
