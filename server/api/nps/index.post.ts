import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { createResponse } from "../../services/nps/nps";

export default defineEventHandler(async (event) => {
  const body = await readBody<{
    customer_id?: number;
    score?: number;
    comment?: string;
  }>(event);
  return createResponse(useDatabase(), {
    customer_id: body?.customer_id,
    score: body?.score,
    comment: body?.comment,
  });
});