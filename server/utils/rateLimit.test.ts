import { beforeEach, describe, expect, it } from "vitest";
import { _resetRateLimit, rateLimit } from "./rateLimit";

beforeEach(() => _resetRateLimit());

describe("rateLimit", () => {
  it("permite até o limite e bloqueia depois", () => {
    for (let i = 0; i < 10; i++) rateLimit("k", 10, 1000, 0);
    expect(() => rateLimit("k", 10, 1000, 0)).toThrowError(/muitas tentativas/i);
  });

  it("reseta após a janela", () => {
    for (let i = 0; i < 10; i++) rateLimit("k", 10, 1000, 0);
    expect(() => rateLimit("k", 10, 1000, 500)).toThrowError();
    // após a janela (>= 1000) reabre
    expect(() => rateLimit("k", 10, 1000, 1000)).not.toThrow();
  });

  it("isola chaves diferentes", () => {
    for (let i = 0; i < 10; i++) rateLimit("a", 10, 1000, 0);
    expect(() => rateLimit("b", 10, 1000, 0)).not.toThrow();
  });
});
