const jwt = require("jsonwebtoken");

const authenticate = (req, res, next) => {
    const header = req.headers.authorization;
    const token = header?.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
        return res.status(401).json({ success: false, message: "Authentication required" });
    }
    if (!process.env.JWT_SECRET) {
        return next(new Error("JWT_SECRET is not configured"));
    }

    try {
        req.user = jwt.verify(token, process.env.JWT_SECRET);
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Invalid or expired token" });
        }
        next(error);
    }
};

module.exports = authenticate;
