// import dbConnect from "@/lib/db";
// import User from "@/models/User";
// import bcrypt from "bcrypt";
// import jwt from "jsonwebtoken";
// import { NextResponse } from "next/server";
// export const POST = async (request) => {
//     const { email, password } = await request.json();
//     let user;

//     try {
//         await dbConnect();
//         user = await User.findOne({ email });
//         if (!user) {
//             return Response.json(
//                 { message: "Wrong Credentials", success: false },
//                 { status: 401 }
//             );
//         }
//         const isPasswordCorrect = await bcrypt.compare(password, user.password);
//         if (!isPasswordCorrect) {
//             return Response.json(
//                 { message: "Wrong Credentials", success: false },
//                 { status: 401 }
//             );
//         }
//         const payload = {
//             _id: user._id,
//             email: user.email,
//             username: user.username,
//         };
//         const token = jwt.sign(payload, process.env.SECRET_KEY, {
//             expiresIn: "1d",
//         });
//         const responsePayload = {
//             message: "Login successful",
//             success: true,
//             data: {
//                 _id: user._id,
//                 username: user.username,
//                 email: user.email,
//             },
//         };
//         const response = NextResponse.json(responsePayload, { status: 200 });
//         response.cookies.set("token", token, {
//             httpOnly: true,
//             secure: process.env.NODE_ENV !== "development",
//             sameSite: "strict",
//             maxAge: 24 * 60 * 60,
//             path: "/",
//         });
//         return response;
//     } catch (err) {
//         console.log(err);
//         return Response.json(
//             { message: "Internal Server Error", success: false },
//             { status: 500 }
//         );
//     }
// };

import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const body = await request.json();

    const email =
      typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    const password = typeof body.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json(
        { success: false, message: "Email and password are required" },
        { status: 400 },
      );
    }

    await dbConnect();

    // Find user by normalized email
    const user = await User.findOne({ email }).select("+password");

    // Debug logs: never log the actual password or its hash
    console.log("Login email:", email);
    console.log("User found:", Boolean(user));
    console.log("Password exists:", Boolean(user?.password));

    if (!user || !user.password) {
      return NextResponse.json(
        { success: false, message: "Wrong Credentials" },
        { status: 401 },
      );
    }

    // Verify bcrypt password
    const isPasswordCorrect = await bcrypt.compare(password, user.password);

    console.log("Password matched:", isPasswordCorrect);

    if (!isPasswordCorrect) {
      return NextResponse.json(
        { success: false, message: "Wrong Credentials" },
        { status: 401 },
      );
    }

    // Validate JWT secret
    const secretKey = process.env.SECRET_KEY;

    if (!secretKey) {
      throw new Error("SECRET_KEY is missing in environment variables");
    }

    // Generate token
    const token = jwt.sign(
      {
        _id: user._id.toString(),
        email: user.email,
        username: user.username,
      },
      secretKey,
      { expiresIn: "1d" },
    );

    const response = NextResponse.json(
      {
        success: true,
        message: "Login successful",
        data: {
          _id: user._id.toString(),
          username: user.username,
          email: user.email,
        },
      },
      { status: 200 },
    );

    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 24,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Signin error:", error.message);

    return NextResponse.json(
      { success: false, message: "Internal Server Error" },
      { status: 500 },
    );
  }
}
