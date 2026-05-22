// Cognito SRP implementation using RFC 3526 Group 15 (3072-bit)
// Reference: amazon-cognito-identity-js AuthenticationHelper

const N_HEX =
  "FFFFFFFFFFFFFFFFC90FDAA22168C234C4C6628B80DC1CD1" +
  "29024E088A67CC74020BBEA63B139B22514A08798E3404DD" +
  "EF9519B3CD3A431B302B0A6DF25F14374FE1356D6D51C245" +
  "E485B576625E7EC6F44C42E9A637ED6B0BFF5CB6F406B7ED" +
  "EE386BFB5A899FA5AE9F24117C4B1FE649286651ECE45B3D" +
  "C2007CB8A163BF0598DA48361C55D39A69163FA8FD24CF5F" +
  "83655D23DCA3AD961C62F356208552BB9ED529077096966D" +
  "670C354E4ABC9804F1746C08CA18217C32905E462E36CE3B" +
  "E39E772C180E86039B2783A2EC07A28FB5C55DF06F4C52C9" +
  "DE2BCBF6955817183995497CEA956AE515D2261898FA0510" +
  "15728E5A8AAAC42DAD33170D04507A33A85521ABDF1CBA64" +
  "ECFB850458DBEF0A8AEA71575D060C7DB3970F85A6E1E4C7" +
  "ABF5AE8CDB0933D71E8C94E04A25619DCEE3D2261AD2EE6B" +
  "F12FFA06D98A0864D87602733EC86A64521F2B18177B200C" +
  "BBE117577A615D6C770988C0BAD946E208E24FA074E5AB31" +
  "43DB5BFCE0FD108E4B82D120A93AD2CAFFFFFFFFFFFFFFFF";

const N = BigInt("0x" + N_HEX);
const G = BigInt(2);

function hexToBytes(hex: string): Uint8Array {
  const len = hex.length / 2;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
  }
  return bytes;
}

function bytesToHex(bytes: Uint8Array): string {
  let hex = "";
  for (const b of bytes) {
    hex += b.toString(16).padStart(2, "0");
  }
  return hex;
}

function bytesToBigInt(bytes: Uint8Array): bigint {
  return BigInt("0x" + bytesToHex(bytes));
}

// Minimal positive two's-complement representation with '00' prefix if high bit set
function padHex(n: bigint): string {
  let hex = n.toString(16);
  if (hex.length % 2 !== 0) hex = "0" + hex;
  if (parseInt(hex[0]!, 16) >= 8) hex = "00" + hex;
  return hex;
}

function toArrayBuffer(data: Uint8Array): ArrayBuffer {
  return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) as ArrayBuffer;
}

async function sha256(data: Uint8Array): Promise<Uint8Array> {
  const buf = await globalThis.crypto.subtle.digest("SHA-256", toArrayBuffer(data));
  return new Uint8Array(buf);
}

async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const k = await globalThis.crypto.subtle.importKey(
    "raw",
    toArrayBuffer(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await globalThis.crypto.subtle.sign("HMAC", k, toArrayBuffer(data));
  return new Uint8Array(sig);
}

// k = SHA256(N_bytes || 0x02)  (g=2 as single byte, matching reference impl)
let _k: bigint | null = null;
async function getK(): Promise<bigint> {
  if (_k !== null) return _k;
  const data = hexToBytes(N_HEX + "02");
  _k = bytesToBigInt(await sha256(data));
  return _k;
}

function modPow(base: bigint, exp: bigint, mod: bigint): bigint {
  let result = 1n;
  let b = base % mod;
  let e = exp;
  while (e > 0n) {
    if (e % 2n === 1n) result = (result * b) % mod;
    e >>= 1n;
    b = (b * b) % mod;
  }
  return result;
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatCognitoTimestamp(date: Date): string {
  const pad2 = (n: number) => n.toString().padStart(2, "0");
  return [
    DAYS[date.getUTCDay()],
    MONTHS[date.getUTCMonth()],
    date.getUTCDate(),
    `${pad2(date.getUTCHours())}:${pad2(date.getUTCMinutes())}:${pad2(date.getUTCSeconds())}`,
    "UTC",
    date.getUTCFullYear(),
  ].join(" ");
}

function base64Decode(b64: string): Uint8Array {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function base64Encode(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) {
    binary += String.fromCharCode(b);
  }
  return btoa(binary);
}

export interface SrpSession {
  a: bigint;
  A: bigint;
}

export function createSrpSession(): SrpSession {
  const aBytes = new Uint8Array(128);
  globalThis.crypto.getRandomValues(aBytes);
  const a = bytesToBigInt(aBytes) % N;
  const A = modPow(G, a, N);
  return { a, A };
}

export function srpAHex(session: SrpSession): string {
  return session.A.toString(16);
}

export interface SrpVerifyParams {
  session: SrpSession;
  poolName: string;
  username: string;
  password: string;
  srpB: string;
  salt: string;
  secretBlock: string;
}

export interface SrpVerifyResult {
  USERNAME: string;
  TIMESTAMP: string;
  PASSWORD_CLAIM_SECRET_BLOCK: string;
  PASSWORD_CLAIM_SIGNATURE: string;
}

export async function computeSrpVerification(params: SrpVerifyParams): Promise<SrpVerifyResult> {
  const { session, poolName, username, password, srpB, salt, secretBlock } = params;
  const { a, A } = session;

  const B = BigInt("0x" + srpB);
  if (B % N === 0n) throw new Error("Invalid SRP_B from server");

  // u = SHA256(padHex(A) || padHex(B))
  const u_input = hexToBytes(padHex(A) + padHex(B));
  const u = bytesToBigInt(await sha256(u_input));

  // x = SHA256(padHex(salt) || SHA256(utf8(poolName + username + ':' + password)))
  const inner_hash = await sha256(new TextEncoder().encode(poolName + username + ":" + password));
  const x_input = hexToBytes(padHex(BigInt("0x" + salt)) + bytesToHex(inner_hash));
  const x = bytesToBigInt(await sha256(x_input));

  // S = (B - k*g^x mod N) ^ (a + u*x) mod N
  const k = await getK();
  const kgx = (k * modPow(G, x, N)) % N;
  const diff = (((B - kgx) % N) + N) % N;
  const S = modPow(diff, a + u * x, N);

  // Derive 16-byte auth key via HKDF with salt = "Caldera Derived Key"
  const ikm = await sha256(hexToBytes(padHex(S)));
  const hkdf_salt = new TextEncoder().encode("Caldera Derived Key");
  const prk = await hmacSha256(hkdf_salt, ikm);
  const expand_info = new Uint8Array([...new TextEncoder().encode("Caldera Derived Key"), 0x01]);
  const auth_key = (await hmacSha256(prk, expand_info)).slice(0, 16);

  // Signature = HMAC-SHA256(authKey, poolName || username || secretBlock || timestamp)
  const timestamp = formatCognitoTimestamp(new Date());
  const secret_bytes = base64Decode(secretBlock);
  const enc = new TextEncoder();
  const msg = new Uint8Array([
    ...enc.encode(poolName),
    ...enc.encode(username),
    ...secret_bytes,
    ...enc.encode(timestamp),
  ]);

  return {
    USERNAME: username,
    TIMESTAMP: timestamp,
    PASSWORD_CLAIM_SECRET_BLOCK: secretBlock,
    PASSWORD_CLAIM_SIGNATURE: base64Encode(await hmacSha256(auth_key, msg)),
  };
}
