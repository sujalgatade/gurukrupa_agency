import { NextResponse } from "next/server";
import jwt from "jsonwebtoken";
const publicRoutes = ["/", "/signup"];
const protectedRoutes = ["/dashboard"];
const publicApiRoutes = ["/api/auth/signin", "/api/auth/signup", "/api/auth/logout"];
export const runtime = "nodejs";
const middleware = async (req) => {
    const token = req.cookies.get("token")?.value;
    const { pathname } = req.nextUrl;
    const loginUrl = new URL("/", req.url);
    const homeUrl = new URL("/dashboard", req.url);
    const isApi = pathname.startsWith("/api/");
    const isPublicApi = publicApiRoutes.includes(pathname);

    if (isApi && !isPublicApi) {
        if (!token) {
            return NextResponse.json({ success: false, message: "Sign in is required." }, { status: 401 });
        }
        try {
            jwt.verify(token, process.env.SECRET_KEY);
            return NextResponse.next();
        } catch {
            const response = NextResponse.json({ success: false, message: "Your session has expired. Sign in again." }, { status: 401 });
            response.cookies.set("token", "", { maxAge: -1, path: "/" });
            return response;
        }
    }
    const isPublicPage = publicRoutes.some((route) => pathname === route);
    if (isPublicPage) {
        if (token) {
            try {
                jwt.verify(token, process.env.SECRET_KEY);
                return NextResponse.redirect(homeUrl);
            } catch (error) {
                return NextResponse.next();
            }
        }
    }

    if (protectedRoutes.some((route) => pathname.startsWith(route))) {
        if (!token) {
            return NextResponse.redirect(loginUrl);
        }
        try {
            jwt.verify(token, process.env.SECRET_KEY);
            return NextResponse.next();
        } catch (error) {
            console.error("JWT Verification Error:", error.message);
            const response = NextResponse.redirect(loginUrl);
            response.cookies.set("token", "", { maxAge: -1 });
            return response;
        }
    }
    return NextResponse.next();
};
export default middleware;
export const config = {
    matcher: ["/", "/dashboard/:path*", "/signup", "/api/:path*"],
};
