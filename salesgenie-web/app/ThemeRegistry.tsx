"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@mui/material/styles";
import theme from "./theme";
import ToastProvider from "./components/ToastProvider";

export default function ThemeRegistry({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider theme={theme}>
      <ToastProvider>{children}</ToastProvider>
    </ThemeProvider>
  );
}
