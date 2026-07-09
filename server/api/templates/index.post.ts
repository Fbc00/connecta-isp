import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { useDatabase } from "nitro/database";
import { createTemplate } from "../../services/messaging/templates";
import { requireCompany } from "../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const body = await readBody<Record<string, unknown>>(event);
  const template = await createTemplate(useDatabase(), companyId, {
    channel: body?.channel,
    subject: body?.subject,
    body: body?.body,
  });
  setResponseStatus(event, 201);
  return template;
});
