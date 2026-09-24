import { prisma } from "../db.js";

const cleanText = (text: string) => {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
};

export const generateSku = async (
  productName: string,
  brand: string,
  categoryId: number
) => {
  // Get category
  const category =
    await prisma.categories.findUnique({
      where: {
        id: categoryId,
      },
    });

  if (!category) {
    throw new Error("Category not found");
  }

  // Category prefix
  const categoryPrefix = cleanText(
    category.name
  ).slice(0, 3);

  // Brand prefix
  const brandPrefix = cleanText(
    brand
  ).slice(0, 4);

  // Remove brand from product name
  const productNameWithoutBrand =
    productName
      .replace(
        new RegExp(
          `^${brand}\\s*`,
          "i"
        ),
        ""
      )
      .trim();

  // Product words
  const productParts =
    productNameWithoutBrand
      .split(/\s+/)
      .map((word) => cleanText(word))
      .filter(Boolean);

  // Product code
  const productCode =
    productParts
      .slice(0, 2)
      .map((word) => word.slice(0, 4))
      .join("-") || "PROD";

  // Base SKU
  const baseSku =
    `${categoryPrefix}-${brandPrefix}-${productCode}`;

  // Existing SKUs
  const existingProducts =
    await prisma.products.findMany({
      where: {
        sku: {
          startsWith: baseSku,
        },
      },
      select: {
        sku: true,
      },
    });

  // Find highest number
  let nextNumber = 1;

  const usedNumbers =
    existingProducts
      .map((product) => {
        if (!product.sku) {
          return null;
        }

        const match =
          product.sku.match(
            /-(\d+)$/
          );

        return match
          ? Number(match[1])
          : null;
      })
      .filter(
        (value): value is number =>
          value !== null
      );

  if (usedNumbers.length > 0) {
    nextNumber =
      Math.max(...usedNumbers) + 1;
  }

  return `${baseSku}-${String(
    nextNumber
  ).padStart(3, "0")}`;
};