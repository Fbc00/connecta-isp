# NPS com múltiplas perguntas — Design

**Data:** 2026-07-09
**Status:** Aprovado

## Objetivo

Permitir que uma pesquisa de NPS tenha **N perguntas**, cada uma com sua
própria escala **0-10**. O respondente vê todas as perguntas num único
formulário e responde cada uma. O índice NPS é calculado **por pergunta**.

## Estado atual

- `nps_surveys` tem uma única coluna `question` (texto).
- `nps_responses` tem um único `score` (0-10) + `comment` por convite.
- Convite (`nps_invites`) por token único; um token responde uma vez.
- Card em `Surveys.tsx` mostra 1 número NPS por pesquisa.

## Modelo de dados

### Nova tabela `nps_questions`

```
id          INTEGER PK AUTOINCREMENT
company_id  INTEGER NOT NULL REFERENCES companies(id)
survey_id   INTEGER NOT NULL REFERENCES nps_surveys(id)
text        TEXT    NOT NULL
position    INTEGER NOT NULL DEFAULT 0
created_at  TEXT    NOT NULL DEFAULT (datetime('now'))
```

### `nps_responses` — adiciona coluna

```
question_id INTEGER REFERENCES nps_questions(id)
```

Cada linha passa a representar a resposta de **uma** pergunta. Uma pesquisa
com 3 perguntas gera até 3 linhas por convite respondido (mesmo `invite_id`,
`question_id` distinto).

### Migração (idempotente, em `migrateSchema`)

1. `addColumnIfMissing(nps_responses, question_id, "INTEGER")`.
2. Para cada survey **sem** perguntas em `nps_questions`, inserir uma pergunta
   `position = 0` com `text = nps_surveys.question`.
3. Backfill: `nps_responses.question_id` das respostas antigas aponta para a
   pergunta migrada do respectivo survey.
4. Manter a coluna `nps_surveys.question` (retrocompat + texto do e-mail de
   convite). Passa a ser tratada como "primeira pergunta".

Nenhum dado existente é perdido.

## Backend — services

### `services/nps/surveys.ts`

- `createSurvey(db, companyId, { title, questions })`:
  - `questions: string[]` com no mínimo 1 item não vazio.
  - Retrocompat: se vier `question: string` (legado), converte em `[question]`.
  - Se nada vier, usa a pergunta padrão atual.
  - Insere o survey e, em seguida, N linhas em `nps_questions` (`position`
    sequencial). Grava a primeira pergunta em `nps_surveys.question`.
- `getSurvey`: retorna o survey acrescido de `questions: { id, text, position }[]`
  ordenadas por `position`.
- Substituir `getSurveyScore` por `getSurveyQuestionScores(db, companyId, surveyId)`
  → `Array<{ question_id, text, promoters, passives, detractors, total, nps }>`.
  Fórmula por pergunta idêntica à atual (`%promotores − %detratores`).

### `services/nps/invites.ts`

- `PublicInvite.survey` passa a incluir `questions: { id, text }[]`.
- `getInviteByToken`: retorna o survey + suas perguntas.
- `submitPublicResponse(db, token, { answers })`:
  - `answers: { question_id, score, comment? }[]`.
  - Valida: cada `question_id` pertence ao survey do convite; cada `score`
    inteiro 0-10; exige uma resposta para **todas** as perguntas do survey.
  - Insere uma linha em `nps_responses` por pergunta.
  - Marca o convite como `responded`. Idempotente por token (409 se já
    respondido), como hoje.
- `sendInvites`: e-mail/SMS usa `survey.title` + a primeira pergunta. Sem
  mudança visível no envio.

### `services/admin/analytics.ts` e dashboard

Apenas contam/agregam linhas de `nps_responses`. Continuam funcionando (mais
linhas, mesma lógica). Sem alteração.

## Backend — rotas

- `api/nps/surveys/index.post.ts`: repassa `questions` do body.
- `api/nps/surveys/index.get.ts`: anexa `questionScores` (via
  `getSurveyQuestionScores`) no lugar de `score`.
- `api/nps/public/[token].get.ts`: retorna survey + perguntas.
- `api/nps/public/[token].post.ts`: recebe `{ answers }` e repassa.

## Frontend

### `services/npsApi.ts`

- `Survey.questions: { id, text, position, score: SurveyScore }[]` (remove
  `score` no nível do survey; mantém tipo `SurveyScore`).
- `createSurvey({ title, questions: string[] })`.
- `PublicInvite.survey.questions: { id, text }[]`.
- `npsPublicApi.respond(token, answers)` com `answers: { question_id, score, comment? }[]`.

### `pages/Surveys.tsx`

- Form de criação: lista **dinâmica** de perguntas (adicionar / remover, mín. 1)
  além do título.
- Card: para cada pergunta, exibe seu texto, número NPS, `ScoreBar` e a legenda
  promotores / neutros / detratores. `ScoreBar` reaproveitado por pergunta.

### `pages/PublicNps.tsx`

- Renderiza cada pergunta com a escala 0-10 (componente atual reaproveitado) e
  um campo de comentário próprio.
- Botão "Enviar" desabilitado até todas as perguntas terem nota.
- Envia todas as respostas em uma requisição.

## Testes

- `surveys.test.ts`: criar survey com N perguntas; `getSurveyQuestionScores`
  por pergunta; retrocompat de `question` string única.
- `nps.test.ts` / `db.test.ts`: migração cria pergunta e faz backfill;
  `submitPublicResponse` valida respostas parciais (rejeita se faltar
  pergunta), rejeita `question_id` de outro survey, idempotência por token.

## Fora de escopo (YAGNI)

- Tipos de pergunta além de escala 0-10 (texto livre, múltipla escolha, estrelas).
- Pergunta "principal" / índice único agregado da pesquisa.
- Edição de perguntas após criação da pesquisa.
