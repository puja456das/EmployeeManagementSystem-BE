const multer = require("multer");

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, callback) => {
        const allowed = new Set([
            "application/pdf",
            "image/jpeg",
            "image/png",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        ]);
        if (!allowed.has(file.mimetype)) {
            const error = new Error("Only PDF, JPG, PNG, and DOCX files are allowed");
            error.status = 400;
            return callback(error);
        }
        callback(null, true);
    }
});

module.exports = upload;
