import dbConnect from "@/lib/db";
import User from "@/models/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { NextResponse } from "next/server";
export const POST = async (request) => {
  const { email, password, username } = await request.json();
  console.log(email, password, username);
  if (!email || !password || !username) {
    return Response.json(
      { message: "All fields are required", success: false },
      { status: 400 },
    );
  }
  try {
    await dbConnect();
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return Response.json(
        { message: "User already exists", success: false },
        { status: 400 },
      );
    }
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      username,
    });
    if (!user) {
      return Response.json(
        { message: "User not created", success: false },
        { status: 400 },
      );
    }
    const payload = {
      _id: user._id,
      email: user.email,
      username: user.username,
    };
    const token = jwt.sign(payload, process.env.SECRET_KEY, {
      expiresIn: "1d",
    });
    const responsePayload = {
      message: "Signup successful",
      success: true,
      data: {
        _id: user._id,
        username: user.username,
        email: user.email,
      },
    };
    const response = NextResponse.json(responsePayload, { status: 201 });
    response.cookies.set("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV !== "development",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 1 day
      path: "/",
    });
    return response;
  } catch (err) {
    console.log(err);
    return Response.json(
      { message: "Internal Server Error", success: false },
      { status: 500 },
    );
  }
};
