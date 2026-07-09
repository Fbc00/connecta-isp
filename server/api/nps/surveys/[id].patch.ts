import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { setSurveyStatus } from "../../../services/nps/surveys";
import { requireCompany } from "../../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const id = Number(getRouterParam(event, "id"));
  const body = await readBody<{ status?: string }>(event);
  return setSurveyStatus(useDatabase(), companyId, id, body?.status);
});
