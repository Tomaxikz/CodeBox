import {
  createCipheriv,
  createDecipheriv,
  createHmac,
  randomBytes,
  timingSafeEqual,
} from "node:crypto";

const APP_KEY = Bun.env.APP_KEY;

if (!APP_KEY || APP_KEY.length < 32) {
  throw new Error("APP_KEY must be at least 32 characters long");
}

function key() {
  return Buffer.from(APP_KEY as string).subarray(0, 32);
}

type EncryptableValue =
  | string
  | number
  | boolean
  | null
  | Record<string, unknown>
  | unknown[];

export class KeyHash {
  private static pepperPassword(password: string) {
    return `${password}.${APP_KEY}`;
  }

  public static async hashPassword(password: string) {
    return Bun.password.hash(this.pepperPassword(password));
  }

  public static async verifyPassword(password: string, passwordHash: string) {
    return Bun.password.verify(this.pepperPassword(password), passwordHash);
  }

  public static sign(value: string) {
    return createHmac("sha256", APP_KEY as string)
      .update(value)
      .digest("base64url");
  }

  public static verify(value: string, signature: string) {
    const expected = this.sign(value);

    const expectedBuffer = Buffer.from(expected);
    const signatureBuffer = Buffer.from(signature);

    if (expectedBuffer.length !== signatureBuffer.length) {
      return false;
    }

    return timingSafeEqual(expectedBuffer, signatureBuffer);
  }

  public static encrypt(value: EncryptableValue) {
    const plainText = typeof value === "string" ? value : JSON.stringify(value);
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", key(), iv);

    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);

    const tag = cipher.getAuthTag();

    return [
      iv.toString("base64url"),
      tag.toString("base64url"),
      encrypted.toString("base64url"),
    ].join(".");
  }

  public static decrypt(payload: string) {
    const [ivText, tagText, encryptedText] = payload.split(".");

    if (!ivText || !tagText || !encryptedText) {
      throw new Error("Invalid encrypted payload");
    }

    const decipher = createDecipheriv(
      "aes-256-gcm",
      key(),
      Buffer.from(ivText, "base64url"),
    );

    decipher.setAuthTag(Buffer.from(tagText, "base64url"));

    const decrypted = Buffer.concat([
      decipher.update(Buffer.from(encryptedText, "base64url")),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }

  public static decryptJson<T>(payload: string) {
    return JSON.parse(this.decrypt(payload)) as T;
  }
}
