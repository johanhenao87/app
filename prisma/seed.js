// prisma/seed.js
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function main() {
  // Reglas numéricas -> tabla reglas_agendamiento (valor = Int)
  await prisma.reglas_agendamiento.createMany({
    data: [
      { nombre: 'turnos_por_slot',        valor: 6, descripcion: 'Turnos por franja normal' },
      { nombre: 'turnos_por_caja_rapida', valor: 1, descripcion: 'Turnos por franja de caja rápida' },
    ],
    skipDuplicates: true,
  })

  // Parámetros string -> tabla parametros_agendamiento (valor = String)
  await prisma.parametros_agendamiento.createMany({
    data: [
      { clave: 'hora_inicio_normal',      valor: '06:00', descripcion: 'Inicio normal' },
      { clave: 'hora_fin_normal',         valor: '18:00', descripcion: 'Fin normal' },
      { clave: 'hora_inicio_caja_rapida', valor: '06:00', descripcion: 'Inicio CR' },
      { clave: 'hora_fin_caja_rapida',    valor: '18:00', descripcion: 'Fin CR' },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seed ejecutado: reglas + parámetros cargados')
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(async () => { await prisma.$disconnect() })
