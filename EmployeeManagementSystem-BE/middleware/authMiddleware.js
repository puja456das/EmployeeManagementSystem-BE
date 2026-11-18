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
        // Legacy queue-only accounts now use the shared Employee workspace; queue permissions
        // are derived from the linked employee's department in the service-request controller.
        const normalizeRole = (role) => ["it", "support", "maintenance"].includes(role) ? "employee" : role === "payroll_admin" ? "hr" : role;
        req.user.role = normalizeRole(req.user.role);
        req.user.accountRole = normalizeRole(req.user.accountRole || req.user.role);
        next();
    } catch (error) {
        if (error.name === "TokenExpiredError" || error.name === "JsonWebTokenError") {
            return res.status(401).json({ success: false, message: "Invalid or expired token" });
        }
        next(error);
    }
};

module.exports = authenticate;
