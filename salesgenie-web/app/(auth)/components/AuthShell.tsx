"use client";

import React from "react";
import { Box, Typography } from "@mui/material";
import { motion } from "framer-motion";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";

interface AuthShellProps {
  children: React.ReactNode;
}

const FEATURES = [
  "Move leads through Queues, Stages & Steps",
  "Automate emails, agreements & follow-ups",
  "See your whole pipeline at a glance",
];

const MotionBox = motion.create(Box);

function FloatingBlob({
  size,
  top,
  left,
  right,
  bottom,
  color,
  duration,
  delay = 0,
}: {
  size: number;
  top?: string;
  left?: string;
  right?: string;
  bottom?: string;
  color: string;
  duration: number;
  delay?: number;
}) {
  return (
    <motion.div
      animate={{
        x: [0, 24, -16, 0],
        y: [0, -20, 14, 0],
      }}
      transition={{
        duration,
        delay,
        repeat: Infinity,
        ease: "easeInOut",
      }}
      style={{
        position: "absolute",
        top,
        left,
        right,
        bottom,
        width: size,
        height: size,
        borderRadius: "50%",
        background: color,
        filter: "blur(60px)",
        opacity: 0.55,
        pointerEvents: "none",
      }}
    />
  );
}

export default function AuthShell({ children }: AuthShellProps) {
  return (
    <Box sx={{ display: "flex", height: "100%", width: "100%" }}>
      {/* Branded panel */}
      <Box
        sx={{
          position: "relative",
          flex: "0 0 44%",
          display: { xs: "none", md: "flex" },
          flexDirection: "column",
          justifyContent: "space-between",
          overflow: "hidden",
          px: 6,
          py: 6,
          background:
            "linear-gradient(155deg, #0F2A5C 0%, #133B82 45%, #1A73E8 100%)",
          color: "#fff",
        }}
      >
        <FloatingBlob size={280} top="-60px" left="-60px" color="#3D8BFF" duration={9} />
        <FloatingBlob size={220} bottom="-40px" right="-40px" color="#8B5CF6" duration={11} delay={1} />
        <FloatingBlob size={160} top="40%" left="55%" color="#22C55E" duration={13} delay={2} />

        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          style={{ position: "relative", zIndex: 1 }}
        >
          <Typography
            sx={{
              fontSize: 28,
              fontWeight: 900,
              letterSpacing: "-0.05em",
              color: "#fff",
            }}
          >
            Eziyo
          </Typography>
        </motion.div>

        <MotionBox
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.15 }}
          sx={{ position: "relative", zIndex: 1 }}
        >
          <Typography
            sx={{
              fontSize: 34,
              fontWeight: 800,
              lineHeight: 1.25,
              letterSpacing: "-0.02em",
              mb: 2,
              maxWidth: 380,
            }}
          >
            Run your entire pipeline from one place.
          </Typography>

          <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
            {FEATURES.map((feature, i) => (
              <motion.div
                key={feature}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                style={{ display: "flex", alignItems: "center", gap: 10 }}
              >
                <CheckCircleOutlineIcon sx={{ fontSize: 18, color: "#8FD3A0" }} />
                <Typography sx={{ fontSize: 13.5, color: "rgba(255,255,255,0.9)" }}>
                  {feature}
                </Typography>
              </motion.div>
            ))}
          </Box>
        </MotionBox>

        <Typography
          sx={{
            position: "relative",
            zIndex: 1,
            fontSize: 11.5,
            color: "rgba(255,255,255,0.55)",
          }}
        >
          © {new Date().getFullYear()} Eziyo. All rights reserved.
        </Typography>
      </Box>

      {/* Form panel */}
      <Box
        sx={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "#fff",
          px: 3,
          py: 4,
          overflowY: "auto",
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, ease: "easeOut" }}
          style={{ width: "100%", maxWidth: 380 }}
        >
          <Box
            sx={{
              display: { xs: "flex", md: "none" },
              mb: 4,
            }}
          >
            <Typography
              sx={{
                fontSize: 26,
                fontWeight: 900,
                letterSpacing: "-0.05em",
                color: "#111",
              }}
            >
              Eziyo
            </Typography>
          </Box>
          {children}
        </motion.div>
      </Box>
    </Box>
  );
}
