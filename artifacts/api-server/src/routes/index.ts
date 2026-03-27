import { Router, type IRouter } from "express";
import healthRouter from "./health";
import sourcesRouter from "./sources";
import contentRouter from "./content";
import ingestRouter from "./ingest";
import summarizeRouter from "./summarize";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/sources", sourcesRouter);
router.use("/content", contentRouter);
router.use("/ingest", ingestRouter);
router.use("/summarize", summarizeRouter);

export default router;