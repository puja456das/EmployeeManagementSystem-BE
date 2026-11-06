const express = require("express");
const controller = require("../controllers/payrollController");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/summary", controller.getPayrollSummary);
router.get("/employee/:employeeId", allowRoles("admin", "hr"), controller.getEmployeePayroll);
router.get("/", controller.listPayroll);
router.get("/:id/payslip", controller.getPayslip);
router.patch("/:id/mark-paid", allowRoles("admin", "hr"), controller.markPayrollPaid);
router.get("/:id", allowRoles("admin", "hr"), controller.get);
router.post("/", allowRoles("admin", "hr"), controller.create);
router.patch("/:id", allowRoles("admin", "hr"), controller.update);
router.delete("/:id", allowRoles("admin"), controller.remove);
module.exports = router;
