import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import reviewsRouter from "./reviews";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";
import signaturesRouter from "./signatures";
import sharedReviewsRouter from "./shared-reviews";
import comparisonsRouter from "./comparisons";
import templatesRouter from "./templates";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(reviewsRouter);
router.use(dashboardRouter);
router.use(adminRouter);
router.use(signaturesRouter);
router.use(sharedReviewsRouter);
router.use(comparisonsRouter);
router.use(templatesRouter);

export default router;
