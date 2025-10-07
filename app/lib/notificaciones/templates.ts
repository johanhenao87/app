export type NotificacionTipo = "reprogramado" | "cancelado" | "prioridad" | "rollover";
export type Canal = "sms" | "whatsapp" | "email";

export type TemplateContext = {
  turnoId: number;
  fecha: string;   // YYYY-MM-DD
  hora: string;    // HH:mm
  placa?: string | null;
  conductor?: { nombre?: string | null; telefono?: string | null; correo?: string | null };
  motivo_admin?: string | null;
};

export function renderTemplate(tipo: NotificacionTipo, ctx: TemplateContext) {
  const base = `[Planta 1]`;
  const intro = ctx.conductor?.nombre ? ` Hola ${ctx.conductor?.nombre},` : "";
  const when = ` ${ctx.fecha} a las ${ctx.hora}`;
  const placaTxt = ctx.placa ? ` (placa ${ctx.placa})` : "";
  const motivo = ctx.motivo_admin ? ` Motivo: ${ctx.motivo_admin}.` : "";

  switch (tipo) {
    case "reprogramado":
      return `${base}${intro} tu turno${placaTxt} ha sido reprogramado para el ${when}.${motivo}`;
    case "cancelado":
      return `${base}${intro} tu turno${placaTxt} fue cancelado.${motivo}`;
    case "prioridad":
      return `${base}${intro} tu turno${placaTxt} cambió por prioridad operativa. Nueva cita: ${when}.${motivo}`;
    case "rollover":
      return `${base}${intro} tu turno${placaTxt} fue movido por represamiento. Nueva cita: ${when}.${motivo}`;
    default:
      return `${base}${intro} actualización de turno${placaTxt}: ${when}.${motivo}`;
  }
}
