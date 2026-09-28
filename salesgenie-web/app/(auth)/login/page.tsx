"use client";

import React, { useState } from "react";
import { Box, Typography, TextField, Button, IconButton, InputAdornment } from "@mui/material";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import Link from "next/link";
import VisibilityIcon from "@mui/icons-material/Visibility";
import VisibilityOffIcon from "@mui/icons-material/VisibilityOff";

import AuthShell from "../components/AuthShell";
import { authApi, type ApiError } from "@/app/lib/api";
import { saveSession } from "@/app/lib/auth/session";
import { useToast } from "@/app/components/ToastProvider";

const MotionButton = motion.create(Button);

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    fontSize: 13.5,
  },
};

export default function LoginPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const canSubmit = Boolean(email.trim() && password.trim());

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setError(null);
    setSubmitting(true);

    try {
      const tokens = await authApi.login({ email: email.trim(), password });
      saveSession(tokens);
      showToast("Welcome back!", "success");
      router.push("/dashboard");
    } catch (err) {
      const message = (err as ApiError).message ?? "Unable to log in. Please try again.";
      setError(message);
      showToast(message, "error");
      setSubmitting(false);
    }
  };

  return (
    <AuthShell>
      <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A" }}>
        Welcome back
      </Typography>
      <Typography sx={{ fontSize: 13, color: "#8A8A8A", mt: 0.5, mb: 3.5 }}>
        Log in to keep your pipeline moving.
      </Typography>

      <Box component="form" onSubmit={handleSubmit}>
        <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#5A5A5A", mb: 0.75 }}>
          Email
        </Typography>
        <TextField
          fullWidth
          type="email"
          placeholder="you@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          size="small"
          sx={{ ...fieldSx, mb: 2 }}
        />

        <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 0.75 }}>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#5A5A5A" }}>
            Password
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#1A73E8", cursor: "pointer", fontWeight: 600 }}>
            Forgot password?
          </Typography>
        </Box>
        <TextField
          fullWidth
          type={showPassword ? "text" : "password"}
          placeholder="Enter your password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          size="small"
          slotProps={{
            input: {
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    size="small"
                    onClick={() => setShowPassword((v) => !v)}
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <VisibilityOffIcon sx={{ fontSize: 18 }} />
                    ) : (
                      <VisibilityIcon sx={{ fontSize: 18 }} />
                    )}
                  </IconButton>
                </InputAdornment>
              ),
            },
          }}
          sx={fieldSx}
        />

        {error && (
          <Typography sx={{ fontSize: 12, color: "#B23A3A", mt: 1.5 }}>
            {error}
          </Typography>
        )}

        <MotionButton
          type="submit"
          fullWidth
          disabled={!canSubmit || submitting}
          whileHover={canSubmit ? { scale: 1.015 } : undefined}
          whileTap={canSubmit ? { scale: 0.985 } : undefined}
          variant="contained"
          sx={{
            mt: 3,
            py: 1.1,
            textTransform: "none",
            fontWeight: 700,
            fontSize: 14,
            borderRadius: "10px",
            boxShadow: "none",
            bgcolor: "#1A73E8",
            "&:hover": { bgcolor: "#1660C4", boxShadow: "none" },
          }}
        >
          Continue
        </MotionButton>
      </Box>

      <Typography sx={{ fontSize: 13, color: "#8A8A8A", mt: 3, textAlign: "center" }}>
        Don&apos;t have a workspace yet?{" "}
        <Link href="/signup" style={{ color: "#1A73E8", fontWeight: 700, textDecoration: "none" }}>
          Create an account
        </Link>
      </Typography>
    </AuthShell>
  );
}
