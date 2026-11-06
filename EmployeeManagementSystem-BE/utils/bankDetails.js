const crypto = require("crypto");

const getEncryptionKey = () => {
    const value = process.env.BANK_DETAILS_ENCRYPTION_KEY;
    if (!value || !/^[\da-f]{64}$/i.test(value)) {
        const error = new Error(
            "Bank account encryption is not configured. Set BANK_DETAILS_ENCRYPTION_KEY to a 64-character hexadecimal key in the backend .env file."
        );
        error.status = 503;
        throw error;
    }
    return Buffer.from(value, "hex");
};

const encryptBankAccount = (accountNumber) => {
    if (accountNumber === undefined || accountNumber === null || accountNumber === "") return null;
    const normalized = String(accountNumber).replace(/[\s-]/g, "");
    if (!/^\d{6,34}$/.test(normalized)) {
        const error = new Error("Bank account number must contain 6 to 34 digits.");
        error.status = 400;
        throw error;
    }
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
    const ciphertext = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
    return [iv, cipher.getAuthTag(), ciphertext].map((part) => part.toString("base64url")).join(".");
};

const maskBankAccount = (encrypted) => {
    if (!encrypted) return null;
    const [ivValue, tagValue, ciphertextValue] = String(encrypted).split(".");
    if (!ivValue || !tagValue || !ciphertextValue) {
        throw new Error("Stored bank account value has an invalid encrypted format.");
    }
    const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(ivValue, "base64url"));
    decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
    const accountNumber = Buffer.concat([
        decipher.update(Buffer.from(ciphertextValue, "base64url")),
        decipher.final()
    ]).toString("utf8");
    return `•••• •••• ${accountNumber.slice(-4)}`;
};

module.exports = { encryptBankAccount, maskBankAccount };
