import { defineEventHandler } from "h3";
import { useDatabase } from "nitro/database";
import { listCustomers } from "../../services/crm/customers";

export default defineEventHandler(() => listCustomers(useDatabase()));