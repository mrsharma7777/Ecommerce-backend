import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { prisma } from "../db.js";

const router = Router();

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  throw new Error("JWT_SECRET is not defined");
}

// ==========================================
// REGISTER CUSTOMER
// ==========================================

router.post("/register", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        message: "Mobile number and password are required",
      });
    }

    if (!/^\d{10}$/.test(mobile)) {
      return res.status(400).json({
        message: "Mobile number must contain 10 digits",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters",
      });
    }

    // Check existing customer
    const existingUser = await prisma.user.findUnique({
      where: {
        mobile,
      },
    });

    if (existingUser) {
      return res.status(409).json({
        message: "Customer already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(
      password,
      10
    );

    // Create customer
    const user = await prisma.user.create({
      data: {
        mobile,
        password: hashedPassword,
      },
    });

    return res.status(201).json({
      message: "Customer registered successfully",
      user: {
        id: user.id,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    console.error(
      "Customer registration error:",
      error
    );

    return res.status(500).json({
      message: "Failed to register customer",
    });
  }
});

// ==========================================
// LOGIN CUSTOMER
// ==========================================

router.post("/login", async (req, res) => {
  try {
    const { mobile, password } = req.body;

    if (!mobile || !password) {
      return res.status(400).json({
        message: "Mobile number and password are required",
      });
    }

    // Find customer
    const user = await prisma.user.findUnique({
      where: {
        mobile,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Invalid mobile number or password",
      });
    }

    // Compare password
    const passwordMatch = await bcrypt.compare(
      password,
      user.password
    );

    if (!passwordMatch) {
      return res.status(401).json({
        message: "Invalid mobile number or password",
      });
    }

    // Create JWT
    const token = jwt.sign(
      {
        userId: user.id,
        mobile: user.mobile,
      },
      JWT_SECRET,
      {
        expiresIn: "7d",
      }
    );

    // Store token in HttpOnly cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite:
        process.env.NODE_ENV === "production"
          ? "none"
          : "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      message: "Login successful",
      user: {
        id: user.id,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    console.error(
      "Customer login error:",
      error
    );

    return res.status(500).json({
      message: "Failed to login",
    });
  }
});

// ==========================================
// CURRENT CUSTOMER
// ==========================================

router.get("/me", async (req, res) => {
  try {
    const token = req.cookies?.token;

    if (!token) {
      return res.status(401).json({
        message: "Not authenticated",
      });
    }

    const decoded = jwt.verify(
      token,
      JWT_SECRET
    ) as {
      userId: number;
      mobile: string;
    };

    const user = await prisma.user.findUnique({
      where: {
        id: decoded.userId,
      },
    });

    if (!user) {
      return res.status(401).json({
        message: "Customer not found",
      });
    }

    return res.status(200).json({
      user: {
        id: user.id,
        mobile: user.mobile,
      },
    });
  } catch (error) {
    return res.status(401).json({
      message: "Invalid or expired session",
    });
  }
});

// ==========================================
// LOGOUT
// ==========================================

router.post("/logout", (_req, res) => {
  res.clearCookie("token");

  return res.status(200).json({
    message: "Logout successful",
  });
});

export default router;