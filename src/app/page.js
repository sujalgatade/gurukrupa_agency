
"use client";

import Image from "next/image";
import logo from "/public/Gurukrupa logo.png";
import { useState } from "react";
import axios from "axios";
import { useRouter } from "next/navigation";

export default function Home() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const router = useRouter();

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");

    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await axios.post("/api/auth/signin", {
        email,
        password,
      });

      if (res.data.success) {
        router.push("/dashboard");
      } else {
        setError("Unable to log in. Please check your credentials.");
      }
    } catch (err) {
      console.error(err);
      setError(
        err.response?.data?.message ||
          "Login failed. Please check your credentials and try again."
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950 px-4 py-10 text-white">
      {/* Background decoration */}
      <div className="pointer-events-none absolute -left-32 -top-32 h-80 w-80 rounded-full bg-amber-400/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

      <div className="relative z-10 flex w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl shadow-black/30 md:min-h-[570px] md:flex-row">
        {/* Branding panel */}
        <section className="relative flex flex-col items-center justify-center overflow-hidden bg-slate-900 px-6 py-10 text-center md:w-1/2 md:px-10">
          <div className="pointer-events-none absolute -right-20 -top-20 h-60 w-60 rounded-full border border-amber-400/10" />
          <div className="pointer-events-none absolute -bottom-24 -left-20 h-72 w-72 rounded-full border border-amber-400/10" />

          <div className="relative z-10 flex w-full max-w-xs flex-col items-center">
            <div className="mb-8 flex h-28 w-full items-center justify-center rounded-2xl border border-slate-700 bg-white p-4 shadow-lg">
              <Image
                src={logo}
                alt="Gurukrupa Agency Logo"
                priority
                className="h-full w-full object-contain"
              />
            </div>

            <p className="mb-3 text-xs font-bold uppercase tracking-[0.3em] text-amber-400">
              Welcome Back
            </p>

            <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
              Gurukrupa
              <span className="block text-amber-400">
                Agency
              </span>
            </h1>

            <p className="mt-5 max-w-sm text-sm leading-6 text-slate-400">
              Manage your invoices, payments, stock, and clients
              from one convenient place.
            </p>

            <div className="mt-8 flex items-center gap-2 rounded-full border border-slate-700 bg-slate-800/70 px-4 py-2">
              <span className="h-2 w-2 rounded-full bg-amber-400" />
              <span className="text-xs font-medium text-slate-300">
                Business Management Portal
              </span>
            </div>
          </div>
        </section>

        {/* Login panel */}
        <section className="flex flex-1 items-center justify-center border-t border-slate-800 bg-slate-950/70 px-5 py-10 sm:px-10 md:border-l md:border-t-0 md:px-12">
          <div className="w-full max-w-md">
            <div className="mb-8">
              <p className="mb-2 text-sm font-medium text-amber-400">
                Account Access
              </p>

              <h2 className="text-3xl font-bold tracking-tight text-white">
                Sign in
              </h2>

              <p className="mt-3 text-sm leading-6 text-slate-400">
                Enter your account details to access your dashboard.
              </p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Email Address
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-5 w-5"
                    >
                      <rect
                        x="3"
                        y="5"
                        width="18"
                        height="14"
                        rx="2"
                      />
                      <path d="m3 7 9 6 9-6" />
                    </svg>
                  </span>

                  <input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@example.com"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-2 block text-sm font-medium text-slate-300"
                >
                  Password
                </label>

                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4 text-slate-500">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.7"
                      className="h-5 w-5"
                    >
                      <rect
                        x="4"
                        y="10"
                        width="16"
                        height="11"
                        rx="2"
                      />
                      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
                      <path d="M12 14v3" />
                    </svg>
                  </span>

                  <input
                    id="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter your password"
                    required
                    className="w-full rounded-xl border border-slate-700 bg-slate-900 py-3.5 pl-12 pr-4 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
                  />
                </div>
              </div>

              {/* Error message */}
              {error && (
                <div
                  role="alert"
                  className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
                >
                  {error}
                </div>
              )}

              {/* Login button */}
              <button
                type="submit"
                disabled={isLoading}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-amber-400 px-5 py-3.5 text-sm font-bold text-slate-950 shadow-lg shadow-amber-400/10 transition hover:bg-amber-300 active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isLoading ? (
                  <>
                    <svg
                      className="h-5 w-5 animate-spin"
                      xmlns="http://www.w3.org/2000/svg"
                      fill="none"
                      viewBox="0 0 24 24"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 0 1 8-8v4a4 4 0 0 0-4 4H4z"
                      />
                    </svg>
                    Signing in...
                  </>
                ) : (
                  <>
                    Sign In
                    <span className="text-lg">→</span>
                  </>
                )}
              </button>
            </form>

            {/* Signup link */}
            <div className="mt-7 border-t border-slate-800 pt-6 text-center">
              <p className="text-sm text-slate-400">
                Don&apos;t have an account?{" "}
                <a
                  href="/signup"
                  className="font-semibold text-amber-400 transition hover:text-amber-300"
                >
                  Create Account
                </a>
              </p>
            </div>

            <p className="mt-8 text-center text-xs text-slate-600">
              © {new Date().getFullYear()} Gurukrupa Agency
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}
