import { randomUUID } from "node:crypto";

export type Channel = "email" | "sms";

export interface OutgoingMessage {
  to: string;
  channel: Channel;
  subject: string;
  body: string;
}

export interface SendResult {
  providerId: string;
  status: "sent" | "failed";
}

export interface MessageProvider {
  readonly name: string;
  send(msg: OutgoingMessage): Promise<SendResult>;
}

/**
 * Provider padrão do MVP: não integra com nada externo, apenas gera um id e
 * marca como enviado. Serve para desenvolver o fluxo sem custo/chaves.
 */
export const MockProvider: MessageProvider = {
  name: "mock",
  async send(msg) {
    // destino vazio => falha; caso contrário, "envia" com sucesso
    if (!msg.to) return { providerId: "", status: "failed" };
    return { providerId: `mock-${randomUUID()}`, status: "sent" };
  },
};

/**
 * Stub plugável para providers reais. Ativado via env (RESEND/SENDGRID/TWILIO).
 * No MVP lança erro claro se selecionado sem configuração real.
 */
function stubProvider(name: string): MessageProvider {
  return {
    name,
    async send() {
      throw new Error(`Provider "${name}" ainda não implementado (defina as chaves)`);
    },
  };
}

/**
 * Resolve o provider a partir do env. Default: mock.
 * MESSAGE_PROVIDER=resend|sendgrid|twilio ativa os stubs plugáveis.
 */
export function getProvider(_channel: Channel): MessageProvider {
  const selected = (process.env.MESSAGE_PROVIDER ?? "mock").toLowerCase();
  switch (selected) {
    case "resend":
      return stubProvider("resend");
    case "sendgrid":
      return stubProvider("sendgrid");
    case "twilio":
      return stubProvider("twilio");
    default:
      return MockProvider;
  }
}
