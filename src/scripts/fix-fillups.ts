import { prisma } from "../prisma";

const MIN = 300;
const MAX = 4000;
const APPLY = process.argv.includes("--apply");

async function main() {
  const bad = await prisma.fuelFillUp.findMany({
    where: { pricePerLiter: { lt: MIN } },
    orderBy: { filledAt: "asc" }
  });

  if (bad.length === 0) {
    console.log("No hay cargas con precio por litro sospechoso.");
    return;
  }

  console.log(`Cargas sospechosas: ${bad.length}\n`);

  let fixable = 0;
  let manual = 0;

  for (const f of bad) {
    const liters = Number(f.liters);
    const oldTotal = Number(f.totalCost);
    const fixedTotal = oldTotal * 1000;
    const fixedPrice = fixedTotal / liters;
    const ok = fixedPrice >= MIN && fixedPrice <= MAX;

    console.log(
      `${f.id} | ${f.filledAt.toISOString()} | ${liters} L | ` +
      `total ${oldTotal} -> ${fixedTotal} | precio ${fixedPrice.toFixed(0)} | ` +
      (ok ? "ARREGLABLE" : "REVISAR A MANO")
    );

    if (ok) {
      fixable++;
      if (APPLY) {
        await prisma.fuelFillUp.update({
          where: { id: f.id },
          data: { totalCost: fixedTotal, pricePerLiter: fixedPrice }
        });
      }
    } else {
      manual++;
    }
  }

  console.log(
    `\nArreglables: ${fixable} | A mano: ${manual} | ` +
    (APPLY ? "CAMBIOS APLICADOS" : "Simulación (no se cambió nada). Usa --apply para aplicar.")
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());