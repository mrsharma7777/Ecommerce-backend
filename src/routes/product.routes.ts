import { Router } from "express";
import { prisma } from "../db";
import { upload } from "../middlewares/upload.middleware.js";
import { generateSku } from "../utils/generateSku.js";
const router = Router();

// GET all products
// router.get("/", async (req, res) => {
//   try {
//     const products = await prisma.products.findMany({
//       orderBy: {
//         created_at: "desc",
//       },
//     });

//     res.status(200).json(products);
//   } catch (error) {
//     console.error("Error fetching products:", error);

//     res.status(500).json({
//       message: "Failed to fetch products",
//     });
//   }
// });
router.get("/", async (req, res) => {
  try {
    const products = await prisma.products.findMany({
      where: {
        status: "ACTIVE",
      },
      orderBy: {
        created_at: "desc",
      },
    });

    res.status(200).json(products);
  } catch (error) {
    console.error(
      "Error fetching active products:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});
// GET all products for admin
router.get("/admin/all", async (req, res) => {
  try {
    const products =
      await prisma.products.findMany({
        orderBy: {
          created_at: "desc",
        },
      });

    res.status(200).json(products);
  } catch (error) {
    console.error(
      "Error fetching admin products:",
      error
    );

    res.status(500).json({
      message: "Failed to fetch products",
    });
  }
});
// ==========================================
// GET PRODUCT BY ID - ADMIN
// Returns ACTIVE and INACTIVE products
// ==========================================

router.get("/admin/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const product =
      await prisma.products.findUnique({
        where: {
          id,
        },
      });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    return res.status(200).json(product);
  } catch (error) {
    console.error(
      "Error fetching admin product:",
      error
    );

    return res.status(500).json({
      message: "Failed to fetch product",
    });
  }
});
router.get("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

   const product =
  await prisma.products.findFirst({
    where: {
      id,
      status: "ACTIVE",
    },
  });

    if (!product) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    res.status(200).json(product);
  } catch (error) {
    console.error("Error fetching product:", error);

    res.status(500).json({
      message: "Failed to fetch product",
    });
  }
});

// router.post(
//   "/",
//   upload.single("image"),
//   async (req, res) => {
//     try {
//       const {
//         name,
//         slug,
//         description,
//         sku,
//         brand,
//         category_id,
//         price,
//         discount_price,
//         stock,
//         rating,
//         total_reviews,
//         featured,
//         status,
//       } = req.body;

//       // Check image
//       if (!req.file) {
//         return res.status(400).json({
//           message: "Product image is required",
//         });
//       }

//       // Validate required fields
//       if (
//         !name ||
//         !slug ||
//         !brand ||
//         !category_id ||
//         !price
//       ) {
//         return res.status(400).json({
//           message:
//             "Name, slug, brand, category and price are required",
//         });
//       }

//       // Check category exists
//       const category = await prisma.categories.findUnique({
//         where: {
//           id: Number(category_id),
//         },
//       });

//       if (!category) {
//         return res.status(400).json({
//           message: "Category not found",
//         });
//       }

//       // Automatically generated image path
//       const imagePath = `/products/${req.file.filename}`;

//       const product = await prisma.products.create({
//         data: {
//           name,
//           slug,
//           description: description || null,
//           sku: sku || null,
//           brand,
//           category_id: Number(category_id),

//           price: Number(price),

//           discount_price:
//             discount_price !== ""
//               ? Number(discount_price)
//               : null,

//           stock:
//             stock !== ""
//               ? Number(stock)
//               : 0,

//           image: imagePath,

//           gallery: [],

//           rating:
//             rating !== ""
//               ? Number(rating)
//               : 0,

//           total_reviews:
//             total_reviews !== ""
//               ? Number(total_reviews)
//               : 0,

//           featured:
//             featured === "true",

//           status: status || "ACTIVE",
//         },
//       });

//       return res.status(201).json(product);
//     } catch (error) {
//       console.error(
//         "Error creating product:",
//         error
//       );

//       return res.status(500).json({
//         message: "Failed to create product",
//       });
//     }
//   }
// );
router.post(
  "/",
  upload.array("images", 6),
  async (req, res) => {
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

      // ----------------------------------------
      // Get uploaded files
      // ----------------------------------------

      const files = req.files as Express.Multer.File[];

      // ----------------------------------------
      // Validate images
      // ----------------------------------------

      if (!files || files.length === 0) {
        return res.status(400).json({
          message: "At least one product image is required",
        });
      }

      // ----------------------------------------
      // Validate required fields
      // ----------------------------------------

      if (
        !name ||
        !slug ||
        !brand ||
        !category_id ||
        !price
      ) {
        return res.status(400).json({
          message:
            "Name, slug, brand, category and price are required",
        });
      }

      // ----------------------------------------
      // Category ID
      // ----------------------------------------

      const categoryId = Number(category_id);

      if (Number.isNaN(categoryId)) {
        return res.status(400).json({
          message: "Invalid category ID",
        });
      }

      // ----------------------------------------
      // Check category
      // ----------------------------------------

      const category =
        await prisma.categories.findUnique({
          where: {
            id: categoryId,
          },
        });

      if (!category) {
        return res.status(400).json({
          message: "Category not found",
        });
      }

      // ----------------------------------------
      // Generate SKU
      // ----------------------------------------

      const generatedSku = await generateSku(
        name,
        brand,
        categoryId
      );

      // ----------------------------------------
      // Create image paths
      // ----------------------------------------

      const imagePaths = files.map(
        (file) =>
          `/products/${file.filename}`
      );

      // First image = main image
      const mainImage = imagePaths[0];

      // Remaining images = gallery
      const galleryImages =
        imagePaths.slice(1);

      // ----------------------------------------
      // Create product
      // ----------------------------------------

      const product =
        await prisma.products.create({
          data: {
            name,

            slug,

            description:
              description || null,

            sku: generatedSku,

            brand,

            category_id: categoryId,

            price: Number(price),

            discount_price:
              discount_price !== "" &&
                discount_price !== undefined
                ? Number(discount_price)
                : null,

            stock:
              stock !== "" &&
                stock !== undefined
                ? Number(stock)
                : 0,

            image: mainImage,

            gallery: galleryImages,

            rating: 0,

            total_reviews: 0,

            featured:
              featured === "true",

            status:
              status || "ACTIVE",
          },
        });

      return res.status(201).json({
        message:
          "Product created successfully",
        product,
      });

    } catch (error) {
      console.error(
        "Error creating product:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to create product",
      });
    }
  }
);
// router.put("/:id", async (req, res) => {
//   try {
//     const id = Number(req.params.id);

//     // Check ID
//     if (Number.isNaN(id)) {
//       return res.status(400).json({
//         message: "Invalid product ID",
//       });
//     }

//     // Check if product exists
//     const existingProduct = await prisma.products.findUnique({
//       where: {
//         id,
//       },
//     });

//     if (!existingProduct) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }

//     const {
//       name,
//       slug,
//       description,
//       sku,
//       brand,
//       category_id,
//       price,
//       discount_price,
//       stock,
//       image,
//       gallery,
//       rating,
//       total_reviews,
//       featured,
//       status,
//     } = req.body;

//     // If category_id is being changed, verify it exists
//     if (category_id !== undefined) {
//       const category = await prisma.categories.findUnique({
//         where: {
//           id: Number(category_id),
//         },
//       });

//       if (!category) {
//         return res.status(400).json({
//           message: "Category not found",
//         });
//       }
//     }

//     // Update product
//     const updatedProduct = await prisma.products.update({
//       where: {
//         id,
//       },
//       data: {
//         ...(name !== undefined && { name }),
//         ...(slug !== undefined && { slug }),
//         ...(description !== undefined && { description }),
//         ...(sku !== undefined && { sku }),
//         ...(brand !== undefined && { brand }),

//         ...(category_id !== undefined && {
//           category_id: Number(category_id),
//         }),

//         ...(price !== undefined && { price }),

//         ...(discount_price !== undefined && {
//           discount_price,
//         }),

//         ...(stock !== undefined && {
//           stock: Number(stock),
//         }),

//         ...(image !== undefined && { image }),

//         ...(gallery !== undefined && {
//           gallery: Array.isArray(gallery) ? gallery : [],
//         }),

//         ...(rating !== undefined && {
//           rating: Number(rating),
//         }),

//         ...(total_reviews !== undefined && {
//           total_reviews: Number(total_reviews),
//         }),

//         ...(featured !== undefined && {
//           featured: Boolean(featured),
//         }),

//         ...(status !== undefined && { status }),
//       },
//     });

//     return res.status(200).json({
//       message: "Product updated successfully",
//       product: updatedProduct,
//     });
//   } catch (error) {
//     console.error("Error updating product:", error);

//     return res.status(500).json({
//       message: "Failed to update product",
//     });
//   }
// });
// router.put(
//   "/:id",
//   upload.array("images", 6),
//   async (req, res) => {
//   try {
//     const id = Number(req.params.id);

//     // ----------------------------------------
//     // Check ID
//     // ----------------------------------------

//     if (Number.isNaN(id)) {
//       return res.status(400).json({
//         message: "Invalid product ID",
//       });
//     }

//     // ----------------------------------------
//     // Check if product exists
//     // ----------------------------------------

//     const existingProduct =
//       await prisma.products.findUnique({
//         where: {
//           id,
//         },
//       });

//     if (!existingProduct) {
//       return res.status(404).json({
//         message: "Product not found",
//       });
//     }

//     const {
//       name,
//       slug,
//       description,
//       brand,
//       category_id,
//       price,
//       discount_price,
//       stock,
//       image,
//       gallery,
//       rating,
//       total_reviews,
//       featured,
//       status,
//     } = req.body;

//     // ----------------------------------------
//     // Check category if changed
//     // ----------------------------------------

//     if (category_id !== undefined) {
//       const category =
//         await prisma.categories.findUnique({
//           where: {
//             id: Number(category_id),
//           },
//         });

//       if (!category) {
//         return res.status(400).json({
//           message: "Category not found",
//         });
//       }
//     }

//     // ----------------------------------------
//     // Update product
//     // ----------------------------------------

//   const updateData: any = {
//   ...(name !== undefined && { name }),
//   ...(slug !== undefined && { slug }),
//   ...(description !== undefined && { description }),
//   ...(brand !== undefined && { brand }),

//   ...(category_id !== undefined && {
//     category_id: Number(category_id),
//   }),

//   ...(price !== undefined && {
//     price: Number(price),
//   }),

//   ...(discount_price !== undefined && {
//     discount_price:
//       discount_price === "" ||
//       discount_price === null
//         ? null
//         : Number(discount_price),
//   }),

//   ...(stock !== undefined && {
//     stock: Number(stock),
//   }),

//   ...(image !== undefined && {
//     image,
//   }),

//   ...(gallery !== undefined &&
//     Array.isArray(gallery) && {
//       gallery,
//     }),

//   ...(rating !== undefined && {
//     rating: Number(rating),
//   }),

//   ...(total_reviews !== undefined && {
//     total_reviews: Number(total_reviews),
//   }),

//   ...(featured !== undefined && {
//     featured:
//       featured === true ||
//       featured === "true",
//   }),

//   ...(status !== undefined && {
//     status,
//   }),
// };
// const updatedProduct =
//   await prisma.products.update({
//     where: {
//       id,
//     },
//     data: updateData,
//   });
//     return res.status(200).json({
//       message: "Product updated successfully",
//       product: updatedProduct,
//     });
//   } catch (error) {
//     console.error(
//       "Error updating product:",
//       error
//     );

//     return res.status(500).json({
//       message: "Failed to update product",
//     });
//   }
// });
router.put(
  "/:id",
  upload.array("images", 6),
  async (req, res) => {
    try {
      const id = Number(req.params.id);

      // ----------------------------------------
      // Validate product ID
      // ----------------------------------------

      if (Number.isNaN(id)) {
        return res.status(400).json({
          message: "Invalid product ID",
        });
      }

      // ----------------------------------------
      // Find existing product
      // ----------------------------------------

      const existingProduct =
        await prisma.products.findUnique({
          where: {
            id,
          },
        });

      if (!existingProduct) {
        return res.status(404).json({
          message: "Product not found",
        });
      }

      // ----------------------------------------
      // Request fields
      // ----------------------------------------

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

      // ----------------------------------------
      // Existing images that should remain
      // ----------------------------------------

      let existingImages: string[] = [];

      if (Array.isArray(req.body.existingImages)) {
        existingImages = req.body.existingImages;
      } else if (req.body.existingImages) {
        existingImages = [
          req.body.existingImages,
        ];
      }

      // ----------------------------------------
      // Newly uploaded images
      // ----------------------------------------

      const uploadedFiles =
        (req.files as Express.Multer.File[]) || [];

      const newImagePaths =
        uploadedFiles.map(
          (file) =>
            `/products/${file.filename}`
        );

      // ----------------------------------------
      // Combine existing + new images
      // ----------------------------------------

      const allImages = [
        ...existingImages,
        ...newImagePaths,
      ];

      // ----------------------------------------
      // At least one image required
      // ----------------------------------------

      if (allImages.length === 0) {
        return res.status(400).json({
          message:
            "At least one product image is required",
        });
      }

      // ----------------------------------------
      // Maximum 6 images
      // ----------------------------------------

      if (allImages.length > 6) {
        return res.status(400).json({
          message:
            "A maximum of 6 images is allowed",
        });
      }

      // ----------------------------------------
      // Category validation
      // ----------------------------------------

      let categoryId:
        | number
        | undefined;

      if (category_id !== undefined) {
        categoryId = Number(category_id);

        if (Number.isNaN(categoryId)) {
          return res.status(400).json({
            message: "Invalid category ID",
          });
        }

        const category =
          await prisma.categories.findUnique({
            where: {
              id: categoryId,
            },
          });

        if (!category) {
          return res.status(400).json({
            message: "Category not found",
          });
        }
      }

      // ----------------------------------------
      // Main image + gallery
      // ----------------------------------------

      const mainImage = allImages[0];

      const galleryImages =
        allImages.slice(1);

      // ----------------------------------------
      // Update product
      // ----------------------------------------

      const updatedProduct =
        await prisma.products.update({
          where: {
            id,
          },

          data: {
            ...(name !== undefined && {
              name,
            }),

            ...(slug !== undefined && {
              slug,
            }),

            ...(description !== undefined && {
              description:
                description === ""
                  ? null
                  : description,
            }),

            // SKU intentionally NOT updated
            // Existing SKU remains unchanged

            ...(brand !== undefined && {
              brand,
            }),

            ...(categoryId !== undefined && {
              category_id: categoryId,
            }),

            ...(price !== undefined && {
              price: Number(price),
            }),

            ...(discount_price !==
              undefined && {
              discount_price:
                discount_price === "" ||
                discount_price === null
                  ? null
                  : Number(discount_price),
            }),

            ...(stock !== undefined && {
              stock: Number(stock),
            }),

            // Main image
            image: mainImage,

            // Remaining images
            gallery: galleryImages,

            ...(featured !==
              undefined && {
              featured:
                featured === true ||
                featured === "true",
            }),

            ...(status !== undefined && {
              status,
            }),
          },
        });

      return res.status(200).json({
        message:
          "Product updated successfully",
        product: updatedProduct,
      });

    } catch (error) {
      console.error(
        "Error updating product:",
        error
      );

      return res.status(500).json({
        message:
          "Failed to update product",
      });
    }
  }
);
router.delete("/:id", async (req, res) => {
  try {
    const id = Number(req.params.id);

    if (Number.isNaN(id)) {
      return res.status(400).json({
        message: "Invalid product ID",
      });
    }

    const existingProduct = await prisma.products.findUnique({
      where: {
        id,
      },
    });

    if (!existingProduct) {
      return res.status(404).json({
        message: "Product not found",
      });
    }

    await prisma.products.delete({
      where: {
        id,
      },
    });

    return res.status(200).json({
      message: "Product deleted successfully",
    });

  } catch (error) {
    console.error("Error deleting product:", error);

    return res.status(500).json({
      message: "Failed to delete product",
    });
  }
});
export default router;