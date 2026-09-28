"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Checkbox,
  Avatar,
  IconButton,
  Menu,
  MenuItem,
  Select,
} from "@mui/material";
import { motion, type Variants } from "framer-motion";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import MailOutlineIcon from "@mui/icons-material/MailOutlineOutlined";
import HistoryEduOutlinedIcon from "@mui/icons-material/HistoryEduOutlined";
import KeyboardArrowLeftIcon from "@mui/icons-material/KeyboardArrowLeft";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";

import SendEmailDialog from "./SendEmailDialog";
import SendAgreementDialog from "./SendAgreementDialog";
import type { CustomerRecord } from "../type";

const MotionIconButton = motion.create(IconButton);

interface CustomersTableProps {
  customers: CustomerRecord[];
  hasMore: boolean;
  page: number;
  pageSize: number;
  pageSizeOptions: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
}

const MotionBox = motion.create(Box);

const rowVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const columns = ["", "NAME", "EMAIL", "PHONE", "SUBURB", "STATE", "POSTCODE", "CUSTOMER SINCE", ""];

const gridTemplateColumns = "40px 1.6fr 1.6fr 1fr 1fr 1fr 1fr 1fr 48px";

export default function CustomersTable({
  customers,
  hasMore,
  page,
  pageSize,
  pageSizeOptions,
  onPageChange,
  onPageSizeChange,
}: CustomersTableProps) {
  const router = useRouter();
  const [menuAnchor, setMenuAnchor] = useState<{
    el: HTMLElement;
    customerId: string;
  } | null>(null);
  const [emailTarget, setEmailTarget] = useState<CustomerRecord | null>(null);
  const [agreementTarget, setAgreementTarget] = useState<CustomerRecord | null>(
    null,
  );

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
        {customers.length === 0 && (
          <Typography sx={{ fontSize: 12.5, color: "#B0B0B0", py: 3, textAlign: "center" }}>
            No customers yet.
          </Typography>
        )}
        {customers.map((customer) => (
          <MotionBox
            key={customer.id}
            variants={rowVariants}
            onClick={() => router.push(`/customers/${customer.id}`)}
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
            <Checkbox size="small" sx={{ p: 0 }} onClick={(e) => e.stopPropagation()} />

            <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, minWidth: 0 }}>
              <Avatar
                sx={{
                  width: 30,
                  height: 30,
                  fontSize: 11.5,
                  fontWeight: 700,
                  bgcolor: customer.avatarColor,
                  color: "#1A1A1A",
                  flexShrink: 0,
                }}
              >
                {customer.firstName[0]}
                {customer.lastName[0]}
              </Avatar>
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
                {customer.firstName} {customer.lastName}
              </Typography>
            </Box>

            <Typography
              sx={{
                fontSize: 12.5,
                color: "#1A1A1A",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {customer.email || "-"}
            </Typography>

            <Typography sx={{ fontSize: 12.5, color: "#1A1A1A" }}>
              {customer.phone || "-"}
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
              {customer.suburb || "-"}
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
              {customer.state || "-"}
            </Typography>

            <Typography sx={{ fontSize: 12.5, color: "#1A1A1A" }}>
              {customer.postcode || "-"}
            </Typography>

            <Typography sx={{ fontSize: 12.5, color: "#1A1A1A" }}>
              {customer.customerSince}
            </Typography>

            <IconButton
              size="small"
              onClick={(e) => {
                e.stopPropagation();
                setMenuAnchor({ el: e.currentTarget, customerId: customer.id });
              }}
            >
              <MoreVertIcon sx={{ fontSize: 18, color: "#5A5A5A" }} />
            </IconButton>
          </MotionBox>
        ))}
      </MotionBox>

      {/* Row actions menu */}
      <Menu anchorEl={menuAnchor?.el} open={Boolean(menuAnchor)} onClose={closeMenu}>
        <MenuItem
          onClick={() => {
            const customer = customers.find((c) => c.id === menuAnchor?.customerId);
            if (customer) setEmailTarget(customer);
            closeMenu();
          }}
          sx={{ fontSize: 12.5, gap: 1 }}
        >
          <MailOutlineIcon sx={{ fontSize: 17, color: "#5A5A5A" }} />
          Email
        </MenuItem>
        <MenuItem
          onClick={() => {
            const customer = customers.find((c) => c.id === menuAnchor?.customerId);
            if (customer) setAgreementTarget(customer);
            closeMenu();
          }}
          sx={{ fontSize: 12.5, gap: 1 }}
        >
          <HistoryEduOutlinedIcon sx={{ fontSize: 17, color: "#5A5A5A" }} />
          Agreement
        </MenuItem>
      </Menu>

      {emailTarget && (
        <SendEmailDialog
          customerName={`${emailTarget.firstName} ${emailTarget.lastName}`}
          customerEmail={emailTarget.email}
          onClose={() => setEmailTarget(null)}
        />
      )}

      {agreementTarget && (
        <SendAgreementDialog
          customerName={`${agreementTarget.firstName} ${agreementTarget.lastName}`}
          customerEmail={agreementTarget.email}
          onClose={() => setAgreementTarget(null)}
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
            {customers.length === 0
              ? "0"
              : `${(page - 1) * pageSize + 1}-${(page - 1) * pageSize + customers.length}${
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
