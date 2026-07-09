import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { createResponse } from "../../services/nps/nps";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const body = await readBody<{
    customer_id?: number;
    score?: number;
    comment?: string;
  }>(event);
  return createResponse(useDatabase(), companyId, {
    customer_id: body?.customer_id,
    score: body?.score,
    comment: body?.comment,
  });
});
