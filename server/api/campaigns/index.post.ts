import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { logAudit } from "../../services/audit/audit";
import { dispatchCampaign } from "../../services/messaging/campaigns";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { user, companyId } = await requireCompany(event);
  const db = useDatabase();
  const body = await readBody<{ templateId?: number; customerIds?: number[] }>(event);
  const result = await dispatchCampaign(db, companyId, {
    templateId: body?.templateId,
    customerIds: body?.customerIds,
  });
  await logAudit(db, {
    userId: user.id,
    companyId,
    action: "campaign.dispatch",
    detail: `template ${body?.templateId}: ${result.sent} enviados, ${result.failed} falhas`,
  });
  return result;
});
