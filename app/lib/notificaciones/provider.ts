import { Canal } from "./templates";

export type SendResult = { ok: boolean; error?: string };

export interface NotificationProvider {
  send(params: { canal: Canal; to: string; text: string }): Promise<SendResult>;
}

/**
 * Proveedor demo: solo imprime en consola. Útil para desarrollo.
 * Luego podrás sustituir por Twilio, WhatsApp Cloud API, SMTP, etc.
 */
export class DemoProvider implements NotificationProvider {
  async send({ canal, to, text }: { canal: Canal; to: string; text: string }): Promise<SendResult> {
    try {
      // Simula latencia breve
      await new Promise((r) => setTimeout(r, 50));
      console.log(`[DEMO ${canal.toUpperCase()}] -> ${to}\n${text}\n---`);
      return { ok: true };
    } catch (e: any) {
      return { ok: false, error: e?.message || "unknown error" };
    }
  }
}
