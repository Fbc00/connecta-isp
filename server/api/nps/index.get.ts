import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listResponses } from "../../services/nps/nps";

export default defineEventHandler(() => listResponses(useDatabase()));
