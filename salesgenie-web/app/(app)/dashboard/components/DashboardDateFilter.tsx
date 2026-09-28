"use client";

import React, { useState } from "react";
import { Box, Button, Menu, MenuItem, Divider, Typography } from "@mui/material";
import { KeyboardArrowDown as ChevronIcon } from "@mui/icons-material";
import CalendarTodayOutlinedIcon from "@mui/icons-material/CalendarTodayOutlined";
import { DateRange, type Range, type RangeKeyDict } from "react-date-range";
import "react-date-range/dist/styles.css";
import "react-date-range/dist/theme/default.css";

import {
  presetRange,
  rangeFromDates,
  type DateRangePreset,
  type DateRangeValue,
} from "@/app/lib/dashboard/dateRange";

const PRESETS: { key: Exclude<DateRangePreset, "custom">; label: string }[] = [
  { key: "7d", label: "Last 7 days" },
  { key: "30d", label: "Last 30 days" },
  { key: "90d", label: "Last 90 days" },
];

const SELECTION_KEY = "selection";

interface DashboardDateFilterProps {
  value: DateRangeValue;
  onChange: (value: DateRangeValue) => void;
}

/** The single shared date filter for the whole dashboard — replaces the
 *  handful of decorative per-card "Date" dropdowns, which weren't wired to
 *  anything real. */
export default function DashboardDateFilter({ value, onChange }: DashboardDateFilterProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [showCustom, setShowCustom] = useState(false);
  const [draft, setDraft] = useState<Range>({
    startDate: new Date(value.startDate),
    endDate: new Date(value.endDate),
    key: SELECTION_KEY,
  });

  const closeMenu = () => {
    setAnchorEl(null);
    setShowCustom(false);
  };

  const handlePreset = (preset: Exclude<DateRangePreset, "custom">) => {
    onChange(presetRange(preset));
    closeMenu();
  };

  const openCustom = () => {
    setDraft({
      startDate: new Date(value.startDate),
      endDate: new Date(value.endDate),
      key: SELECTION_KEY,
    });
    setShowCustom(true);
  };

  const handleCalendarChange = (ranges: RangeKeyDict) => {
    const selection = ranges[SELECTION_KEY];
    if (selection) setDraft(selection);
  };

  const applyCustom = () => {
    if (!draft.startDate || !draft.endDate) return;
    onChange(rangeFromDates(draft.startDate, draft.endDate));
    closeMenu();
  };

  return (
    <>
      <Button
        onClick={(e) => setAnchorEl(e.currentTarget)}
        size="small"
        startIcon={<CalendarTodayOutlinedIcon sx={{ fontSize: 15 }} />}
        endIcon={<ChevronIcon sx={{ fontSize: 18, color: "#888" }} />}
        sx={{
          border: "1px solid #DCDCDC",
          borderRadius: "8px",
          color: "#1A1A1A",
          textTransform: "none",
          fontWeight: 700,
          fontSize: 12.5,
          px: 1.5,
          "&:hover": { bgcolor: "#F5F5F5" },
        }}
      >
        {value.label}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeMenu}
        elevation={3}
        slotProps={{ paper: { sx: { mt: 0.5, borderRadius: 2, minWidth: 200 } } }}
      >
        {!showCustom
          ? [
              ...PRESETS.map((p) => (
                <MenuItem
                  key={p.key}
                  selected={value.preset === p.key}
                  onClick={() => handlePreset(p.key)}
                  sx={{ fontSize: 12.5, fontWeight: value.preset === p.key ? 700 : 500 }}
                >
                  {p.label}
                </MenuItem>
              )),
              <MenuItem
                key="custom"
                selected={value.preset === "custom"}
                onClick={openCustom}
                sx={{ fontSize: 12.5, fontWeight: value.preset === "custom" ? 700 : 500 }}
              >
                Custom range
              </MenuItem>,
            ]
          : [
              <Box key="custom-range" sx={{ display: "flex", flexDirection: "column" }}>
                <Typography
                  sx={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#8A8A8A",
                    textTransform: "uppercase",
                    px: 2,
                    pt: 1.5,
                  }}
                >
                  Custom range
                </Typography>
                <Box sx={{ "& .rdrCalendarWrapper": { fontSize: 12.5 } }}>
                  <DateRange
                    ranges={[draft]}
                    onChange={handleCalendarChange}
                    months={2}
                    direction="horizontal"
                    moveRangeOnFirstSelection={false}
                    rangeColors={["#1A73E8"]}
                    showDateDisplay={false}
                  />
                </Box>
                <Divider />
                <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 0.5, px: 2, py: 1.5 }}>
                  <Button
                    size="small"
                    onClick={() => setShowCustom(false)}
                    sx={{ textTransform: "none", fontSize: 12, fontWeight: 600, color: "#5A5A5A" }}
                  >
                    Back
                  </Button>
                  <Button
                    size="small"
                    variant="contained"
                    onClick={applyCustom}
                    sx={{
                      textTransform: "none",
                      fontSize: 12,
                      fontWeight: 700,
                      boxShadow: "none",
                      bgcolor: "#1A73E8",
                      "&:hover": { bgcolor: "#1660C4", boxShadow: "none" },
                    }}
                  >
                    Apply
                  </Button>
                </Box>
              </Box>,
            ]}
      </Menu>
    </>
  );
}
