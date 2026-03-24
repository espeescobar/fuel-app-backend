import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // MVP: mantenemos un solo auto. Si ya existe, no hacemos nada.
  await prisma.vehicle.upsert({
    where: { name: "Auto 1" },
    update: {},
    create: { name: "Auto 1" }
  });
}


main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

