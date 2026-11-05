const { Pool } = require("pg");
require("dotenv").config();

const hostedDatabase = /neon\.tech|render\.com/i.test(process.env.DATABASE_URL || "");

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.DB_SSL === "true" || hostedDatabase
        ? { rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false" }
        : undefined
});

pool.on("connect", () => {
    console.log("PostgreSQL Connected");
});

pool.on("error", (err) => {
    console.error("Database Error:", err.message);
});

module.exports = pool;