import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { updateTemplate } from "../../services/messaging/templates";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<Record<string, unknown>>(event);
  return updateTemplate(useDatabase(), companyId, id, {
    channel: body?.channel,
    subject: body?.subject,
    body: body?.body,
  });
});
