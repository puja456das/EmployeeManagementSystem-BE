module.exports = require("../utils/resourceController")({
    table: "announcements",
    fields: ["title", "body", "published_at", "expires_at"],
    required: ["title", "body"],
    orderBy: "published_at DESC"
});
