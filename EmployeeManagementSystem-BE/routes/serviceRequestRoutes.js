const express = require("express");
const controller = require("../controllers/serviceRequestController");
const authenticate = require("../middleware/authMiddleware");
const router = express.Router();

router.use(authenticate);
router.get("/summary", controller.getSummary);
router.get("/", controller.listRequests);
router.post("/", controller.createRequest);
router.patch("/:id", controller.updateRequest);
module.exports = router;