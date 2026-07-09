import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { getSurveyQuestionScores, listSurveys } from "../../../services/nps/surveys";
import { requireCompany } from "../../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const db = useDatabase();
  const surveys = await listSurveys(db, companyId);
  return Promise.all(
    surveys.map(async (s) => ({
      ...s,
      questions: await getSurveyQuestionScores(db, companyId, s.id),
    })),
  );
});
