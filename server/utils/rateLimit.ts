import { createError, getRequestIP, type H3Event } from "h3";

interface Bucket {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, Bucket>();

/**
 * Rate limit em memória (janela fixa). Suficiente para o MVP monolítico —
 * não sobrevive a restart nem escala horizontal (fora de escopo por ora).
 * Lança 429 ao estourar o limite.
 */
export function rateLimit(
  key: string,
  limit: number,
  windowMs: number,
  now: number = Date.now(),
): void {
  const bucket = buckets.get(key);
  if (!bucket || now >= bucket.resetAt) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return;
  }
  bucket.count += 1;
  if (bucket.count > limit) {
    const retry = Math.ceil((bucket.resetAt - now) / 1000);
    throw createError({
      statusCode: 429,
      message: `Muitas tentativas. Tente novamente em ${retry}s.`,
    });
  }
}

export function clientIp(event: H3Event): string {
  return getRequestIP(event, { xForwardedFor: true }) ?? "unknown";
}

/** Aplica o rate limit de autenticação (login/register) por IP. */
export function authRateLimit(event: H3Event, scope: string): void {
  rateLimit(`${scope}:${clientIp(event)}`, 10, 60_000);
}

/** Apenas para testes: limpa o estado interno. */
export function _resetRateLimit(): void {
  buckets.clear();
}
