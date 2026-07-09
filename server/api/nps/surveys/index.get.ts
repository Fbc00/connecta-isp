import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { getSurveyScore, listSurveys } from "../../../services/nps/surveys";
import { requireCompany } from "../../../utils/session";

export default defineEventHandler(async (event) => {
  const { companyId } = await requireCompany(event);
  const db = useDatabase();
  const surveys = await listSurveys(db, companyId);
  return Promise.all(
    surveys.map(async (s) => ({
      ...s,
      score: await getSurveyScore(db, companyId, s.id),
    })),
  );
});
