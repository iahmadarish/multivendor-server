import express from "express"
import {
  createCoupon,
  getAllCoupons,
  applyCoupon,
} from "./couponController.js"

const router = express.Router()

router.route("/").post(createCoupon).get(getAllCoupons) 
router.post("/apply", applyCoupon) 
export default router