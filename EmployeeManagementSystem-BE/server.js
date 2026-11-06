const express = require("express");
const cors = require("cors");
require("dotenv").config();

const pool = require("./config/db");
const { notFound, errorHandler } = require("./middleware/errorMiddleware");

const routeModules = {
    auth: require("./routes/authRoutes"),
    users: require("./routes/userRoutes"),
    employees: require("./routes/employeeRoutes"),
    departments: require("./routes/departmentRoutes"),
    attendance: require("./routes/attendanceRoutes"),
    leaves: require("./routes/leaveRoutes"),
    payroll: require("./routes/payrollRoutes"),
    dashboard: require("./routes/dashboardRoutes"),
    profile: require("./routes/profileRoutes"),
    documents: require("./routes/documentRoutes"),
    announcements: require("./routes/announcementRoutes"),
    holidays: require("./routes/holidayRoutes")
};

const app = express();

app.use(cors({
    origin: process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(",").map((value) => value.trim()) : true
}));
app.use(express.json({ limit: "1mb" }));
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.get("/", (req, res) => {
    res.json({
        success: true,
        message: "Employee Management System API",
        modules: Object.keys(routeModules)
    });
});

app.get("/api/test-db", async (req, res) => {
    try {
        const result = await pool.query("SELECT NOW()");

        res.json({
            success: true,
            message: "Neon PostgreSQL Connected Successfully",
            databaseTime: result.rows[0].now
        });

    } catch (error) {
        console.error("Database health check failed:", error.message);
        res.status(500).json({ success: false, message: "Database connection failed" });
    }
});

for (const [path, router] of Object.entries(routeModules)) {
    app.use(`/api/${path}`, router);
}

app.use(notFound);
app.use(errorHandler);

if (require.main === module) {
    const port = process.env.PORT || 5000;
    app.listen(port, () => console.log(`Server running on port ${port}`));
}

module.exports = app;