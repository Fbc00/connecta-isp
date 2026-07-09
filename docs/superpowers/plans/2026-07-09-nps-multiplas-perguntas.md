# NPS com Múltiplas Perguntas — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Permitir que uma pesquisa de NPS tenha N perguntas, cada uma com escala 0-10, respondidas num único formulário, com índice NPS calculado por pergunta.

**Architecture:** Nova tabela `nps_questions` (1 survey → N perguntas). `nps_responses` ganha `question_id` — cada linha é a resposta de uma pergunta. Migração idempotente cria uma pergunta a partir do `nps_surveys.question` legado e faz backfill das respostas antigas. Score é calculado por pergunta reusando a fórmula atual.

**Tech Stack:** TypeScript, Nitro (h3), db0 + node-sqlite, Vitest, React + Chakra UI.

## Global Constraints

- Toda query usa a API de template tag do db0 (`db.sql\`...\``) com interpolação — nunca concatenação de string com input do usuário.
- Migrações são idempotentes e ficam em `migrateSchema` (`server/database/db.ts`). Nomes de tabela/coluna em `ADD COLUMN` são literais internos.
- Serviços recebem `db` como primeiro parâmetro e são escopados por `companyId` (exceto fluxo público por token).
- Fórmula NPS: `promoters = score >= 9`, `passives = 7..8`, `detractors = <= 6`, `nps = round(((promoters - detractors) / total) * 100)`. Total 0 → tudo zero.
- Comando de teste: `rtk npx vitest run <arquivo>`.
- Mensagens de erro em português (padrão existente): título obrigatório, nota 0-10, "já respondido", "não encontrado".

---

### Task 1: Schema `nps_questions` + coluna `question_id` + migração

**Files:**
- Modify: `server/database/db.ts` (adicionar `CREATE TABLE nps_questions`, coluna em `nps_responses`, e passos de migração em `migrateSchema`)
- Test: `server/database/db.test.ts`

**Interfaces:**
- Consumes: nada.
- Produces: tabela `nps_questions (id, company_id, survey_id, text, position, created_at)`; coluna `nps_responses.question_id INTEGER`. Após `initSchema`/`migrateSchema`, todo survey pré-existente tem ≥1 pergunta e toda resposta antiga tem `question_id` preenchido.

- [ ] **Step 1: Escrever teste de migração falhando**

Adicionar em `server/database/db.test.ts` (segue o padrão de `beforeAll`/`initSchema` já usado no arquivo; se o arquivo ainda não existir com este shape, criar com o cabeçalho abaixo):

```ts
import { createDatabase } from "db0";
import nodeSqlite from "db0/connectors/node-sqlite";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { initSchema, migrateSchema } from "./db";

describe("migração nps_questions", () => {
  it("cria pergunta a partir de survey legado e faz backfill das respostas", async () => {
    const db = createDatabase(nodeSqlite({ name: ":memory:" }));
    // Simula banco legado: survey com coluna question e uma resposta sem question_id.
    await db.sql`CREATE TABLE companies (id INTEGER PRIMARY KEY, name TEXT)`;
    await db.sql`INSERT INTO companies (id, name) VALUES (1, 'Acme')`;
    await db.sql`
      CREATE TABLE nps_surveys (
        id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER, title TEXT,
        question TEXT DEFAULT 'Pergunta legada?', status TEXT DEFAULT 'active',
        created_at TEXT DEFAULT (datetime('now')))`;
    await db.sql`INSERT INTO nps_surveys (company_id, title, question) VALUES (1, 'Legada', 'Pergunta legada?')`;
    await db.sql`
      CREATE TABLE nps_responses (
        id INTEGER PRIMARY KEY AUTOINCREMENT, company_id INTEGER, customer_id INTEGER,
        survey_id INTEGER, invite_id INTEGER, score INTEGER, comment TEXT,
        created_at TEXT DEFAULT (datetime('now')))`;
    await db.sql`INSERT INTO nps_responses (company_id, customer_id, survey_id, score) VALUES (1, 1, 1, 9)`;

    await initSchema(db); // roda migrateSchema idempotente sobre as tabelas acima

    const q = await db.sql`SELECT * FROM nps_questions WHERE survey_id = 1`;
    const questions = q.rows as { id: number; text: string; position: number }[];
    expect(questions).toHaveLength(1);
    expect(questions[0].text).toBe("Pergunta legada?");
    expect(questions[0].position).toBe(0);

    const r = await db.sql`SELECT question_id FROM nps_responses WHERE survey_id = 1`;
    expect((r.rows as { question_id: number }[])[0].question_id).toBe(questions[0].id);

    // Idempotência: rodar de novo não duplica perguntas.
    await migrateSchema(db);
    const again = await db.sql`SELECT COUNT(*) AS n FROM nps_questions WHERE survey_id = 1`;
    expect(Number((again.rows as { n: number }[])[0].n)).toBe(1);
    db.dispose();
  });
});
```

- [ ] **Step 2: Rodar o teste e ver falhar**

Run: `rtk npx vitest run server/database/db.test.ts`
Expected: FAIL — `no such table: nps_questions`.

- [ ] **Step 3: Adicionar a tabela `nps_questions` em `initSchema`**

Em `server/database/db.ts`, logo após o bloco `CREATE TABLE nps_surveys` (linha ~85):

```ts
  await db.sql`
    CREATE TABLE IF NOT EXISTS nps_questions (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      company_id INTEGER NOT NULL REFERENCES companies(id),
      survey_id  INTEGER NOT NULL REFERENCES nps_surveys(id),
      text       TEXT    NOT NULL,
      position   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL DEFAULT (datetime('now'))
    )
  `;
```

- [ ] **Step 4: Adicionar os passos de migração em `migrateSchema`**

Em `server/database/db.ts`, dentro de `migrateSchema`, após a linha `addColumnIfMissing(db, "nps_responses", "invite_id", ...)`:

```ts
  await addColumnIfMissing(db, "nps_responses", "question_id", "INTEGER");
  await backfillNpsQuestions(db);
```

E adicionar a função auxiliar no fim do arquivo (após `addColumnIfMissing`):

```ts
/**
 * Cria uma pergunta (position 0) a partir de nps_surveys.question para surveys
 * que ainda não têm perguntas, e aponta as respostas antigas para ela.
 * Idempotente: só age sobre surveys sem perguntas.
 */
async function backfillNpsQuestions(db: Database): Promise<void> {
  const { rows } = await db.sql`
    SELECT s.id, s.company_id, s.question
    FROM nps_surveys s
    WHERE NOT EXISTS (SELECT 1 FROM nps_questions q WHERE q.survey_id = s.id)
  `;
  const surveys = rows as unknown as {
    id: number;
    company_id: number;
    question: string;
  }[];
  for (const s of surveys) {
    const { lastInsertRowid } = await db.sql`
      INSERT INTO nps_questions (company_id, survey_id, text, position)
      VALUES (${s.company_id}, ${s.id}, ${s.question}, 0)
    `;
    await db.sql`
      UPDATE nps_responses SET question_id = ${Number(lastInsertRowid)}
      WHERE survey_id = ${s.id} AND question_id IS NULL
    `;
  }
}
```

- [ ] **Step 5: Rodar o teste e ver passar**

Run: `rtk npx vitest run server/database/db.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
rtk git add server/database/db.ts server/database/db.test.ts
rtk git commit -m "feat(nps): tabela nps_questions e migração de perguntas legadas

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 2: Serviço `surveys.ts` — criar com N perguntas e score por pergunta

**Files:**
- Modify: `server/services/nps/surveys.ts`
- Test: `server/services/nps/surveys.test.ts`

**Interfaces:**
- Consumes: tabela `nps_questions` e coluna `nps_responses.question_id` (Task 1).
- Produces:
  - `interface Question { id: number; text: string; position: number }`
  - `interface QuestionScore extends Question { promoters: number; passives: number; detractors: number; total: number; nps: number }`
  - `interface Survey { id; company_id; title; question; status; created_at; questions: Question[] }`
  - `createSurvey(db, companyId, { title?, questions?: string[], question?: string }): Promise<Survey>`
  - `getSurvey(db, companyId, id): Promise<Survey>` (agora inclui `questions`)
  - `getSurveyQuestionScores(db, companyId, surveyId): Promise<QuestionScore[]>`
  - `getSurveyScore` é **removido**.

- [ ] **Step 1: Escrever os testes falhando**

Substituir os três testes do bloco `describe("surveys", ...)` em `server/services/nps/surveys.test.ts` por (e ajustar o import para trocar `getSurveyScore` por `getSurveyQuestionScores`):

```ts
import {
  createSurvey,
  getSurvey,
  getSurveyQuestionScores,
  listSurveys,
  setSurveyStatus,
} from "./surveys";

describe("surveys", () => {
  it("cria com pergunta default e exige título", async () => {
    const s = await createSurvey(db, CO, { title: "Q3" });
    expect(s.questions).toHaveLength(1);
    expect(s.questions[0].text).toMatch(/recomendaria/i);
    expect((await listSurveys(db, CO)).length).toBe(1);
    await expect(createSurvey(db, CO, { title: "" })).rejects.toThrowError(/título/i);
  });

  it("cria com N perguntas na ordem informada", async () => {
    const s = await createSurvey(db, CO, {
      title: "Multi",
      questions: ["Atendimento?", "Velocidade?", "Preço?"],
    });
    expect(s.questions.map((q) => q.text)).toEqual([
      "Atendimento?",
      "Velocidade?",
      "Preço?",
    ]);
    expect(s.questions.map((q) => q.position)).toEqual([0, 1, 2]);
    // Retrocompat: primeira pergunta espelhada em survey.question.
    expect(s.question).toBe("Atendimento?");
  });

  it("ignora perguntas vazias e exige ao menos uma", async () => {
    const s = await createSurvey(db, CO, { title: "T", questions: ["  ", "Ok?"] });
    expect(s.questions.map((q) => q.text)).toEqual(["Ok?"]);
    await expect(
      createSurvey(db, CO, { title: "T", questions: ["   "] }),
    ).rejects.toThrowError(/pergunta/i);
  });

  it("altera status com validação", async () => {
    const s = await createSurvey(db, CO, { title: "Q" });
    expect((await setSurveyStatus(db, CO, s.id, "closed")).status).toBe("closed");
    await expect(setSurveyStatus(db, CO, s.id, "x")).rejects.toThrowError(/inválido/i);
  });

  it("score por pergunta é zero quando sem respostas", async () => {
    const s = await createSurvey(db, CO, { title: "Q", questions: ["A?", "B?"] });
    const scores = await getSurveyQuestionScores(db, CO, s.id);
    expect(scores).toHaveLength(2);
    expect(scores[0]).toMatchObject({
      text: "A?",
      promoters: 0,
      passives: 0,
      detractors: 0,
      total: 0,
      nps: 0,
    });
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `rtk npx vitest run server/services/nps/surveys.test.ts`
Expected: FAIL — `getSurveyQuestionScores` não existe / `s.questions` undefined.

- [ ] **Step 3: Reescrever `surveys.ts`**

Substituir o conteúdo de `server/services/nps/surveys.ts` por:

```ts
import type { Database } from "db0";
import { createError } from "h3";

export interface Question {
  id: number;
  text: string;
  position: number;
}

export interface QuestionScore extends Question {
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  nps: number;
}

export interface Survey {
  id: number;
  company_id: number;
  title: string;
  question: string;
  status: string;
  created_at: string;
  questions: Question[];
}

const badRequest = (msg: string) => createError({ statusCode: 400, message: msg });
const notFound = () =>
  createError({ statusCode: 404, message: "Pesquisa não encontrada" });

const DEFAULT_QUESTION = "De 0 a 10, o quanto você recomendaria a gente?";

/** Normaliza a entrada de perguntas: aceita questions[] ou question legado. */
function normalizeQuestions(data: {
  questions?: unknown;
  question?: unknown;
}): string[] {
  const raw = Array.isArray(data.questions)
    ? data.questions
    : typeof data.question === "string"
      ? [data.question]
      : [];
  const cleaned = raw
    .filter((q): q is string => typeof q === "string")
    .map((q) => q.trim())
    .filter((q) => q.length > 0);
  if (Array.isArray(data.questions) || typeof data.question === "string") {
    if (cleaned.length === 0)
      throw badRequest("Informe ao menos uma pergunta");
    return cleaned;
  }
  return [DEFAULT_QUESTION];
}

async function questionsOf(db: Database, surveyId: number): Promise<Question[]> {
  const { rows } = await db.sql`
    SELECT id, text, position FROM nps_questions
    WHERE survey_id = ${surveyId} ORDER BY position, id
  `;
  return rows as unknown as Question[];
}

export async function listSurveys(db: Database, companyId: number): Promise<Survey[]> {
  const { rows } = await db.sql`
    SELECT * FROM nps_surveys WHERE company_id = ${companyId} ORDER BY id DESC
  `;
  const surveys = rows as unknown as Survey[];
  for (const s of surveys) s.questions = await questionsOf(db, s.id);
  return surveys;
}

export async function getSurvey(
  db: Database,
  companyId: number,
  id: number,
): Promise<Survey> {
  const { rows } = await db.sql`
    SELECT * FROM nps_surveys WHERE id = ${id} AND company_id = ${companyId}
  `;
  const row = (rows as unknown as Survey[])[0];
  if (!row) throw notFound();
  row.questions = await questionsOf(db, row.id);
  return row;
}

export async function createSurvey(
  db: Database,
  companyId: number,
  data: { title?: unknown; questions?: unknown; question?: unknown },
): Promise<Survey> {
  const title = typeof data.title === "string" ? data.title.trim() : "";
  if (!title) throw badRequest("O título é obrigatório");
  const questions = normalizeQuestions(data);

  const { lastInsertRowid } = await db.sql`
    INSERT INTO nps_surveys (company_id, title, question)
    VALUES (${companyId}, ${title}, ${questions[0]})
  `;
  const surveyId = Number(lastInsertRowid);

  for (let i = 0; i < questions.length; i++) {
    await db.sql`
      INSERT INTO nps_questions (company_id, survey_id, text, position)
      VALUES (${companyId}, ${surveyId}, ${questions[i]}, ${i})
    `;
  }
  return getSurvey(db, companyId, surveyId);
}

export async function setSurveyStatus(
  db: Database,
  companyId: number,
  id: number,
  status: unknown,
): Promise<Survey> {
  if (status !== "active" && status !== "closed") throw badRequest("Status inválido");
  const { changes } = await db.sql`
    UPDATE nps_surveys SET status = ${status} WHERE id = ${id} AND company_id = ${companyId}
  `;
  if (!changes) throw notFound();
  return getSurvey(db, companyId, id);
}

function tally(scores: number[]): Omit<QuestionScore, keyof Question> {
  const total = scores.length;
  if (total === 0) return { promoters: 0, passives: 0, detractors: 0, total: 0, nps: 0 };
  const promoters = scores.filter((s) => s >= 9).length;
  const passives = scores.filter((s) => s >= 7 && s <= 8).length;
  const detractors = scores.filter((s) => s <= 6).length;
  const nps = Math.round(((promoters - detractors) / total) * 100);
  return { promoters, passives, detractors, total, nps };
}

/** NPS de cada pergunta da pesquisa: %promotores − %detratores. */
export async function getSurveyQuestionScores(
  db: Database,
  companyId: number,
  surveyId: number,
): Promise<QuestionScore[]> {
  const questions = await questionsOf(db, surveyId);
  const result: QuestionScore[] = [];
  for (const q of questions) {
    const { rows } = await db.sql`
      SELECT score FROM nps_responses
      WHERE company_id = ${companyId} AND survey_id = ${surveyId} AND question_id = ${q.id}
    `;
    const scores = (rows as unknown as { score: number }[]).map((r) => r.score);
    result.push({ ...q, ...tally(scores) });
  }
  return result;
}
```

- [ ] **Step 4: Rodar e ver passar**

Run: `rtk npx vitest run server/services/nps/surveys.test.ts`
Expected: os testes do bloco `describe("surveys", ...)` passam. O bloco `describe("nps ciclo completo", ...)` ainda pode falhar (depende da Task 3) — resolvido lá.

- [ ] **Step 5: Commit**

```bash
rtk git add server/services/nps/surveys.ts server/services/nps/surveys.test.ts
rtk git commit -m "feat(nps): survey com N perguntas e score por pergunta

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 3: Serviço `invites.ts` — perguntas no convite e respostas em lote

**Files:**
- Modify: `server/services/nps/invites.ts`
- Test: `server/services/nps/surveys.test.ts` (bloco `describe("nps ciclo completo", ...)`)

**Interfaces:**
- Consumes: `getSurvey` com `questions` (Task 2); `nps_questions` (Task 1).
- Produces:
  - `interface PublicInvite { token; status; survey: { title; question; status; questions: { id: number; text: string }[] } }`
  - `submitPublicResponse(db, token, data: { answers?: { question_id: number; score: number; comment?: string }[]; score?: unknown; comment?: unknown }): Promise<{ ok: true }>` — aceita `answers[]`; retrocompat: se vier só `score`, aplica à primeira pergunta.

- [ ] **Step 1: Reescrever o teste do ciclo completo (falhando)**

Substituir o bloco `describe("nps ciclo completo", ...)` em `server/services/nps/surveys.test.ts` por:

```ts
describe("nps ciclo completo", () => {
  it("envia convite, responde perguntas por token e computa score por pergunta", async () => {
    const s = await createSurvey(db, CO, {
      title: "Q",
      questions: ["Recomendaria?", "Atendimento?"],
    });
    const [q1, q2] = s.questions;
    const res = await sendInvites(db, CO, s.id, { customerIds: [c1, c2] });
    expect(res.sent).toBe(2);

    const invites = await db.sql`SELECT token FROM nps_invites ORDER BY id`;
    const tokens = (invites.rows as { token: string }[]).map((r) => r.token);

    const pub = await getInviteByToken(db, tokens[0]);
    expect(pub.survey.title).toBe("Q");
    expect(pub.survey.questions.map((q) => q.text)).toEqual([
      "Recomendaria?",
      "Atendimento?",
    ]);
    expect(pub.status).toBe("sent");

    await submitPublicResponse(db, tokens[0], {
      answers: [
        { question_id: q1.id, score: 10, comment: "ótimo" },
        { question_id: q2.id, score: 8 },
      ],
    });
    await submitPublicResponse(db, tokens[1], {
      answers: [
        { question_id: q1.id, score: 3 },
        { question_id: q2.id, score: 6 },
      ],
    });

    const scores = await getSurveyQuestionScores(db, CO, s.id);
    const first = scores.find((x) => x.id === q1.id);
    if (!first) throw new Error("pergunta 1 ausente");
    expect(first.total).toBe(2);
    expect(first.promoters).toBe(1);
    expect(first.detractors).toBe(1);
    expect(first.nps).toBe(0);

    // uma mensagem por convite (tracking)
    const msgs = await db.sql`SELECT COUNT(*) AS n FROM messages`;
    expect(Number((msgs.rows as { n: number }[])[0].n)).toBe(2);
  });

  it("exige resposta para todas as perguntas e rejeita nota inválida", async () => {
    const s = await createSurvey(db, CO, {
      title: "Q",
      questions: ["A?", "B?"],
    });
    const [q1, q2] = s.questions;
    await sendInvites(db, CO, s.id, { customerIds: [c1] });
    const { token } = await db.sql`SELECT token FROM nps_invites LIMIT 1`.then(
      (r) => (r.rows as { token: string }[])[0],
    );

    // Nota fora do intervalo.
    await expect(
      submitPublicResponse(db, token, { answers: [{ question_id: q1.id, score: 42 }] }),
    ).rejects.toThrowError(/nota/i);
    // Falta responder q2.
    await expect(
      submitPublicResponse(db, token, { answers: [{ question_id: q1.id, score: 8 }] }),
    ).rejects.toThrowError(/todas as perguntas/i);

    // Resposta completa funciona e é idempotente por token.
    await submitPublicResponse(db, token, {
      answers: [
        { question_id: q1.id, score: 8 },
        { question_id: q2.id, score: 9 },
      ],
    });
    await expect(
      submitPublicResponse(db, token, {
        answers: [
          { question_id: q1.id, score: 9 },
          { question_id: q2.id, score: 9 },
        ],
      }),
    ).rejects.toThrowError(/respondido/i);
  });

  it("rejeita question_id de outra pesquisa", async () => {
    const s = await createSurvey(db, CO, { title: "Alvo", questions: ["A?"] });
    const other = await createSurvey(db, CO, { title: "Outra", questions: ["X?"] });
    await sendInvites(db, CO, s.id, { customerIds: [c1] });
    const { token } = await db.sql`SELECT token FROM nps_invites LIMIT 1`.then(
      (r) => (r.rows as { token: string }[])[0],
    );
    await expect(
      submitPublicResponse(db, token, {
        answers: [{ question_id: other.questions[0].id, score: 9 }],
      }),
    ).rejects.toThrowError(/pergunta/i);
  });

  it("token inexistente falha", async () => {
    await expect(getInviteByToken(db, "nope")).rejects.toThrowError(/não encontrado/i);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `rtk npx vitest run server/services/nps/surveys.test.ts`
Expected: FAIL — `pub.survey.questions` undefined / `submitPublicResponse` não aceita `answers`.

- [ ] **Step 3: Atualizar `PublicInvite` e `getInviteByToken`**

Em `server/services/nps/invites.ts`, substituir a interface `PublicInvite` (linhas ~20-24) por:

```ts
export interface PublicInvite {
  token: string;
  status: string;
  survey: {
    title: string;
    question: string;
    status: string;
    questions: { id: number; text: string }[];
  };
}
```

E substituir `getInviteByToken` (linhas ~98-124) por:

```ts
export async function getInviteByToken(
  db: Database,
  token: string,
): Promise<PublicInvite> {
  const { rows } = await db.sql`
    SELECT i.token, i.status, i.survey_id,
           s.title AS s_title, s.question AS s_question, s.status AS s_status
    FROM nps_invites i
    JOIN nps_surveys s ON s.id = i.survey_id
    WHERE i.token = ${token}
  `;
  const row = (
    rows as unknown as {
      token: string;
      status: string;
      survey_id: number;
      s_title: string;
      s_question: string;
      s_status: string;
    }[]
  )[0];
  if (!row) throw createError({ statusCode: 404, message: "Convite não encontrado" });

  const q = await db.sql`
    SELECT id, text FROM nps_questions
    WHERE survey_id = ${row.survey_id} ORDER BY position, id
  `;
  return {
    token: row.token,
    status: row.status,
    survey: {
      title: row.s_title,
      question: row.s_question,
      status: row.s_status,
      questions: q.rows as unknown as { id: number; text: string }[],
    },
  };
}
```

- [ ] **Step 4: Reescrever `submitPublicResponse`**

Em `server/services/nps/invites.ts`, substituir `submitPublicResponse` (linhas ~130-152) por:

```ts
export async function submitPublicResponse(
  db: Database,
  token: string,
  data: {
    answers?: unknown;
    score?: unknown;
    comment?: unknown;
  },
): Promise<{ ok: true }> {
  const { rows } = await db.sql`SELECT * FROM nps_invites WHERE token = ${token}`;
  const invite = (rows as unknown as Invite[])[0];
  if (!invite) throw createError({ statusCode: 404, message: "Convite não encontrado" });
  if (invite.status === "responded")
    throw createError({ statusCode: 409, message: "Este convite já foi respondido" });

  // Perguntas válidas do survey deste convite.
  const qRows = await db.sql`
    SELECT id FROM nps_questions WHERE survey_id = ${invite.survey_id} ORDER BY position, id
  `;
  const questionIds = (qRows.rows as unknown as { id: number }[]).map((r) => r.id);
  if (questionIds.length === 0)
    throw createError({ statusCode: 400, message: "Pesquisa sem perguntas" });

  // Retrocompat: {score} solto vira uma resposta para a primeira pergunta.
  const rawAnswers = Array.isArray(data.answers)
    ? data.answers
    : data.score !== undefined
      ? [{ question_id: questionIds[0], score: data.score, comment: data.comment }]
      : [];

  const parsed = rawAnswers.map((a) => {
    const answer = a as { question_id?: unknown; score?: unknown; comment?: unknown };
    const questionId = Number(answer.question_id);
    if (!questionIds.includes(questionId))
      throw badRequest("Pergunta inválida para esta pesquisa");
    const score = Number(answer.score);
    if (!Number.isInteger(score) || score < 0 || score > 10)
      throw badRequest("A nota deve ser entre 0 e 10");
    const comment = typeof answer.comment === "string" ? answer.comment.trim() : null;
    return { questionId, score, comment };
  });

  // Exige exatamente uma resposta por pergunta do survey.
  const answered = new Set(parsed.map((p) => p.questionId));
  if (answered.size !== questionIds.length || parsed.length !== questionIds.length)
    throw badRequest("Responda todas as perguntas");

  for (const p of parsed) {
    await db.sql`
      INSERT INTO nps_responses
        (company_id, customer_id, survey_id, invite_id, question_id, score, comment)
      VALUES
        (${invite.company_id}, ${invite.customer_id}, ${invite.survey_id},
         ${invite.id}, ${p.questionId}, ${p.score}, ${p.comment})
    `;
  }
  await db.sql`UPDATE nps_invites SET status = 'responded' WHERE id = ${invite.id}`;
  return { ok: true };
}
```

- [ ] **Step 5: Rodar toda a suíte de nps e ver passar**

Run: `rtk npx vitest run server/services/nps/surveys.test.ts server/services/nps/nps.test.ts`
Expected: PASS em ambos.

- [ ] **Step 6: Commit**

```bash
rtk git add server/services/nps/invites.ts server/services/nps/surveys.test.ts
rtk git commit -m "feat(nps): convite público expõe perguntas e recebe respostas em lote

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 4: Rotas da API

**Files:**
- Modify: `server/api/nps/surveys/index.post.ts`
- Modify: `server/api/nps/surveys/index.get.ts`
- Modify: `server/api/nps/public/[token].post.ts`

**Interfaces:**
- Consumes: `createSurvey`, `getSurveyQuestionScores`, `listSurveys` (Task 2); `submitPublicResponse` com `answers` (Task 3).
- Produces: `GET /nps/surveys` retorna cada survey com `questions[]` onde cada pergunta inclui os campos de score (`promoters`, `passives`, `detractors`, `total`, `nps`). `POST /nps/surveys` aceita `{ title, questions }`. `POST /nps/public/:token` aceita `{ answers }`.

- [ ] **Step 1: `index.post` aceita `questions`**

Substituir `server/api/nps/surveys/index.post.ts` por:

```ts
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
```

- [ ] **Step 2: `index.get` anexa score por pergunta**

Substituir `server/api/nps/surveys/index.get.ts` por:

```ts
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
```

- [ ] **Step 3: `public/[token].post` repassa `answers`**

Substituir `server/api/nps/public/[token].post.ts` por:

```ts
import { defineEventHandler, getRouterParam, readBody } from "h3";
import { useDatabase } from "nitro/database";
import { submitPublicResponse } from "../../../services/nps/invites";

// Rota pública — recebe as respostas do NPS via token, sem autenticação.
export default defineEventHandler(async (event) => {
  const token = getRouterParam(event, "token") ?? "";
  const body = await readBody<{
    answers?: { question_id: number; score: number; comment?: string }[];
    score?: number;
    comment?: string;
  }>(event);
  return submitPublicResponse(useDatabase(), token, {
    answers: body?.answers,
    score: body?.score,
    comment: body?.comment,
  });
});
```

- [ ] **Step 4: Verificar typecheck e testes existentes**

Run: `rtk npx vitest run server/`
Expected: PASS (nenhuma rota tem teste unitário; a checagem garante que os serviços consumidos batem com as assinaturas).

- [ ] **Step 5: Commit**

```bash
rtk git add server/api/nps/surveys/index.post.ts server/api/nps/surveys/index.get.ts server/api/nps/public/\[token\].post.ts
rtk git commit -m "feat(nps): rotas de survey e resposta pública com múltiplas perguntas

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 5: Frontend — API client, criação e card por pergunta

**Files:**
- Modify: `src/services/npsApi.ts`
- Modify: `src/pages/Surveys.tsx`

**Interfaces:**
- Consumes: rotas da Task 4.
- Produces:
  - `interface QuestionScore { id; text; position; promoters; passives; detractors; total; nps }`
  - `interface Survey { id; company_id; title; question; status; created_at; questions: QuestionScore[] }`
  - `npsApi.createSurvey({ title: string; questions: string[] })`
  - (usado pela Task 6) `PublicInvite.survey.questions: { id: number; text: string }[]`; `npsPublicApi.respond(token, answers: { question_id: number; score: number; comment?: string }[])`.

- [ ] **Step 1: Atualizar `npsApi.ts`**

Substituir `src/services/npsApi.ts` por:

```ts
import { api } from "./api";

export interface QuestionScore {
  id: number;
  text: string;
  position: number;
  promoters: number;
  passives: number;
  detractors: number;
  total: number;
  nps: number;
}

export interface Survey {
  id: number;
  company_id: number;
  title: string;
  question: string;
  status: string;
  created_at: string;
  questions: QuestionScore[];
}

export interface PublicInvite {
  token: string;
  status: string;
  survey: {
    title: string;
    question: string;
    status: string;
    questions: { id: number; text: string }[];
  };
}

export interface PublicAnswer {
  question_id: number;
  score: number;
  comment?: string;
}

export interface DispatchResult {
  sent: number;
  failed: number;
  total: number;
}

export const npsApi = {
  listSurveys: () => api.get<Survey[]>("/nps/surveys"),
  createSurvey: (input: { title: string; questions: string[] }) =>
    api.post<Survey>("/nps/surveys", input),
  setStatus: (id: number, status: "active" | "closed") =>
    api.patch<Survey>(`/nps/surveys/${id}`, { status }),
  sendInvites: (surveyId: number, customerIds: number[], channel: "email" | "sms") =>
    api.post<DispatchResult>(`/nps/surveys/${surveyId}/invites`, {
      customerIds,
      channel,
    }),
};

export const npsPublicApi = {
  getInvite: (token: string) => api.get<PublicInvite>(`/nps/public/${token}`),
  respond: (token: string, answers: PublicAnswer[]) =>
    api.post<{ ok: true }>(`/nps/public/${token}`, { answers }),
};
```

- [ ] **Step 2: Form dinâmico de perguntas em `Surveys.tsx`**

Em `src/pages/Surveys.tsx`, trocar o estado do form e o handler de criação. Substituir a linha `const [form, setForm] = useState({ title: "", question: "" });` (linha ~149) por:

```tsx
  const [title, setTitle] = useState("");
  const [questions, setQuestions] = useState<string[]>([""]);
```

Substituir `handleCreate` (linhas ~166-179) por:

```tsx
  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      const cleaned = questions.map((q) => q.trim()).filter(Boolean);
      await npsApi.createSurvey({ title, questions: cleaned });
      setTitle("");
      setQuestions([""]);
      setShowForm(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar");
    } finally {
      setSubmitting(false);
    }
  }
```

- [ ] **Step 3: Renderizar o form com lista dinâmica**

Substituir o bloco do `<form onSubmit={handleCreate}>` (o `<Card>` de criação, linhas ~211-236) por:

```tsx
      {showForm && (
        <Card p={6} mb={5}>
          <form onSubmit={handleCreate}>
            <Stack gap={4}>
              <TextField
                label="Título"
                value={title}
                onChange={setTitle}
                placeholder="Satisfação Q3"
                required
              />
              <Stack gap={2}>
                <Text fontSize="sm" fontWeight="500" color="#52525B">
                  Perguntas (escala 0-10)
                </Text>
                {questions.map((q, i) => (
                  <Flex key={i} gap={2} align="center">
                    <Box flex={1}>
                      <TextField
                        label=""
                        value={q}
                        onChange={(v) =>
                          setQuestions((prev) =>
                            prev.map((item, idx) => (idx === i ? v : item)),
                          )
                        }
                        placeholder="De 0 a 10, o quanto você recomendaria a gente?"
                      />
                    </Box>
                    {questions.length > 1 && (
                      <GhostButton
                        type="button"
                        onClick={() =>
                          setQuestions((prev) => prev.filter((_, idx) => idx !== i))
                        }
                      >
                        Remover
                      </GhostButton>
                    )}
                  </Flex>
                ))}
                <Box>
                  <GhostButton
                    type="button"
                    onClick={() => setQuestions((prev) => [...prev, ""])}
                  >
                    + Adicionar pergunta
                  </GhostButton>
                </Box>
              </Stack>
              <Flex justify="flex-end">
                <PrimaryButton type="submit" loading={submitting}>
                  Criar pesquisa
                </PrimaryButton>
              </Flex>
            </Stack>
          </form>
        </Card>
      )}
```

- [ ] **Step 4: Card com NPS por pergunta**

Em `src/pages/Surveys.tsx`, ajustar `ScoreBar` para tipar por `QuestionScore` e substituir o miolo do card. Trocar a assinatura de `ScoreBar` (linha ~16) por:

```tsx
function ScoreBar({ score }: { score: Survey["questions"][number] }) {
```

Substituir o bloco `<Flex align="flex-start" gap={4}>` até o fechamento do `<Box mt={4}>` do ScoreBar (linhas ~250-293), ou seja, o cabeçalho + score único + barra, por um cabeçalho simples e uma lista por pergunta:

```tsx
              <Flex align="center" gap={2.5} mb={1}>
                <Text fontSize="md" fontWeight="600" color="#1A1A1E">
                  {s.title}
                </Text>
                <Badge tone={s.status === "active" ? "green" : "gray"}>
                  {s.status === "active" ? "Ativa" : "Fechada"}
                </Badge>
              </Flex>

              <Stack gap={4} mt={4}>
                {s.questions.map((q) => (
                  <Box key={q.id}>
                    <Flex align="flex-start" gap={4}>
                      <Text fontSize="sm" color="#52525B" flex={1} minW={0}>
                        {q.text}
                      </Text>
                      <Box textAlign="right" flexShrink={0}>
                        <Text
                          fontFamily="heading"
                          fontSize="2xl"
                          fontWeight="600"
                          color="#1A1A1E"
                          lineHeight="1"
                        >
                          {q.nps}
                        </Text>
                        <Text fontSize="xs" color="#A1A1AA">
                          NPS · {q.total} resp.
                        </Text>
                      </Box>
                    </Flex>
                    <Box mt={2}>
                      <ScoreBar score={q} />
                      <Flex gap={4} mt={2}>
                        <Text fontSize="xs" color="#059669">
                          ● {q.promoters} promotores
                        </Text>
                        <Text fontSize="xs" color="#D97706">
                          ● {q.passives} neutros
                        </Text>
                        <Text fontSize="xs" color="#DC2626">
                          ● {q.detractors} detratores
                        </Text>
                      </Flex>
                    </Box>
                  </Box>
                ))}
              </Stack>
```

Observação: o `ScoreBar` interno usa `score.detractors/passives/promoters/total` — todos presentes em `QuestionScore`, sem outra mudança.

- [ ] **Step 5: Rodar typecheck/build do client**

Run: `rtk npm run build`
Expected: build sem erros de tipo em `Surveys.tsx` / `npsApi.ts`.

- [ ] **Step 6: Commit**

```bash
rtk git add src/services/npsApi.ts src/pages/Surveys.tsx
rtk git commit -m "feat(nps): criação com N perguntas e card de NPS por pergunta

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

### Task 6: Frontend — formulário público responde N perguntas

**Files:**
- Modify: `src/pages/PublicNps.tsx`

**Interfaces:**
- Consumes: `PublicInvite.survey.questions` e `npsPublicApi.respond(token, answers)` (Task 5).
- Produces: tela pública funcional que coleta uma nota 0-10 (e comentário opcional) por pergunta e envia todas juntas.

- [ ] **Step 1: Estado por pergunta e submit em lote**

Em `src/pages/PublicNps.tsx`, substituir os estados `score`/`comment` (linhas ~20-21) por um mapa por pergunta:

```tsx
  const [scores, setScores] = useState<Record<number, number>>({});
  const [comments, setComments] = useState<Record<number, string>>({});
```

Substituir a função `submit` (linhas ~36-48) por:

```tsx
  const allAnswered =
    invite != null &&
    invite.survey.questions.length > 0 &&
    invite.survey.questions.every((q) => scores[q.id] != null);

  async function submit() {
    if (!invite || !allAnswered) return;
    setSubmitting(true);
    setError(null);
    try {
      const answers = invite.survey.questions.map((q) => ({
        question_id: q.id,
        score: scores[q.id],
        comment: comments[q.id]?.trim() || undefined,
      }));
      await npsPublicApi.respond(token, answers);
      setDone(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro ao enviar");
    } finally {
      setSubmitting(false);
    }
  }
```

- [ ] **Step 2: Renderizar uma escala por pergunta**

Substituir o bloco de conteúdo do formulário — do `<Stack gap={5}>` que começa em ~88 até o `<Textarea .../>` (antes do bloco de erro `{error && ...}`) — por:

```tsx
            <Stack gap={6}>
              <Text fontFamily="heading" fontSize="lg" fontWeight="600" color="#1A1A1E">
                {invite.survey.title}
              </Text>

              {invite.survey.questions.map((q) => (
                <Stack key={q.id} gap={3}>
                  <Text fontSize="sm" color="#52525B" lineHeight="1.5">
                    {q.text}
                  </Text>
                  <Flex flexWrap="wrap" gap={1.5} justify="center">
                    {SCALE.map((n) => (
                      <Pressable
                        key={n}
                        type="button"
                        w="36px"
                        h="36px"
                        rounded="lg"
                        fontSize="sm"
                        fontWeight="600"
                        textAlign="center"
                        borderWidth="1px"
                        borderColor={scores[q.id] === n ? scoreColor(n) : "rgba(0,0,0,0.12)"}
                        bg={scores[q.id] === n ? scoreColor(n) : "#FFFFFF"}
                        color={scores[q.id] === n ? "#FFFFFF" : "#52525B"}
                        transition="all 0.12s ease"
                        onClick={() => setScores((prev) => ({ ...prev, [q.id]: n }))}
                      >
                        {n}
                      </Pressable>
                    ))}
                  </Flex>
                  <Textarea
                    value={comments[q.id] ?? ""}
                    onChange={(e) =>
                      setComments((prev) => ({ ...prev, [q.id]: e.target.value }))
                    }
                    placeholder="Quer deixar um comentário? (opcional)"
                    minH="72px"
                    rounded="lg"
                    borderColor="rgba(0,0,0,0.12)"
                    fontSize="sm"
                    _focusVisible={{
                      borderColor: "#059669",
                      boxShadow: "0 0 0 3px rgba(5,150,105,0.14)",
                      outline: "none",
                    }}
                  />
                </Stack>
              ))}

              {error && (
                <Text fontSize="sm" color="#B91C1C">
                  {error}
                </Text>
              )}

              <PrimaryButton loading={submitting} disabled={!allAnswered} onClick={submit}>
                Enviar resposta
              </PrimaryButton>
            </Stack>
```

- [ ] **Step 3: Build do client**

Run: `rtk npm run build`
Expected: build sem erros de tipo em `PublicNps.tsx`.

- [ ] **Step 4: Verificação end-to-end manual**

Subir o app (ver skill `run`), criar uma pesquisa com 2 perguntas, enviar convite a um contato, abrir o link `/nps/:token`, responder as 2 escalas e enviar. Confirmar tela de "Obrigado" e, na tela NPS admin, o card mostrando NPS por pergunta.

- [ ] **Step 5: Commit**

```bash
rtk git add src/pages/PublicNps.tsx
rtk git commit -m "feat(nps): formulário público responde múltiplas perguntas

Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>"
```

---

## Notas finais

- `getNpsSummary` (`server/services/nps/nps.ts`) e `analytics.ts` continuam agregando linhas de `nps_responses` sem alteração — com múltiplas perguntas passam a somar todas as respostas da empresa (comportamento aceito, fora de escopo refinar).
- A retrocompat em `createSurvey` (`question` string) e `submitPublicResponse` (`score` solto) evita quebrar chamadas legadas e mantém o card e o convite antigos funcionando durante a transição.
