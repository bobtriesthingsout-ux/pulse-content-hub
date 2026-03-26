import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sourcesRouter from "./sources";
import contentRouter from "./content";
import ingestRouter from "./ingest";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sources", sourcesRouter);
router.use("/content", contentRouter);
router.use("/ingest", ingestRouter);

export default router;