const notFound = (req, res) => {
    res.status(404).json({ success: false, message: `Route not found: ${req.method} ${req.originalUrl}` });
};

const errorHandler = (error, req, res, next) => {
    if (res.headersSent) return next(error);

    if (error.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({ success: false, message: "Uploaded file exceeds the 5 MB limit" });
    }
    console.error(error);
    if (error.code === "23505") {
        return res.status(409).json({ success: false, message: "A record with the same unique value already exists" });
    }
    if (error.code === "23503") {
        return res.status(400).json({ success: false, message: "The referenced record does not exist or is still in use" });
    }
    const status = Number.isInteger(error.status) ? error.status : 500;
    res.status(status).json({
        success: false,
        message: status === 500 ? "An unexpected server error occurred" : error.message
    });
};

module.exports = { notFound, errorHandler };
