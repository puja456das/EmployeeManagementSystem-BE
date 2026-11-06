
const express = require("express");

const router = express.Router();

const {
    getEmployees,
    getEmployeeById,
    getEmployeePhoto,
    addEmployee,
    updateEmployee,
    patchEmployee,
    deleteEmployee
} = require("../controllers/employeeController");

const validateEmployee = require("../middleware/employeeValidation");
const profileImageUpload = require("../middleware/profileImageUpload");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");

router.use(authenticate);

// GET - All Employees
router.get("/", allowRoles("admin", "hr"), getEmployees);

// GET - Employee Profile Photo
router.get("/:id/photo", allowRoles("admin", "hr"), getEmployeePhoto);

// GET - Employee By ID
router.get("/:id", allowRoles("admin", "hr"), getEmployeeById);

// POST - Add Employee (With Validation)
router.post("/", allowRoles("admin", "hr"), profileImageUpload.single("profile_image"), validateEmployee, addEmployee);

// PUT - Full Update Employee (With Validation)
router.put("/:id", allowRoles("hr"), profileImageUpload.single("profile_image"), validateEmployee, updateEmployee);

// PATCH - Partial Update Employee
router.patch("/:id", allowRoles("hr"), profileImageUpload.single("profile_image"), patchEmployee);

// DELETE - Delete Employee
router.delete("/:id", allowRoles("admin", "hr"), deleteEmployee);

module.exports = router;
