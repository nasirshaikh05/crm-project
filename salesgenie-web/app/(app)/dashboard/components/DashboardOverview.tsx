"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Chip,
  Avatar,
  CircularProgress,
  Button,
  Modal,
  Fade,
} from "@mui/material";
import { motion, type Variants } from "framer-motion";
import {
  People as PeopleIcon,
  PersonAddAlt1 as PersonAddIcon,
  DirectionsRun as RunIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
} from "@mui/icons-material";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import { LineChart } from "@mui/x-charts/LineChart";
import CreateLeadDialog from "./CreateLeadDialog";
import AllocateLeadsDialog from "./AllocateLeadsDialog";
import {
  useCountUp,
  parseDisplayValue,
  formatCountUp,
} from "@/app/lib/hooks/useCountUp";
import { StatCardData } from "../type";
import type {
  CreateLeadPayload,
  DashboardStats,
  Lead,
} from "@/app/lib/api/types";

const STAT_ICONS = {
  people: PeopleIcon,
  personAdd: PersonAddIcon,
  run: RunIcon,
};

const STAT_CARD_DEFS: {
  key: "totalLeads" | "newLeads" | "avgConversion";
  label: string;
  icon: keyof typeof STAT_ICONS;
  suffix: string;
}[] = [
  { key: "totalLeads", label: "Total Leads", icon: "people", suffix: "" },
  { key: "newLeads", label: "New Leads", icon: "personAdd", suffix: "%" },
  { key: "avgConversion", label: "Avg Conversion", icon: "run", suffix: "%" },
];

const MotionBox = motion.create(Box);

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

function AnimatedStatCard({ data }: { data: StatCardData }) {
  const { numeric } = parseDisplayValue(data.value);
  const current = useCountUp(numeric, 1000);
  const Icon = STAT_ICONS[data.icon];
  const TrendIcon =
    data.trendDirection === "up" ? TrendingUpIcon : TrendingDownIcon;
  const trendColor = data.trendDirection === "up" ? "#1F9254" : "#C73535";

  return (
    <MotionBox
      variants={itemVariants}
      whileHover={{ y: -3, boxShadow: "0 8px 20px rgba(0,0,0,0.07)" }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      sx={{
        border: "1px solid #DCDCDC",
        borderRadius: 2,
        p: 2,
        bgcolor: "#fff",
        display: "flex",
        flexDirection: "column",
        gap: 1,
      }}
    >
      <Box
        sx={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
        }}
      >
        <Box>
          <Typography
            sx={{
              fontSize: 28,
              fontWeight: 800,
              color: "#1A1A1A",
              letterSpacing: "-0.02em",
              lineHeight: 1.1,
            }}
          >
            {formatCountUp(data.value, current)}
          </Typography>
          <Typography
            sx={{ fontSize: 13, color: "#666", fontWeight: 600, mt: 0.5 }}
          >
            {data.label}
          </Typography>
        </Box>
        <MotionBox
          whileHover={{ rotate: 8, scale: 1.08 }}
          sx={{
            width: 34,
            height: 34,
            borderRadius: "50%",
            bgcolor: "#F5F5F5",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          <Icon sx={{ fontSize: 18, color: "#1A6FEA" }} />
        </MotionBox>
      </Box>
      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
        <TrendIcon sx={{ fontSize: 15, color: trendColor }} />
        <Typography sx={{ fontSize: 11.5, color: "#888", fontWeight: 600 }}>
          {data.trendLabel}
        </Typography>
      </Box>
    </MotionBox>
  );
}

interface DashboardOverviewProps {
  stats: DashboardStats | null;
  statsLoading: boolean;
  statsError: string | null;
  onRetryStats: () => void;
  onAllocated: () => void;
  createLead: (payload: CreateLeadPayload) => Promise<Lead>;
}

export default function DashboardOverview({
  stats,
  statsLoading,
  statsError,
  onRetryStats,
  onAllocated,
  createLead,
}: DashboardOverviewProps) {
  const [logoPreviewOpen, setLogoPreviewOpen] = useState(false);

  if (statsLoading && !stats) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
        <CircularProgress size={24} />
      </Box>
    );
  }

  if (statsError && !stats) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.75,
          px: 1.5,
          py: 1,
          border: "1px solid #F5C2C2",
          borderRadius: "8px",
          bgcolor: "#FDEBEB",
          color: "#B23A3A",
          fontSize: 12.5,
        }}
      >
        <ErrorOutlineIcon sx={{ fontSize: 16 }} />
        Couldn&apos;t load dashboard stats — {statsError}
        <Button
          size="small"
          onClick={onRetryStats}
          sx={{
            ml: "auto",
            textTransform: "none",
            fontSize: 12,
            fontWeight: 700,
          }}
        >
          Retry
        </Button>
      </Box>
    );
  }

  if (!stats) return null;

  const statCards: StatCardData[] = STAT_CARD_DEFS.map((def) => {
    const stat = stats[def.key];
    return {
      id: def.key,
      value: `${stat.value.toLocaleString()}${def.suffix}`,
      label: def.label,
      trendLabel: `${stat.changePercentage}% ${stat.trend === "up" ? "Up" : "Down"} vs previous period`,
      trendDirection: stat.trend,
      icon: def.icon,
    };
  });

  return (
    <MotionBox variants={containerVariants} initial="hidden" animate="show">
      {/* Stat cards — same 3-column grid as the row below, so the chart
          (spanning 2 columns) and quarterly target (1 column) line up
          exactly with these cards' edges. A flex:2/flex:1 split doesn't,
          since a 3-item and a 2-item flex row subtract a different number
          of gaps from the available width before dividing it. */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2, mb: 2 }}>
        {statCards.map((card) => (
          <AnimatedStatCard key={card.id} data={card} />
        ))}
      </Box>

      {/* Chart + quarterly target */}
      <Box sx={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 2 }}>
        <MotionBox
          variants={itemVariants}
          sx={{
            gridColumn: "span 2",
            border: "1px solid #DCDCDC",
            borderRadius: 2,
            bgcolor: "#fff",
            p: 2,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2,
            }}
          >
            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
              {stats.workspaceLogo ? (
                <Avatar
                  src={stats.workspaceLogo}
                  variant="rounded"
                  onClick={() => setLogoPreviewOpen(true)}
                  sx={{
                    width: 36,
                    height: 36,
                    border: "1px solid #E5E5E5",
                    boxShadow: "0 2px 6px rgba(0,0,0,0.08)",
                    cursor: "pointer",
                    transition: "transform 0.15s ease",
                    "&:hover": { transform: "scale(1.08)" },
                  }}
                />
              ) : (
                <Chip
                  label="LOGO"
                  size="small"
                  sx={{
                    bgcolor: "#FDBA2D",
                    color: "#1A1A1A",
                    fontWeight: 800,
                    fontSize: 10,
                    height: 20,
                  }}
                />
              )}
              <Typography
                sx={{ fontWeight: 700, fontSize: 14, color: "#1A1A1A" }}
              >
                {stats.workspaceName}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
            <AllocateLeadsDialog onAllocated={onAllocated} />
            <CreateLeadDialog createLead={createLead} />
          </Box>

          <LineChart
            dataset={stats.chartData as unknown as Record<string, unknown>[]}
            xAxis={[{ dataKey: "date", scaleType: "point" }]}
            series={[
              {
                dataKey: "comparison",
                label: "Previous period",
                color: "#E0E0E0",
                showMark: false,
                area: false,
                curve: "monotoneX",
              },
              {
                dataKey: "leads",
                label: "New leads",
                color: "#1A1A1A",
                showMark: false,
                area: false,
                curve: "monotoneX",
              },
            ]}
            height={220}
            grid={{ horizontal: false, vertical: false }}
            margin={{ left: 10, right: 10, top: 10, bottom: 24 }}
            hideLegend
          />
        </MotionBox>

        <MotionBox
          variants={itemVariants}
          sx={{
            gridColumn: "span 1",
            border: "1px solid #DCDCDC",
            borderRadius: 2,
            bgcolor: "#fff",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 13, color: "#1A1A1A" }}>
            Quarterly target
          </Typography>

          <Box>
            <Typography
              sx={{
                fontSize: 22,
                fontWeight: 800,
                color: "#1A1A1A",
                letterSpacing: "-0.02em",
              }}
            >
              {stats.quarterlyTarget.target} customers
            </Typography>
            <Typography
              sx={{ fontSize: 13, color: "#888", fontWeight: 600, mt: 0.5 }}
            >
              Current {stats.quarterlyTarget.current}
            </Typography>
          </Box>

          <Box sx={{ mt: "auto" }}>
            <Box
              sx={{
                border: "1px solid #1A1A1A",
                borderRadius: "4px",
                height: 14,
                position: "relative",
                overflow: "hidden",
                bgcolor: "#fff",
              }}
            >
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${stats.quarterlyTarget.percentage}%` }}
                transition={{ duration: 1, ease: "easeOut", delay: 0.2 }}
                style={{
                  position: "absolute",
                  top: 0,
                  left: 0,
                  bottom: 0,
                  background: "#DCDCDC",
                }}
              />
            </Box>
            <Typography
              sx={{ fontSize: 11, color: "#888", fontWeight: 600, mt: 0.75 }}
            >
              {stats.quarterlyTarget.percentage}% of target reached
            </Typography>
          </Box>
        </MotionBox>
      </Box>

      {stats.workspaceLogo && (
        <Modal
          open={logoPreviewOpen}
          onClose={() => setLogoPreviewOpen(false)}
          closeAfterTransition
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Fade in={logoPreviewOpen}>
            <Box
              onClick={() => setLogoPreviewOpen(false)}
              sx={{
                outline: "none",
                cursor: "pointer",
                p: 1,
                bgcolor: "#fff",
                borderRadius: 3,
                boxShadow: "0 12px 40px rgba(0,0,0,0.25)",
              }}
            >
              <Box
                component="img"
                src={stats.workspaceLogo}
                alt={stats.workspaceName}
                sx={{
                  display: "block",
                  maxWidth: "min(80vw, 420px)",
                  maxHeight: "min(80vh, 420px)",
                  borderRadius: 2,
                }}
              />
            </Box>
          </Fade>
        </Modal>
      )}
    </MotionBox>
  );
}
