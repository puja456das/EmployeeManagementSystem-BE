const express = require("express");
const {
    register, login, me, changePassword, requestPasswordReset, verifyPasswordResetOtp,
    verifyEmployeeInviteOtp, resetPassword
} = require("../controllers/authController");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", requestPasswordReset);
router.post("/verify-reset-otp", verifyPasswordResetOtp);
router.post("/verify-employee-invite-otp", verifyEmployeeInviteOtp);
router.post("/reset-password", resetPassword);
router.get("/me", authenticate, me);
router.post("/change-password", authenticate, changePassword);
module.exports = router;
