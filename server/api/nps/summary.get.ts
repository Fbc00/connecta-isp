import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { getNpsSummary } from "../../services/nps/nps";

export default defineEventHandler(() => getNpsSummary(useDatabase()));
