import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { createResponse } from "../../services/nps/nps";
import { requireUser } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const user = await requireUser(event);
  const body = await readBody<{
    customer_id?: number;
    score?: number;
    comment?: string;
  }>(event);
  return createResponse(useDatabase(), user.company_id, {
    customer_id: body?.customer_id,
    score: body?.score,
    comment: body?.comment,
  });
});
