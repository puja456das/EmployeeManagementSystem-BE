const express = require("express");
const controller = require("../controllers/documentController");
const upload = require("../middleware/uploadMiddleware");
const authenticate = require("../middleware/authMiddleware");
const allowRoles = require("../middleware/roleMiddleware");
const router = express.Router();

router.use(authenticate, allowRoles("hr", "employee"));
router.get("/", controller.listDocuments);
router.post("/", upload.single("file"), controller.uploadDocument);
router.get("/:id", controller.getDocument);
router.get("/:id/download", controller.downloadDocument);
router.delete("/:id", controller.deleteDocument);
module.exports = router;
