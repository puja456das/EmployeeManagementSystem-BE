const detectImageMime = (buffer) => {
    if (!Buffer.isBuffer(buffer)) return null;
    if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
        return "image/jpeg";
    }
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
        return "image/png";
    }
    if (
        buffer.length >= 12 &&
        buffer.toString("ascii", 0, 4) === "RIFF" &&
        buffer.toString("ascii", 8, 12) === "WEBP"
    ) {
        return "image/webp";
    }
    return null;
};

const validateProfileImage = (file) => {
    if (!file) return null;
    const detectedMime = detectImageMime(file.buffer);
    if (!detectedMime || detectedMime !== file.mimetype) {
        const error = new Error("The uploaded profile photo is not a valid JPG, PNG, or WebP image");
        error.status = 400;
        throw error;
    }
    return detectedMime;
};

module.exports = { validateProfileImage };
