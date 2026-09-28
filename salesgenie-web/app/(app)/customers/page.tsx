"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  TextField,
  InputAdornment,
} from "@mui/material";
import { motion } from "framer-motion";
import SearchIcon from "@mui/icons-material/Search";

import CustomersTable from "./components/CustomersTable";
import { useCustomersList } from "@/app/lib/hooks/useCustomersList";
import type { Customer } from "@/app/lib/api";
import { useToast } from "@/app/components/ToastProvider";
import type { CustomerRecord } from "./type";

const PAGE_SIZE_OPTIONS = [50, 100, 200];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const AVATAR_PALETTE = [
  "#8AB4F8",
  "#57BB8A",
  "#B79CED",
  "#F0A860",
  "#E88A9A",
  "#5FB8B0",
  "#E0A9E8",
];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function toCustomerRecord(customer: Customer): CustomerRecord {
  const since = customer.convertedAt || customer.createdAt;
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email || "",
    phone: customer.phone || "",
    suburb: customer.suburb || null,
    state: customer.state || null,
    postcode: customer.postcode || null,
    avatarColor: colorForId(customer.id),
    customerSince: since
      ? new Date(since).toLocaleDateString(undefined, {
          year: "numeric",
          month: "short",
        })
      : "-",
  };
}

export default function CustomersPage() {
  const { showToast } = useToast();

  // `search` updates on every keystroke so the box feels responsive;
  // `debouncedSearch` is what actually drives fetching + pagination reset.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch]);

  const {
    customers,
    hasMore,
    loading: customersLoading,
    error: customersError,
  } = useCustomersList({ search: debouncedSearch, page, pageSize });

  useEffect(() => {
    if (customersError) showToast(customersError, "error");
  }, [customersError, showToast]);

  const records: CustomerRecord[] = useMemo(
    () => customers.map(toCustomerRecord),
    [customers],
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ maxWidth: 1440, mx: "auto" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 2.5,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A" }}>
              Customers
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "#8A8A8A" }}>
              Eziyo / Customer Management
            </Typography>
          </Box>

          <TextField
            size="small"
            placeholder="Search customers..."
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
              width: 220,
              "& .MuiOutlinedInput-root": {
                borderRadius: "8px",
                fontSize: 12.5,
              },
            }}
          />
        </Box>

        {customersLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <CustomersTable
            customers={records}
            hasMore={hasMore}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
          />
        )}
      </Box>
    </motion.div>
  );
}
