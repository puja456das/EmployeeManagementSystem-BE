const { body, validationResult } = require("express-validator");

const validateEmployee = [
    body("name")
        .trim()
        .notEmpty()
        .withMessage("Employee name is required"),

    body("email")
        .trim()
        .notEmpty()
        .withMessage("Email is required")
        .isEmail()
        .withMessage("Enter a valid email address")
        .normalizeEmail(),

    body("department").custom((department, { req }) => {
        if (!String(req.body.department_id || "").trim() && !String(department || "").trim()) {
            throw new Error("Department is required");
        }
        return true;
    }),

    body("salary")
        .notEmpty()
        .withMessage("Salary is required")
        .isFloat({ min: 0 })
        .withMessage("Salary must be a valid non-negative number"),

    body("annual_paid_leave_days")
        .optional({ values: "falsy" })
        .isInt({ min: 0, max: 365 })
        .withMessage("Annual paid leave allowance must be between 0 and 365 days")
        .toInt(),

    (req, res, next) => {
        const errors = validationResult(req);

        if (!errors.isEmpty()) {
            return res.status(400).json({
                success: false,
                errors: errors.array()
            });
        }

        next();
    }
];

module.exports = validateEmployee;