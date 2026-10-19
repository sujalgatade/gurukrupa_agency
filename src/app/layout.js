import { ToastContainer } from "react-toastify";
import "./globals.css";
import NumberInputWheelGuard from "@/components/NumberInputWheelGuard";

export const metadata = {
  title: "Gurukrupa Agency | Business Management",
  description:
    "Billing, inventory, customer accounts and purchase management for Gurukrupa Agency.",
  icons: {
    icon: [
      { url: "/favicon.ico", type: "image/x-icon" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    shortcut: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en-IN" data-theme="light">
      <body className="antialiased">
        <NumberInputWheelGuard />
        {children}
        <ToastContainer
          position="top-right"
          autoClose={5000}
          hideProgressBar={false}
          newestOnTop={false}
          closeOnClick={false}
          rtl={false}
          pauseOnFocusLoss
          draggable
          pauseOnHover
          theme="light"
        />
      </body>
    </html>
  );
}
