const express = require("express");
const controller = require("../controllers/dashboardController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate, allowRoles("admin", "hr"));
router.get("/", controller.getDashboard);
router.get("/attendance", controller.getAttendanceOverview);
router.get("/leaves", controller.getLeaveOverview);
router.get("/payroll", controller.getPayrollOverview);
router.get("/employees", controller.getEmployeeOverview);
module.exports = router;
