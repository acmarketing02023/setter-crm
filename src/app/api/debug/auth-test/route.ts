import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return Response.json(
        { success: false, error: "Email and password required" },
        { status: 400 }
      );
    }

    // Try to find user
    console.log(`Testing auth for email: ${email}`);
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return Response.json(
        { success: false, error: `User not found: ${email}` },
        { status: 401 }
      );
    }

    console.log(`User found: ${user.name} (${user.role})`);
    console.log(`Password hash exists: ${!!user.passwordHash}`);

    // Compare password
    const valid = await bcrypt.compare(password, user.passwordHash);
    console.log(`Password valid: ${valid}`);

    if (!valid) {
      return Response.json(
        { success: false, error: "Invalid password" },
        { status: 401 }
      );
    }

    return Response.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Auth test error:", errorMessage);
    return Response.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  return Response.json({
    message: "POST with {email, password} to test authentication",
  });
}
