const multer = require("multer");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.mimetype)) {
            const error = new Error("Profile photo must be a JPG, PNG, or WebP image");
            error.status = 400;
            return callback(error);
        }
        callback(null, true);
    }
});

module.exports = upload;
