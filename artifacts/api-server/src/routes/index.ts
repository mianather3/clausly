import { Router, type IRouter } from "express";
import healthRouter from "./health";
import documentsRouter from "./documents";
import reviewsRouter from "./reviews";
import dashboardRouter from "./dashboard";
import adminRouter from "./admin";

const router: IRouter = Router();

router.use(healthRouter);
router.use(documentsRouter);
router.use(reviewsRouter);
router.use(dashboardRouter);
router.use(adminRouter);

export default router;
