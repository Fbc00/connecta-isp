import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { logAudit } from "../../../../services/audit/audit";
import { sendInvites } from "../../../../services/nps/invites";
import { requireCompany } from "../../../../utils/session";

export default defineEventHandler(async (event) => {
  const { user, companyId } = await requireCompany(event);
  const db = useDatabase();
  const surveyId = Number(getRouterParam(event, "id"));
  const body = await readBody<{ customerIds?: number[]; channel?: string }>(event);
  const result = await sendInvites(db, companyId, surveyId, {
    customerIds: body?.customerIds,
    channel: body?.channel,
  });
  await logAudit(db, {
    userId: user.id,
    companyId,
    action: "nps.invite",
    detail: `survey ${surveyId}: ${result.sent} convites enviados`,
  });
  return result;
});
