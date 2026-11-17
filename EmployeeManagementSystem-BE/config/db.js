const { Pool } = require("pg");
require("dotenv").config();

const hostedDatabase = /neon\.tech|render\.com/i.test(process.env.DATABASE_URL || "");
let normalizedConnectionString = process.env.DATABASE_URL;

if (normalizedConnectionString) {
    try {
        const parsedConnectionString = new URL(normalizedConnectionString);
        if (["prefer", "require", "verify-ca"].includes(parsedConnectionString.searchParams.get("sslmode"))) {
            parsedConnectionString.searchParams.set("sslmode", "verify-full");
        }
        // `pg-connection-string` warns that these legacy modes will change meaning in pg v9.
        // Make today's strict certificate and hostname verification explicit.
        normalizedConnectionString = parsedConnectionString.toString();
    } catch {
        // Keep the original value so node-postgres can report any malformed URL normally.
    }
}

const pool = new Pool({
    connectionString: normalizedConnectionString,
    ssl: !normalizedConnectionString?.includes("sslmode=") && (process.env.DB_SSL === "true" || hostedDatabase)
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
