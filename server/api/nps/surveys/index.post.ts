import { defineEventHandler, readBody, setResponseStatus } from "h3";
import { useDatabase } from "nitro/database";
import { createSurvey } from "../../../services/nps/surveys";
import { requireCompany } from "../../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const body = await readBody<Record<string, unknown>>(event);
  const survey = await createSurvey(useDatabase(), companyId, {
    title: body?.title,
    questions: body?.questions,
    question: body?.question,
  });
  setResponseStatus(event, 201);
  return survey;
});
