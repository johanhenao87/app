# Pendientes del panel administrativo

## Integración de hooks del scaffold
- La página principal de administración sigue manejando el PIN, los filtros y la carga de turnos de forma local. Todavía no aprovecha los hooks `useAdminGate`, `useTurnos` ni `useToasts`, por lo que la lógica de acceso, fetching y notificaciones no está centralizada ni reutilizable.【F:app/admin/page.tsx†L43-L163】【F:app/admin/hooks/useAdminGate.ts†L1-L39】【F:app/admin/hooks/useTurnos.ts†L1-L44】【F:app/admin/hooks/useToasts.ts†L1-L41】

## Toasts y estados de carga
- Aunque el layout monta el componente `<Toaster />`, la pantalla continúa utilizando estados locales `msg`/`error` y `alert` en lugar de despachar toasts, de modo que nunca se muestran notificaciones emergentes coherentes.【F:app/admin/page.tsx†L54-L188】【F:app/admin/ui/Toasts.tsx†L1-L41】
- El componente `SkeletonRow` no se usa en las tablas, por lo que la experiencia de carga sigue sin esqueleto visual cuando `loading` es verdadero.【F:app/admin/page.tsx†L74-L90】【F:app/admin/ui/SkeletonRow.tsx†L1-L13】

## Separación de responsabilidades
- La tabla y los modales siguen llamando a helpers API directamente desde la página. Sería conveniente mover estas operaciones a acciones reutilizables o a un servicio que también se encargue de mostrar toasts y refrescar los datos a través de `useTurnos`.【F:app/admin/page.tsx†L102-L263】
- Falta exponer un `refetch` y control de estados compartido (busy text, errores) a través de un store o hook para evitar prop drilling a los componentes hijos cuando se añadan formularios de creación/edición.【F:app/admin/page.tsx†L54-L263】

## Theming y layout
- El layout aplica variables CSS `--background`/`--foreground`, pero todavía no hay un lugar que inicialice estos valores en SSR/estático; se requeriría hidratar la preferencia al cargar la página para evitar el "flash" de tema.【F:app/admin/layout/AdminLayout.tsx†L15-L28】【F:app/admin/hooks/useTheme.ts†L5-L48】
- El topbar sólo muestra un título genérico; falta conectar los datos reales (fecha seleccionada, KPI, nombre del usuario) que estaban previstos en los diseños originales.【F:app/admin/layout/AdminTopbar.tsx†L7-L26】【F:app/admin/page.tsx†L49-L213】

## Próximos pasos sugeridos
1. Reescribir `app/admin/page.tsx` para consumir `useAdminGate`, `useTurnos` y `useToasts`, eliminando lógica duplicada y usando toasts para feedback.
2. Integrar `SkeletonRow` y estados de carga en `TurnosTable` y vistas relacionadas.
3. Crear un wrapper de acciones (crear, editar, cancelar, etc.) que combine llamadas API con toasts y refresco automático.
4. Inicializar el tema desde `_app` o mediante `useEffect` en el layout para evitar parpadeos.
5. Completar el topbar con información contextual (usuario/KPI) y exponer controles responsive desde el sidebar.
