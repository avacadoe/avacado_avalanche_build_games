/**
 * biometricAuth.ts
 *
 * WebAuthn-based biometric unlock for the Avacado wallet.
 *
 * ─── How it works ────────────────────────────────────────────────────────────
 *
 *  1. REGISTER (enable biometrics):
 *     - Generate a random 256-bit AES-GCM wrapping key
 *     - Encrypt the vault password with it
 *     - Call navigator.credentials.create() → OS biometric prompt
 *     - Store: credentialId, wrappingKey, encryptedPassword in localStorage
 *
 *  2. AUTHENTICATE (biometric unlock):
 *     - Call navigator.credentials.get() → OS biometric prompt
 *     - If the user passes → retrieve wrappingKey → decrypt password
 *     - Caller passes the decrypted password to unlockVault()
 *
 * ─── Security model ──────────────────────────────────────────────────────────
 *
 *  The wrapping key and encrypted password both live in localStorage.
 *  The WebAuthn assertion (FIDO2 platform authenticator = Face ID / Touch ID /
 *  Windows Hello / Android biometric) is the OS-enforced gate — the app only
 *  proceeds to decrypt after the OS confirms the user's identity.
 *
 *  This matches the security model of most mobile wallet apps:
 *  an attacker with raw storage access (developer tools, device backup) could
 *  bypass the gate, but casual physical access to a locked device cannot.
 *
 * ─── Compatibility ───────────────────────────────────────────────────────────
 *
 *  Works on:
 *  - iOS 16+  Safari  (Face ID / Touch ID)
 *  - macOS    Safari / Chrome (Touch ID)
 *  - Android  Chrome 108+ (fingerprint / face)
 *  - Windows  Edge / Chrome (Windows Hello)
 *  - Desktop  Chrome / Firefox with platform authenticator
 */

// ─── Storage keys ─────────────────────────────────────────────────────────────

const CRED_KEY   = "avacado_biometric_cred_v1";   // base64 credential ID
const WRAP_KEY   = "avacado_biometric_wrap_v1";   // base64 raw AES key
const ENC_PW_KEY = "avacado_biometric_encpw_v1";  // JSON {ciphertext, iv} base64

// ─── Helpers ──────────────────────────────────────────────────────────────────

function toB64(buf: ArrayBuffer): string {
  const bytes = new Uint8Array(buf);
  let binary = "";
  for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

function fromB64(s: string): ArrayBuffer {
  const binary = atob(s);
  const buf = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) buf[i] = binary.charCodeAt(i);
  return buf.buffer;
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns true if the browser + device support a platform (built-in)
 * biometric authenticator (Face ID, Touch ID, Windows Hello, etc.).
 */
export async function isBiometricAvailable(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!window.PublicKeyCredential) return false;
  try {
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch {
    return false;
  }
}

/**
 * Returns true if the user has already registered a biometric credential
 * for this wallet.
 */
export function hasBiometricCredential(): boolean {
  return !!(
    localStorage.getItem(CRED_KEY) &&
    localStorage.getItem(WRAP_KEY) &&
    localStorage.getItem(ENC_PW_KEY)
  );
}

/**
 * Register a new biometric credential tied to the given wallet address.
 * Triggers the OS biometric enrollment prompt (e.g. "Register fingerprint").
 * Encrypts `password` and stores it — later retrievable only after biometric auth.
 *
 * Throws if the user cancels or the device doesn't support it.
 */
export async function registerBiometric(
  password: string,
  address: string
): Promise<void> {
  // 1. Generate a random 256-bit wrapping key
  const rawKey = crypto.getRandomValues(new Uint8Array(32));
  const iv     = crypto.getRandomValues(new Uint8Array(12));

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    rawKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt"]
  );

  // 2. Encrypt the vault password
  const ciphertext = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    cryptoKey,
    new TextEncoder().encode(password)
  );

  // 3. WebAuthn credential creation → triggers OS biometric prompt
  const credential = (await navigator.credentials.create({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      rp: {
        name: "Avacado Wallet",
        id: window.location.hostname,
      },
      user: {
        // Random 32-byte handle (spec requires opaque bytes, not PII like the address)
        id: crypto.getRandomValues(new Uint8Array(32)),
        name: address,
        displayName: "Avacado Wallet",
      },
      pubKeyCredParams: [
        { alg: -7,   type: "public-key" }, // ES256 (ECDSA P-256) — preferred
        { alg: -257, type: "public-key" }, // RS256 — Windows Hello fallback
      ],
      authenticatorSelection: {
        authenticatorAttachment: "platform", // built-in only (no USB security keys)
        userVerification: "required",        // biometric must be verified
        residentKey: "preferred",
      },
      timeout: 60_000,
    },
  })) as PublicKeyCredential;

  // 4. Persist everything
  localStorage.setItem(CRED_KEY, toB64(credential.rawId));
  localStorage.setItem(WRAP_KEY, toB64(rawKey.buffer));
  localStorage.setItem(
    ENC_PW_KEY,
    JSON.stringify({ ciphertext: toB64(ciphertext), iv: toB64(iv.buffer) })
  );
}

/**
 * Trigger the OS biometric prompt to authenticate.
 * On success, decrypts and returns the stored vault password.
 * Throws if the user cancels, times out, or biometric fails.
 */
export async function authenticateWithBiometric(): Promise<string> {
  const credB64  = localStorage.getItem(CRED_KEY);
  const wrapB64  = localStorage.getItem(WRAP_KEY);
  const encRaw   = localStorage.getItem(ENC_PW_KEY);

  if (!credB64 || !wrapB64 || !encRaw) {
    throw new Error("No biometric credential found. Please set it up first.");
  }

  // 1. WebAuthn assertion → OS shows Face ID / Touch ID / Windows Hello
  await navigator.credentials.get({
    publicKey: {
      challenge: crypto.getRandomValues(new Uint8Array(32)),
      allowCredentials: [
        { id: fromB64(credB64), type: "public-key" },
      ],
      userVerification: "required",
      timeout: 60_000,
    },
  });

  // 2. Biometric passed → decrypt the password
  const { ciphertext, iv } = JSON.parse(encRaw) as {
    ciphertext: string;
    iv: string;
  };

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    fromB64(wrapB64),
    { name: "AES-GCM", length: 256 },
    false,
    ["decrypt"]
  );

  const plaintext = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromB64(iv) },
    cryptoKey,
    fromB64(ciphertext)
  );

  return new TextDecoder().decode(plaintext);
}

/**
 * Remove all stored biometric data. Call this when the vault is wiped
 * or when the user disables biometric unlock.
 */
export function clearBiometricCredential(): void {
  localStorage.removeItem(CRED_KEY);
  localStorage.removeItem(WRAP_KEY);
  localStorage.removeItem(ENC_PW_KEY);
}
