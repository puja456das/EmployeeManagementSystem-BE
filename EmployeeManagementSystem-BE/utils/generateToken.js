const jwt = require("jsonwebtoken");

module.exports = (user) => {
    if (!process.env.JWT_SECRET) throw new Error("JWT_SECRET is not configured");
    return jwt.sign(
        { id: user.id, email: user.email, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "1d" }
    );
};
