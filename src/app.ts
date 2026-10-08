// import express from "express";
// import cors from "cors";
// import helmet from "helmet";
// import compression from "compression";
// import cookieParser from "cookie-parser";
// import productRoutes from "./routes/product.routes";
// import path from "path";
// import categoryRoutes from "./routes/category.routes.js";
// import authRoutes from "./routes/auth.routes.js";
// const app = express();

// // Security headers
// app.use(helmet());
// app.use("/api/auth", authRoutes);

// // Allow frontend to communicate with backend
// app.use(
//   cors({
//     origin: process.env.FRONTEND_URL || "http://localhost:5173",
//     credentials: true,
//       methods: [
//       "GET",
//       "POST",
//       "PUT",
//       "DELETE",
//       "PATCH",
//       "OPTIONS",
//     ],
//     allowedHeaders: [
//       "Content-Type",
//       "Authorization",
//     ],
//   })
// );
// app.use(
//   helmet({
//     crossOriginResourcePolicy: {
//       policy: "cross-origin",
//     },
//   })
// );

// // Middleware
// app.use(compression());
// app.use(express.json());
// app.use(express.urlencoded({ extended: true }));
// app.use(cookieParser());


 

// app.use(
//   "/products",
//   express.static(path.join(process.cwd(), "public/products"))
// );
// app.use("/api/products", productRoutes);
// app.use("/api/categories", categoryRoutes);
// // Test API
// // app.get("/api/Products", (req, res) => {
// //   res.status(200).json({
// //     success: true,
// //     message: "ShopSphere Product is live go check it out",
// //   });
// // });
// app.get("/api/users", (req,res)=>{
//     res.status(299).json({
//         success:true,
//         message:"Current Users Online:550" 
//     });
// });
// app.get("/api/form/Orders",(req,res)=>{
//   res.status(299).json({
//     success:true,
//     message:"Your order is pending"
//   })
// })
// app.get("/api/form/Payments",(req,res)=>{
//   res.status(300).json({
//     success:true,
//     message:"Here is your Payment Gateway"
//   })
// })
// app.get("/api/form/shop",(req,res)=>{
//   res.status(301).json({
//     sucess:false,
//     message:"Shop address is here"
//   })
// })
// app.get("/ai/form/status",(req,res)=>{
//   res.status(302).json({
//     sucess:true,
//     message:"You are selected for this job"
//   })
// })


// export default app;
import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import cookieParser from "cookie-parser";
import path from "path";

import productRoutes from "./routes/product.routes";
import categoryRoutes from "./routes/category.routes.js";
import authRoutes from "./routes/auth.routes.js";

const app = express();

// ==========================================
// SECURITY
// ==========================================

app.use(
  helmet({
    crossOriginResourcePolicy: {
      policy: "cross-origin",
    },
  })
);

// ==========================================
// CORS
// ==========================================

app.use(
  cors({
    origin:
      process.env.FRONTEND_URL ||
      "http://localhost:5173",

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "DELETE",
      "PATCH",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// ==========================================
// MIDDLEWARE
// ==========================================

app.use(compression());

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

// ==========================================
// STATIC PRODUCT IMAGES
// ==========================================

app.use(
  "/products",
  express.static(
    path.join(
      process.cwd(),
      "public",
      "products"
    )
  )
);

// ==========================================
// API ROUTES
// ==========================================

app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/products",
  productRoutes
);

app.use(
  "/api/categories",
  categoryRoutes
);

// ==========================================
// TEST API
// ==========================================

app.get("/api/users", (req, res) => {
  res.status(299).json({
    success: true,
    message:
      "Current Users Online:550",
  });
});

app.get(
  "/api/form/Orders",
  (req, res) => {
    res.status(299).json({
      success: true,
      message:
        "Your order is pending",
    });
  }
);

app.get(
  "/api/form/Payments",
  (req, res) => {
    res.status(300).json({
      success: true,
      message:
        "Here is your Payment Gateway",
    });
  }
);

app.get(
  "/api/form/shop",
  (req, res) => {
    res.status(301).json({
      success: false,
      message:
        "Shop address is here",
    });
  }
);

app.get(
  "/ai/form/status",
  (req, res) => {
    res.status(302).json({
      success: true,
      message:
        "You are selected for this job",
    });
  }
);


export default app;
