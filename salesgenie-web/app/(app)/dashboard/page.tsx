"use client";

import React, { useState } from "react";
import { Box, Typography } from "@mui/material";
import { AnimatePresence, motion } from "framer-motion";

import DashboardOverview from "./components/DashboardOverview";
import DashboardDateFilter from "./components/DashboardDateFilter";

import ViewColumnOutlinedIcon from "@mui/icons-material/ViewColumnOutlined";

import StageBoard from "./components/StageBoard";
import StepPanel from "./components/StepPanel";
import type { Queue, Stage } from "@/app/lib/api/types";
import { useLeads } from "@/app/lib/hooks/useLeads";
import { useDashboardStats } from "@/app/lib/hooks/useDashboardStats";
import { DEFAULT_DASHBOARD_RANGE, type DateRangeValue } from "@/app/lib/dashboard/dateRange";

export default function HomePage() {
  const [activeQueue, setActiveQueue] = useState<Queue | null>(null);
  const [activeStage, setActiveStage] = useState<Stage | null>(null);
  const [dateRange, setDateRange] = useState<DateRangeValue>(DEFAULT_DASHBOARD_RANGE);
  const { createLead, refetch: refetchLeads } = useLeads();
  const {
    stats,
    loading: statsLoading,
    error: statsError,
    refetch: refetchStats,
  } = useDashboardStats({ startDate: dateRange.startDate, endDate: dateRange.endDate });
  // Each stage card fetches its own (server-paginated) lead list — bumping
  // this forces every expanded card to refetch after an action elsewhere
  // (allocate, create) may have changed which leads sit in which stage.
  const [leadsRefreshKey, setLeadsRefreshKey] = useState(0);

  const handleAllocated = () => {
    refetchLeads();
    refetchStats();
    setLeadsRefreshKey((k) => k + 1);
  };

  const handleCreateLead: typeof createLead = async (payload) => {
    const lead = await createLead(payload);
    refetchStats();
    setLeadsRefreshKey((k) => k + 1);
    return lead;
  };

  return (
    <>
      <Box sx={{ px: 3, pb: 3, maxWidth: 1440, mx: "auto" }}>
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              mb: 2.5,
            }}
          >
            <Typography
              sx={{
                fontSize: 20,
                fontWeight: 800,
                color: "#1A1A1A",
                letterSpacing: "-0.01em",
              }}
            >
              {stats?.workspaceName}
            </Typography>
            <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
              <DashboardDateFilter value={dateRange} onChange={setDateRange} />
            </Box>
          </Box>
        </motion.div>

        {/* Stats + chart + quarterly target — one combined component */}
        <DashboardOverview
          stats={stats}
          statsLoading={statsLoading}
          statsError={statsError}
          onRetryStats={refetchStats}
          onAllocated={handleAllocated}
          createLead={handleCreateLead}
        />

        <Box sx={{ display: "flex", gap: 2, mt: 3, alignItems: "flex-start" }}>
          <motion.div
            style={{ flex: 1, minWidth: 0 }} // grows to fill the space beside the (now narrower) action box
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
          >
            <StageBoard
              refreshKey={leadsRefreshKey}
              onSelectStage={(stage) => setActiveStage(stage)}
              onQueueChange={(queue) => {
                setActiveQueue(queue);
                setActiveStage(null);
              }}
            />
          </motion.div>

          <AnimatePresence mode="wait">
            {activeStage ? (
              <motion.div
                key="step-panel"
                style={{ flex: "0 0 550px", marginTop: 50 }}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 24 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <StepPanel
                  queueId={activeQueue?.id ?? null}
                  queueName={activeQueue?.name ?? ""}
                  stageId={activeStage.id}
                  stageName={activeStage.name}
                />
              </motion.div>
            ) : (
              <motion.div
                key="step-empty"
                style={{ flex: "0 0 470px", marginTop: 90 }}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 12 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                <Box
                  sx={{
                    height: "100%",
                    minHeight: 260,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 1,
                    border: "1px dashed #CBD9EE",
                    borderRadius: "10px",
                    bgcolor: "#FAFBFE",
                    px: 3,
                    textAlign: "center",
                  }}
                >
                  <ViewColumnOutlinedIcon
                    sx={{ fontSize: 34, color: "#B7C6DE" }}
                  />
                  <Typography
                    sx={{ fontSize: 13.5, fontWeight: 600, color: "#5A5A5A" }}
                  >
                    No stage selected
                  </Typography>
                  <Typography
                    sx={{ fontSize: 12.5, color: "#8A8A8A", maxWidth: 260 }}
                  >
                    Select a stage to configure the action it sends.
                  </Typography>
                </Box>
              </motion.div>
            )}
          </AnimatePresence>
        </Box>
      </Box>
    </>
  );
}
