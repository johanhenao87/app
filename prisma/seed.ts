import { PrismaClient } from '@prisma/client'
const prisma = new PrismaClient()

async function main() {
  await prisma.reglas_agendamiento.createMany({
    data: [
      { nombre: 'turnos_por_slot',        valor: 6, descripcion: 'Cantidad de turnos permitidos por franja horaria normal' },
      { nombre: 'turnos_por_caja_rapida', valor: 1, descripcion: 'Cantidad de turnos permitidos por franja de caja rápida' },
    ],
    skipDuplicates: true,
  })

  await prisma.parametros_agendamiento.createMany({
    data: [
      { clave: 'hora_inicio_normal',      valor: '06:00', descripcion: 'Hora inicio agendamiento normal' },
      { clave: 'hora_fin_normal',         valor: '18:00', descripcion: 'Hora fin agendamiento normal' },
      { clave: 'hora_inicio_caja_rapida', valor: '06:00', descripcion: 'Hora inicio agendamiento caja rápida' },
      { clave: 'hora_fin_caja_rapida',    valor: '18:00', descripcion: 'Hora fin agendamiento caja rápida' },
    ],
    skipDuplicates: true,
  })

  console.log('✅ Seed ejecutado: reglas y parámetros iniciales creados')
}

main()
  .then(async () => { await prisma.$disconnect() })
  .catch(async (e) => {
    console.error('❌ Error en seed:', e)
    await prisma.$disconnect()
    process.exit(1)
  })
