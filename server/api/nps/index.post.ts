import { defineEventHandler, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { createResponse } from "../../services/nps/nps";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  return createResponse(useDatabase(), body);
});
