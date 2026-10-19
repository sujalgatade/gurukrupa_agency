"use client";

import { useEffect } from "react";

export default function NumberInputWheelGuard() {
  useEffect(() => {
    const blurNumberInputOnWheel = (event) => {
      const input = event.target;
      if (input instanceof HTMLInputElement && input.type === "number") {
        input.blur();
      }
    };

    document.addEventListener("wheel", blurNumberInputOnWheel, true);
    return () =>
      document.removeEventListener("wheel", blurNumberInputOnWheel, true);
  }, []);

  return null;
}
