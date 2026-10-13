import { Router } from "express";
import { prisma } from "../db";
import { upload } from "../middlewares/upload.middleware.js";
import cloudinary from "../config/cloudinary.js";
import { uploadToCloudinary, type CloudinaryImage } from "../utils/uploadToCloudinary.js";
import { generateSku } from "../utils/generateSku.js";

const router = Router();
const MAX_PRODUCT_IMAGES = 6;
const CLOUDINARY_FOLDER = "shopsphere/products";

function normalizeStringArray(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter(
      (item): item is string => typeof item === "string" && item.trim().length > 0
    );
  }

  if (typeof value !== "string" || value.trim().length === 0) {
    return [];
  }

  // Also accept a JSON array if a client sends existingImages as JSON.stringify([...]).
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed.filter(
        (item): item is string => typeof item === "string" && item.trim().length > 0
      );
    }
  } catch {
    // A normal single image URL/path is not JSON; keep it as one item.
  }

  return [value];
}

function getCloudinaryPublicId(imageUrl: string): string | null {
  try {
    const url = new URL(imageUrl);
    if (url.hostname !== "res.cloudinary.com") return null;

    const uploadMarker = "/upload/";
    const uploadIndex = url.pathname.indexOf(uploadMarker);
    if (uploadIndex === -1) return null;

    const parts = url.pathname
      .slice(uploadIndex + uploadMarker.length)
      .split("/")
      .filter(Boolean);

    if (parts.length === 0) return null;

    // Cloudinary delivery URLs normally include a version segment like v1234567890.
    // Remove version and any transformations before it, if present.
    const versionIndex = parts.findIndex((part) => /^v\d+$/.test(part));
    if (versionIndex >= 0) parts.splice(0, versionIndex + 1);
    if (parts.length === 0) return null;

    const lastPart = parts.pop();
    if (!lastPart) return null;

    const filenameWithoutExtension = lastPart.replace(/\.[^/.]+$/, "");
    const publicId = [...parts, filenameWithoutExtension].join("/");
    return publicId || null;
  } catch {
    return null;
  }
}

async function destroyCloudinaryPublicIds(publicIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(publicIds.filter(Boolean))];
  await Promise.allSettled(
    uniqueIds.map((publicId) =>
      cloudinary.uploader.destroy(publicId, { resource_type: "image" })
    )
  );
}

async function destroyCloudinaryImagesByUrl(imageUrls: string[]): Promise<void> {
  const publicIds = imageUrls
    .map(getCloudinaryPublicId)
    .filter((publicId): publicId is string => publicId !== null);

  await destroyCloudinaryPublicIds(publicIds);
}

// GET active products for customers.
router.get("/", async (_req, res) => {
  try {
    const products = await prisma.products.findMany({
      where: { status: "ACTIVE" },
      orderBy: { created_at: "desc" },
    });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching active products:", error);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});

// GET every product for admin, including inactive products.
router.get("/admin/all", async (_req, res) => {
  try {
    const products = await prisma.products.findMany({
      orderBy: { created_at: "desc" },
    });

    return res.status(200).json(products);
  } catch (error) {
    console.error("Error fetching admin products:", error);
    return res.status(500).json({ message: "Failed to fetch products" });
  }
});

// GET one product for admin, including inactive products.
router.get("/admin/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await prisma.products.findUnique({ where: { id } });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching admin product:", error);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
});

// GET one active product for customers.
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const product = await prisma.products.findFirst({
      where: { id, status: "ACTIVE" },
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);
    return res.status(500).json({ message: "Failed to fetch product" });
  }
});

// CREATE product. The first uploaded Cloudinary URL is the main image; the rest are gallery images.
router.post("/", upload.array("images", MAX_PRODUCT_IMAGES), async (req, res) => {
  const newlyUploadedPublicIds: string[] = [];

  try {
    const {
      name,
      slug,
      description,
      brand,
      category_id,
      price,
      discount_price,
      stock,
      featured,
      status,
    } = req.body;

    const files = (req.files as Express.Multer.File[] | undefined) ?? [];

    if (files.length === 0) {
      return res.status(400).json({ message: "At least one product image is required" });
    }

    if (!name || !slug || !brand || !category_id || price === undefined || price === "") {
      return res.status(400).json({
        message: "Name, slug, brand, category and price are required",
      });
    }

    if (files.length > MAX_PRODUCT_IMAGES) {
      return res.status(400).json({ message: "A maximum of 6 images is allowed" });
    }

    const categoryId = Number(category_id);
    if (!Number.isInteger(categoryId) || categoryId <= 0) {
      return res.status(400).json({ message: "Invalid category ID" });
    }

    const category = await prisma.categories.findUnique({ where: { id: categoryId } });
    if (!category) {
      return res.status(400).json({ message: "Category not found" });
    }

    const generatedSku = await generateSku(name, brand, categoryId);

    const cloudinaryImages: CloudinaryImage[] = [];
    for (const file of files) {
      const uploaded = await uploadToCloudinary(file.buffer, CLOUDINARY_FOLDER);
      cloudinaryImages.push(uploaded);
      newlyUploadedPublicIds.push(uploaded.public_id);
    }

    const imageUrls = cloudinaryImages.map((item) => item.secure_url);
    const product = await prisma.products.create({
      data: {
        name,
        slug,
        description: description || null,
        sku: generatedSku,
        brand,
        category_id: categoryId,
        price: Number(price),
        discount_price:
          discount_price === "" || discount_price === undefined || discount_price === null
            ? null
            : Number(discount_price),
        stock: stock === "" || stock === undefined ? 0 : Number(stock),
        image: imageUrls[0],
        gallery: imageUrls.slice(1),
        rating: 0,
        total_reviews: 0,
        featured: featured === true || featured === "true",
        status: status || "ACTIVE",
      },
    });

    return res.status(201).json({
      message: "Product created successfully",
      product,
    });
  } catch (error) {
    // Avoid leaving newly uploaded files orphaned if product creation fails.
    await destroyCloudinaryPublicIds(newlyUploadedPublicIds);
    console.error("Error creating product:", error);
    return res.status(500).json({ message: "Failed to create product" });
  }
});

// UPDATE product. JSON-only updates (for example, active/inactive toggle) keep existing images.
router.put("/:id", upload.array("images", MAX_PRODUCT_IMAGES), async (req, res) => {
  const newlyUploadedPublicIds: string[] = [];

  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const existingProduct = await prisma.products.findUnique({ where: { id } });
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    const {
      name,
      slug,
      description,
      brand,
      category_id,
      price,
      discount_price,
      stock,
      featured,
      status,
    } = req.body;

    // Validate the category before uploading files, so invalid requests do not leave orphaned assets.
    let categoryId: number | undefined;
    if (category_id !== undefined && category_id !== "") {
      categoryId = Number(category_id);
      if (!Number.isInteger(categoryId) || categoryId <= 0) {
        return res.status(400).json({ message: "Invalid category ID" });
      }

      const category = await prisma.categories.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(400).json({ message: "Category not found" });
      }
    }

    const uploadedFiles = (req.files as Express.Multer.File[] | undefined) ?? [];
    const hasImageUpdate =
      Object.prototype.hasOwnProperty.call(req.body, "existingImages") || uploadedFiles.length > 0;

    let finalImageUrls: string[] | undefined;

    if (hasImageUpdate) {
      const existingImages = normalizeStringArray(req.body.existingImages);
      const requestedImageCount = existingImages.length + uploadedFiles.length;

      if (requestedImageCount === 0) {
        return res.status(400).json({ message: "At least one product image is required" });
      }
      if (requestedImageCount > MAX_PRODUCT_IMAGES) {
        return res.status(400).json({ message: "A maximum of 6 images is allowed" });
      }

      const newCloudinaryImages: CloudinaryImage[] = [];
      for (const file of uploadedFiles) {
        const uploaded = await uploadToCloudinary(file.buffer, CLOUDINARY_FOLDER);
        newCloudinaryImages.push(uploaded);
        newlyUploadedPublicIds.push(uploaded.public_id);
      }

      finalImageUrls = [
        ...existingImages,
        ...newCloudinaryImages.map((item) => item.secure_url),
      ];

      if (finalImageUrls.length === 0) {
        return res.status(400).json({ message: "At least one product image is required" });
      }
    }

    const updatedProduct = await prisma.products.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(slug !== undefined && { slug }),
        ...(description !== undefined && { description: description === "" ? null : description }),
        // SKU intentionally remains unchanged when editing a product.
        ...(brand !== undefined && { brand }),
        ...(categoryId !== undefined && { category_id: categoryId }),
        ...(price !== undefined && price !== "" && { price: Number(price) }),
        ...(discount_price !== undefined && {
          discount_price:
            discount_price === "" || discount_price === null
              ? null
              : Number(discount_price),
        }),
        ...(stock !== undefined && stock !== "" && { stock: Number(stock) }),
        ...(finalImageUrls !== undefined && {
          image: finalImageUrls[0],
          gallery: finalImageUrls.slice(1),
        }),
        ...(featured !== undefined && {
          featured: featured === true || featured === "true",
        }),
        ...(status !== undefined && { status }),
      },
    });

    // Remove no-longer-used Cloudinary images only after the database update succeeds.
    if (finalImageUrls !== undefined) {
      const oldImages = [existingProduct.image, ...existingProduct.gallery];
      const removedImages = oldImages.filter((url) => !finalImageUrls!.includes(url));
      await destroyCloudinaryImagesByUrl(removedImages);
    }

    return res.status(200).json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    // If the database update fails, clean up new Cloudinary uploads.
    await destroyCloudinaryPublicIds(newlyUploadedPublicIds);
    console.error("Error updating product:", error);
    return res.status(500).json({ message: "Failed to update product" });
  }
});

// DELETE product and its Cloudinary images (if any).
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: "Invalid product ID" });
    }

    const existingProduct = await prisma.products.findUnique({ where: { id } });
    if (!existingProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    await prisma.products.delete({ where: { id } });
    await destroyCloudinaryImagesByUrl([existingProduct.image, ...existingProduct.gallery]);

    return res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", error);
    return res.status(500).json({ message: "Failed to delete product" });
  }
});

export default router;
