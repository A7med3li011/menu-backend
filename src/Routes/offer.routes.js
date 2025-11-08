import express from "express";
const router = express.Router();

import {
  createOffer,
  getAllOffer,
  getOffer,
  updateOffer,
  activeOffer,
  deactiveOffer,
  createOrderOffer,
  getAllOfferSlider,
  getOfferDetails,
} from "../controllers/offer.controller.js";

import { auth } from "../middleware/auth/auth.js";
import { checkRole } from "../middleware/auth/roleAuth.js";
import { multer4server } from "../services/multer.js";

router.get(
  "/",
  auth(["admin", "operation", "waiter", "customer", "staff"]),
  checkRole(["admin", "operation", "waiter", "customer", "staff"]),
  getAllOffer
);
router.get(
  "/slider",

  getAllOfferSlider
);

router.post(
  "/",
  multer4server().single("image"),
  auth(["admin", "operation", "waiter", "staff"]),
  checkRole(["admin", "operation", "waiter", "staff"]),
  createOffer
);

router.post(
  "/orderOffer",
  auth(["admin", "operation", "waiter", "staff", "customer"]),
  checkRole(["admin", "operation", "waiter", "staff", "customer"]),
  createOrderOffer
);

router.get(
  "/:offerId",
  auth(["admin", "operation", "waiter", "customer", "staff"]),
  checkRole(["admin", "operation", "waiter", "customer", "staff"]),
  getOffer
);
router.get(
  "/slider/:offerId",

  getOfferDetails
);

router.put(
  "/:id",
  auth(["admin", "operation", "waiter", "staff"]),
  checkRole(["admin", "operation", "waiter", "staff"]),
  updateOffer
);

router.patch(
  "/active/:offerId",
  auth(["admin", "operation", "waiter", "staff"]),
  checkRole(["admin", "operation", "waiter", "staff"]),
  activeOffer
);
router.patch(
  "/deActive/:offerId",
  auth(["admin", "operation", "waiter", "staff"]),
  checkRole(["admin", "operation", "waiter", "staff"]),
  deactiveOffer
);

export default router;
