module.exports = require("../utils/resourceController")({
    table: "holidays",
    fields: ["name", "holiday_date", "description"],
    required: ["name", "holiday_date"],
    orderBy: "holiday_date ASC"
});
