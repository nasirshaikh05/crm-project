"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Checkbox,
  Chip,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Select,
} from "@mui/material";
import { motion, type Variants } from "framer-motion";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import AssignmentIndOutlinedIcon from "@mui/icons-material/AssignmentIndOutlined";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

import AssignLeadPanel from "./AssignLeadPanel";
import SendEmailDialog from "./SendEmailDialog";
import type { LeadRecord, StagePhaseKind } from "../type";

interface LeadsTableProps {
  leads: LeadRecord[];
  hasMore: boolean;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  onAssign: (leadId: string, queueId: string, stageId: string) => void;
}

const MotionBox = motion.create(Box);
const MotionIconButton = motion.create(IconButton);

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const STAGE_CHIP_STYLES: Record<
  StagePhaseKind,
  { bgcolor: string; color: string; plain?: boolean }
> = {
  active: { bgcolor: "#EAF2FE", color: "#1A1A1A" },
  warning: { bgcolor: "#FFF6DE", color: "#1A1A1A" },
  "at-risk": { bgcolor: "#FDEBEB", color: "#1A1A1A" },
  unassigned: { bgcolor: "transparent", color: "#8A8A8A", plain: true },
};

const columns = [
  "",
  "NAME",
  "PHONE",
  "SUBURB",
  "STATE",
  "POSTCODE",
  "STAGE || PHASE",
  "QUEUE",
  "",
];

const gridTemplateColumns = "40px 1.8fr 1fr 1fr 1fr 1fr 1.3fr 1fr 48px";

export default function LeadsTable({
  leads,
  hasMore,
  page,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
  onAssign,
}: LeadsTableProps) {
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    leadId: string;
  } | null>(null);
  const [assignAnchor, setAssignAnchor] = useState<{
    el: HTMLElement;
    leadId: string;
  } | null>(null);
  const [emailLeadId, setEmailLeadId] = useState<string | null>(null);

  const menuLead = leads.find((l) => l.id === menuAnchor?.leadId) ?? null;
  const activeAssignLead = leads.find((l) => l.id === assignAnchor?.leadId) ?? null;
  const activeEmailLead = leads.find((l) => l.id === emailLeadId) ?? null;

  const closeMenu = () => setMenuAnchor(null);

  return (
    <Box
      sx={{
        border: "1px solid #E0E0E0",
        borderRadius: "12px",
        bgcolor: "#fff",
        overflow: "hidden",
      }}
    >
      {/* Header row */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns,
          alignItems: "center",
          px: 2,
          py: 1.25,
          borderBottom: "1px solid #F0F0F0",
          bgcolor: "#FAFBFE",
        }}
      >
        {columns.map((col, i) =>
          i === 0 ? (
            <Checkbox key={i} size="small" sx={{ p: 0 }} />
          ) : (
            <Typography
              key={i}
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: "#8A8A8A",
                letterSpacing: "0.03em",
              }}
            >
              {col}
            </Typography>
          ),
        )}
      </Box>

      {/* Rows */}
      <MotionBox variants={containerVariants} initial="hidden" animate="show">
        {leads.map((lead) => {
          const chipStyle = STAGE_CHIP_STYLES[lead.stagePhase.kind];
          return (
            <MotionBox
              key={lead.id}
              variants={rowVariants}
              onClick={() => router.push(`/leads/${lead.id}`)}
              sx={{
                display: "grid",
                gridTemplateColumns,
                alignItems: "center",
                px: 2,
                py: 1.4,
                borderBottom: "1px solid #F5F5F5",
                cursor: "pointer",
                "&:hover": { bgcolor: "#FAFBFE" },
              }}
            >
              <Checkbox
                size="small"
                sx={{ p: 0 }}
                onClick={(e) => e.stopPropagation()}
              />

              <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                <Avatar
                  sx={{
                    width: 30,
                    height: 30,
                    fontSize: 11.5,
                    fontWeight: 700,
                    bgcolor: lead.avatarColor,
                    color: "#1A1A1A",
                  }}
                >
                  {lead.firstName[0]}
                  {lead.lastName[0]}
                </Avatar>
                <Box sx={{ minWidth: 0 }}>
                  <Typography
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 700,
                      color: "#1A1A1A",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {lead.firstName} {lead.lastName}
                  </Typography>
                  <Typography
                    sx={{
                      fontSize: 11.5,
                      color: "#8A8A8A",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {lead.email}
                  </Typography>
                </Box>
              </Box>

              <Typography sx={{ fontSize: 12.5, color: "#1A1A1A" }}>
                {lead.phone || "-"}
              </Typography>

              <Typography
                sx={{
                  fontSize: 12.5,
                  color: "#1A1A1A",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {lead.suburb || "-"}
              </Typography>

              <Typography
                sx={{
                  fontSize: 12.5,
                  color: "#1A1A1A",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {lead.state || "-"}
              </Typography>

              <Typography sx={{ fontSize: 12.5, color: "#1A1A1A" }}>
                {lead.postcode || "-"}
              </Typography>

              <Box>
                {chipStyle.plain ? (
                  <Typography sx={{ fontSize: 12.5, color: chipStyle.color }}>
                    {lead.stagePhase.label}
                  </Typography>
                ) : (
                  <Chip
                    label={lead.stagePhase.label}
                    size="small"
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      bgcolor: chipStyle.bgcolor,
                      color: chipStyle.color,
                    }}
                  />
                )}
              </Box>

              <Box>
                {lead.queue ? (
                  <Chip
                    label={lead.queue}
                    size="small"
                    sx={{
                      fontSize: 11.5,
                      fontWeight: 600,
                      bgcolor: "#F5F5F5",
                      color: "#5A5A5A",
                    }}
                  />
                ) : (
                  <Typography sx={{ fontSize: 12.5, color: "#B0B0B0" }}>
                    -
                  </Typography>
                )}
              </Box>

              <IconButton
                size="small"
                onClick={(e) => {
                  e.stopPropagation();
                  setMenuAnchor({ el: e.currentTarget, leadId: lead.id });
                }}
              >
                <MoreVertIcon sx={{ fontSize: 18, color: "#5A5A5A" }} />
              </IconButton>
            </MotionBox>
          );
        })}
      </MotionBox>

      {/* Row actions menu — Send email always available; Assign only for
          leads that don't already sit in a queue. */}
      <Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            if (menuAnchor) setEmailLeadId(menuAnchor.leadId);
            closeMenu();
          }}
          sx={{ fontSize: 12.5, gap: 1 }}
        >
          <EmailOutlinedIcon sx={{ fontSize: 17, color: "#5A5A5A" }} />
          Send email
        </MenuItem>
        {menuLead && !menuLead.queue && (
          <MenuItem
            onClick={() => {
              if (menuAnchor) setAssignAnchor(menuAnchor);
              closeMenu();
            }}
            sx={{ fontSize: 12.5, gap: 1 }}
          >
            <AssignmentIndOutlinedIcon sx={{ fontSize: 17, color: "#5A5A5A" }} />
            Assign
          </MenuItem>
        )}
      </Menu>

      {activeAssignLead && (
        <AssignLeadPanel
          anchorEl={assignAnchor?.el ?? null}
          leadName={`${activeAssignLead.firstName} ${activeAssignLead.lastName}`}
          currentQueue={activeAssignLead.queue}
          currentStage={null}
          onClose={() => setAssignAnchor(null)}
          onSave={(queueId, stageId) => {
            onAssign(activeAssignLead.id, queueId, stageId);
            setAssignAnchor(null);
          }}
        />
      )}

      {activeEmailLead && (
        <SendEmailDialog
          leadName={`${activeEmailLead.firstName} ${activeEmailLead.lastName}`}
          leadEmail={activeEmailLead.email}
          onClose={() => setEmailLeadId(null)}
        />
      )}

      {/* Footer */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          px: 2,
          py: 1.25,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: 12, color: "#8A8A8A" }}>Show</Typography>
          <Select
            size="small"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            sx={{
              fontSize: 12,
              "& .MuiSelect-select": { py: 0.4, px: 1 },
            }}
          >
            {pageSizeOptions.map((size) => (
              <MenuItem key={size} value={size} sx={{ fontSize: 12 }}>
                {size}
              </MenuItem>
            ))}
          </Select>
          <Typography sx={{ fontSize: 12, color: "#8A8A8A" }}>
            {leads.length === 0
              ? "0"
              : `${(page - 1) * pageSize + 1}-${(page - 1) * pageSize + leads.length}${
                  hasMore ? "+" : ""
                }`}
          </Typography>
        </Box>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Typography sx={{ fontSize: 12, color: "#5A5A5A" }}>
            Page {page}
          </Typography>
          <MotionIconButton
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            size="small"
            disabled={page <= 1}
            onClick={() => onPageChange(page - 1)}
            sx={{ border: "1px solid #E0E0E0" }}
          >
            <KeyboardArrowLeftIcon sx={{ fontSize: 18 }} />
          </MotionIconButton>
          <MotionIconButton
            whileHover={{ scale: 1.08 }}
            whileTap={{ scale: 0.92 }}
            size="small"
            disabled={!hasMore}
            onClick={() => onPageChange(page + 1)}
            sx={{ border: "1px solid #E0E0E0" }}
          >
            <KeyboardArrowRightIcon sx={{ fontSize: 18 }} />
          </MotionIconButton>
        </Box>
      </Box>
    </Box>
  );
}
