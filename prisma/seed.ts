import { PrismaClient } from "@prisma/client";
import bcrypt from "bcrypt"; 

const prisma = new PrismaClient();

async function main() {
  // --- PASO 1: Encriptar contraseñas ---
  // Generamos un código seguro para las contraseñas
  const hashEspe = await bcrypt.hash("Meev2003", 10);
  const hashTomas = await bcrypt.hash("Teev2007", 10);

  // --- PASO 2: Crear o actualizar los usuarios ---
  const user1 = await prisma.user.upsert({
    where: { email: "espi.escobar@gmail.com" },
    update: {}, // Si ya existe, no hacemos cambios
    create: {
      email: "espi.escobar@gmail.com",
      name: "Espe",
      passwordHash: hashEspe 
    }
  });

  const user2 = await prisma.user.upsert({
    where: { email: "tomas.escobar@outlook.com" },
    update: {},
    create: {
      email: "tomas.escobar@outlook.com",
      name: "Tomás",
      passwordHash: hashTomas 
    }
  });

  console.log(`👤 Usuarios asegurados: ${user1.name} y ${user2.name}`);
  
  // --- PASO 3: Crear o actualizar el vehículo ---
  const vehicle = await prisma.vehicle.upsert({
    where: { name: "Auto 1" },
    update: {},
    create: { name: "Auto 1" }
  });

  console.log(`🚗 Vehículo asegurado: ${vehicle.name}`);
  console.log("✅ Seed completado. Base de datos inicializada con usuarios y vehículo.");
}

// --- PASO 4: Ejecución del script ---
main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error("❌ Error ejecutando el seed:", e);
    await prisma.$disconnect();
    process.exit(1);
  });