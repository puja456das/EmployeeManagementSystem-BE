const express = require("express");
const controller = require("../controllers/dashboardController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/", allowRoles("admin", "hr"), controller.getDashboard);
router.get("/attendance", allowRoles("admin", "hr"), controller.getAttendanceOverview);
router.get("/leaves", allowRoles("admin", "hr"), controller.getLeaveOverview);
router.get("/payroll", allowRoles("admin", "hr"), controller.getPayrollOverview);
router.get("/employees", allowRoles("admin", "hr"), controller.getEmployeeOverview);
module.exports = router;
