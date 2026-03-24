import { prisma } from "../prisma";

export async function getDefaultVehicleId() {
  // MVP: se asume un solo auto con nombre fijo.
  const vehicle = await prisma.vehicle.findUnique({ where: { name: "Auto 1" } });
  if (!vehicle) {
    throw new Error("Default vehicle not found. Run prisma seed.");
  }
  return vehicle.id;
}

