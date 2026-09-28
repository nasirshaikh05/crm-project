"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  MenuItem,
  Select,
  TextField,
  InputAdornment,
  Skeleton,
} from "@mui/material";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import SearchIcon from "@mui/icons-material/Search";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";

import { useStageLeads } from "@/app/lib/hooks/useStageLeads";
import type { Stage } from "@/app/lib/api/types";

const PAGE_SIZE_OPTIONS = [50, 100, 200];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];
const SKELETON_ROW_COUNT = 5;

const MotionBox = motion.create(Box);

// `show` is a function (a "dynamic variant") so it can react to the
// per-instance `custom` prop (isExpanded) — needed because framer-motion
// writes animated values like `y`/`opacity`/`boxShadow` directly onto the
// DOM node as inline styles, which always beats a same-property rule from
// sx (a CSS class). Controlling the elevation here, through the same
// system that owns those properties, is the only way it actually applies.
const itemVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: ({ isExpanded }: { isExpanded: boolean }) => ({
    opacity: isExpanded ? 1 : 0.9,
    y: isExpanded ? -5 : 0,
    boxShadow: isExpanded
      ? "0 10px 24px rgba(0,0,0,0.12)"
      : "0 0px 0px rgba(0,0,0,0)",
    transition: { duration: 0.35, ease: "easeOut" },
  }),
};

const skeletonContainerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const skeletonRowVariants: Variants = {
  hidden: { opacity: 0, y: 6 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

function ColumnHeaderRow() {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        px: 0.5,
        pr: 1.5,
        pb: 0.5,
      }}
    >
      <Box sx={{ width: 16 }} />
      <Typography
        sx={{
          flex: 1.4,
          minWidth: 0,
          fontSize: 11,
          fontWeight: 800,
          color: "#4A4A4A",
          letterSpacing: "0.03em",
        }}
      >
        NAME
      </Typography>
      <Typography
        sx={{
          flex: 1,
          fontSize: 11,
          fontWeight: 800,
          color: "#4A4A4A",
          letterSpacing: "0.03em",
        }}
      >
        PHONE
      </Typography>
      <Typography
        sx={{
          flex: 1,
          fontSize: 11,
          fontWeight: 800,
          color: "#4A4A4A",
          letterSpacing: "0.03em",
        }}
      >
        SUBURB
      </Typography>
      <Typography
        sx={{
          flex: 1,
          fontSize: 11,
          fontWeight: 800,
          color: "#4A4A4A",
          letterSpacing: "0.03em",
        }}
      >
        STATE
      </Typography>
      <Typography
        sx={{
          flex: 1,
          fontSize: 11,
          fontWeight: 800,
          color: "#4A4A4A",
          letterSpacing: "0.03em",
        }}
      >
        POSTCODE
      </Typography>
    </Box>
  );
}

function LeadRowSkeleton() {
  return (
    <MotionBox
      variants={skeletonRowVariants}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.5,
        py: 0.9,
        px: 0.5,
        borderBottom: "1px solid #F5F5F5",
      }}
    >
      <Skeleton variant="circular" width={16} height={16} />
      <Box sx={{ flex: 1.4, minWidth: 0 }}>
        <Skeleton variant="text" sx={{ fontSize: 12.5 }} width="65%" />
        <Skeleton variant="text" sx={{ fontSize: 11 }} width="45%" />
      </Box>
      <Skeleton variant="text" sx={{ fontSize: 12.5, flex: 1 }} width="70%" />
      <Skeleton variant="text" sx={{ fontSize: 12.5, flex: 1 }} width="50%" />
      <Skeleton variant="text" sx={{ fontSize: 12.5, flex: 1 }} width="55%" />
      <Skeleton variant="text" sx={{ fontSize: 12.5, flex: 1 }} width="60%" />
    </MotionBox>
  );
}

interface StageCardProps {
  stage: Stage;
  index: number;
  isExpanded: boolean;
  /** Bumped by the parent after an action (e.g. allocate) that may have
   *  changed which leads sit in this stage, forcing a refetch. */
  refreshKey: number;
  onExpand: () => void;
}

export default function StageCard({
  stage,
  index,
  isExpanded,
  refreshKey,
  onExpand,
}: StageCardProps) {
  // `search` updates on every keystroke so the box feels responsive;
  // `debouncedSearch` is what actually drives fetching + pagination reset,
  // so typing doesn't fire a request (or jump back to page 1) per letter.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSizeState] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch]);

  const { leads, hasMore, loading, error } = useStageLeads({
    stageId: stage.id,
    search: debouncedSearch,
    page,
    pageSize,
    enabled: isExpanded,
    refreshKey,
  });

  const setPageSize = (size: number) => {
    setPageSizeState(size);
    setPage(1);
  };

  const startIdx = (page - 1) * pageSize;
  // Only show the skeleton placeholder on the very first load for this
  // stage/search — `leads` holds the previous results until fresh data
  // actually arrives, so a debounced-search refetch can keep showing them
  // instead of blanking the list out into a differently-sized skeleton
  // block (which read as flicker).
  const showSkeleton = loading && leads.length === 0;

  return (
    <MotionBox
      variants={itemVariants}
      custom={{ isExpanded }}
      whileHover={{
        y: isExpanded ? -5 : -3,
        boxShadow: "0 8px 20px rgba(0,0,0,0.07)",
      }}
      transition={{ type: "spring", stiffness: 300, damping: 22 }}
      onClick={onExpand}
      sx={{
        border: isExpanded ? "1px solid #1A73E8" : "1px solid #E0E0E0",
        borderRadius: "10px",
        bgcolor: "#fff",
        cursor: "pointer",
        transition: "border-color 150ms ease",
      }}
    >
      {/* Card header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 1.5,
          px: 2,
          py: 1.25,
          borderBottom: isExpanded ? "1px solid #F0F0F0" : "none",
        }}
      >
        <Box
          sx={{ display: "flex", alignItems: "center", gap: 1.5, minWidth: 0 }}
        >
          <Typography
            sx={{
              fontSize: 13.5,
              fontWeight: 700,
              color: "#1A73E8",
              whiteSpace: "nowrap",
            }}
          >
            Stage {index + 1}{" "}
            <Typography
              component="span"
              sx={{ fontWeight: 500, color: "#1A1A1A" }}
            >
              {" "}
              {stage.name}
            </Typography>
          </Typography>

          {isExpanded && (
            <Box
              onClick={(e) => e.stopPropagation()}
              sx={{ display: "flex", alignItems: "center", gap: 1.5 }}
            >
              <TextField
                size="small"
                placeholder={`Search in ${stage.name}...`}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                slotProps={{
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon sx={{ fontSize: 16, color: "#B0B0B0" }} />
                      </InputAdornment>
                    ),
                  },
                }}
                sx={{
                  width: 240,
                  "& .MuiOutlinedInput-root": {
                    borderRadius: "8px",
                    fontSize: 12.5,
                  },
                }}
              />
              {showSkeleton ? (
                <Skeleton variant="text" width={50} height={16} />
              ) : (
                <Typography
                  sx={{
                    fontSize: 12,
                    color: "#8A8A8A",
                    fontWeight: 600,
                    whiteSpace: "nowrap",
                  }}
                >
                  {`${leads.length}${hasMore ? "+" : ""} ${
                    leads.length === 1 && !hasMore ? "lead" : "leads"
                  }`}
                </Typography>
              )}
            </Box>
          )}
        </Box>

        <IconButton size="small">
          <MoreVertIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {/* Rows */}
      {isExpanded && (
        <Box sx={{ px: 2, py: 1 }}>
          {error && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.75,
                mb: 1,
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
              Couldn&apos;t load leads — {error}
            </Box>
          )}

          {showSkeleton ? (
            <>
              <ColumnHeaderRow />
              <MotionBox
                variants={skeletonContainerVariants}
                initial="hidden"
                animate="show"
                sx={{ display: "flex", flexDirection: "column" }}
              >
                {Array.from({ length: SKELETON_ROW_COUNT }).map((_, i) => (
                  <LeadRowSkeleton key={i} />
                ))}
              </MotionBox>
            </>
          ) : (
            <>
              {leads.length > 0 && <ColumnHeaderRow />}

              {leads.length === 0 && !error && (
                <Typography sx={{ fontSize: 12.5, color: "#B0B0B0", py: 1.5 }}>
                  {search.trim()
                    ? "No leads match your search."
                    : "No leads in this stage yet."}
                </Typography>
              )}

              <MotionBox
                initial="hidden"
                animate="show"
                sx={{
                  display: "flex",
                  flexDirection: "column",
                  maxHeight: 320,
                  overflowY: "auto",
                  pr: 1.5,
                  opacity: loading ? 0.6 : 1,
                  transition: "opacity 150ms ease",
                  "&::-webkit-scrollbar": {
                    width: 5,
                  },
                  "&::-webkit-scrollbar-thumb": {
                    bgcolor: "#D0D0D0",
                    borderRadius: "3px",
                  },
                  "&::-webkit-scrollbar-track": {
                    bgcolor: "transparent",
                  },
                }}
              >
                <AnimatePresence>
                  {leads.map((lead) => (
                    <MotionBox
                      key={lead.id}
                      exit="exit"
                      sx={{
                        display: "flex",
                        alignItems: "center",
                        gap: 1.5,
                        py: 0.9,
                        px: 0.5,
                        borderRadius: "6px",
                        borderBottom: "1px solid #F5F5F5",
                        fontSize: 12.5,
                      }}
                    >
                      <PersonOutlineOutlinedIcon
                        sx={{ fontSize: 16, color: "#B0B0B0" }}
                      />
                      <Box sx={{ flex: 1.4, minWidth: 0 }}>
                        <Typography
                          sx={{
                            fontSize: 12.5,
                            fontWeight: 400,
                            color: "#1A1A1A",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {lead.firstName}, {lead.lastName}
                        </Typography>
                        <Typography
                          sx={{
                            fontSize: 11,
                            color: "#8A8A8A",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {lead.email}
                        </Typography>
                      </Box>
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          flex: 1,
                          color: "#8A8A8A",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {lead.phoneNumber}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          flex: 1,
                          color: "#8A8A8A",
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
                          flex: 1,
                          color: "#8A8A8A",
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                        }}
                      >
                        {lead.state || "-"}
                      </Typography>
                      <Typography
                        sx={{
                          fontSize: 12.5,
                          flex: 1,
                          color: "#8A8A8A",
                        }}
                      >
                        {lead.postcode || "-"}
                      </Typography>
                    </MotionBox>
                  ))}
                </AnimatePresence>
              </MotionBox>

              {(leads.length > 0 || page > 1) && (
                <Box
                  onClick={(e) => e.stopPropagation()}
                  sx={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    mt: 1,
                    pt: 1,
                    borderTop: "1px solid #F0F0F0",
                  }}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                    <Typography sx={{ fontSize: 11.5, color: "#8A8A8A" }}>
                      Show
                    </Typography>
                    <Select
                      size="small"
                      value={pageSize}
                      onChange={(e) => setPageSize(Number(e.target.value))}
                      sx={{
                        fontSize: 12,
                        "& .MuiSelect-select": { py: 0.4, px: 1 },
                      }}
                    >
                      {PAGE_SIZE_OPTIONS.map((size) => (
                        <MenuItem key={size} value={size} sx={{ fontSize: 12 }}>
                          {size}
                        </MenuItem>
                      ))}
                    </Select>
                    <Typography sx={{ fontSize: 11.5, color: "#8A8A8A" }}>
                      {leads.length === 0
                        ? "0"
                        : `${startIdx + 1}-${startIdx + leads.length}${
                            hasMore ? "+" : ""
                          }`}
                    </Typography>
                  </Box>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                    <IconButton
                      size="small"
                      disabled={page <= 1}
                      onClick={() => setPage(page - 1)}
                      sx={{ border: "1px solid #E0E0E0" }}
                    >
                      <KeyboardArrowLeftIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                    <Typography sx={{ fontSize: 11.5, color: "#5A5A5A" }}>
                      Page {page}
                    </Typography>
                    <IconButton
                      size="small"
                      disabled={!hasMore}
                      onClick={() => setPage(page + 1)}
                      sx={{ border: "1px solid #E0E0E0" }}
                    >
                      <KeyboardArrowRightIcon sx={{ fontSize: 16 }} />
                    </IconButton>
                  </Box>
                </Box>
              )}
            </>
          )}
        </Box>
      )}
    </MotionBox>
  );
}
