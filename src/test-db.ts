import { prisma } from "./db";

async function main() {
  try {
    const products = await prisma.products.findMany();

    console.log("✅ Database connected!");
    console.log("Products found:", products.length);
    console.log(products);
  } catch (error) {
    console.error("❌ Database connection failed:");
    console.error(error);
  } finally {
    await prisma.$disconnect();
  }
}

main();