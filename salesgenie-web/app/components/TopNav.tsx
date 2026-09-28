"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { motion } from "framer-motion";

import {
  AppBar,
  Toolbar,
  Box,
  Typography,
  IconButton,
  Avatar,
  Badge,
  Menu,
  MenuItem,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  CircularProgress,
  Button,
} from "@mui/material";

import {
  Search,
  Add,
  NotificationsNone,
  Settings,
  KeyboardArrowDown,
  Logout,
  Check,
} from "@mui/icons-material";
import {
  clearSession,
  getSessionUser,
  saveSession,
  updateSessionProfile,
  updateSessionWorkspace,
} from "@/app/lib/auth/session";
import { useToast } from "@/app/components/ToastProvider";
import { authApi, usersApi } from "@/app/lib/api";
import { useWorkspaces } from "@/app/lib/hooks/useWorkspaces";
import WorkspaceSettingsDialog from "@/app/components/WorkspaceSettingsDialog";
import SettingsPanel from "@/app/components/SettingsPanel";
import type { AuthUser, Workspace } from "@/app/lib/api/types";

const MotionBox = motion.create(Box);

function initialsFromEmail(email: string) {
  const name = email.split("@")[0] ?? "";
  return name.slice(0, 2).toUpperCase() || "U";
}

const navLinks = [
  {
    label: "Home",
    path: "/dashboard",
  },
  {
    label: "Leads",
    path: "/leads",
  },
  {
    label: "Customers",
    path: "/customers",
  },
  {
    label: "Agreements",
    path: "/agreements",
  },
  {
    label: "Forms",
    path: "/forms",
  },
];

export default function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { showToast } = useToast();
  const { workspaces, createWorkspace, updateWorkspace, uploadLogo } =
    useWorkspaces();

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [workspaceAnchorEl, setWorkspaceAnchorEl] =
    useState<null | HTMLElement>(null);

  const [sessionUser, setSessionUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    const stored = getSessionUser();
    // Reading localStorage requires the client, so this can only run post-mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (stored) setSessionUser(stored);

    // Login itself never returns firstName/lastName (see AuthUser's doc
    // comment) — fetch the full profile once and merge the name in so it
    // survives a refresh without re-fetching every time.
    usersApi
      .getMe()
      .then((profile) => {
        updateSessionProfile(profile.firstName, profile.lastName);
        setSessionUser((prev) =>
          prev ? { ...prev, firstName: profile.firstName, lastName: profile.lastName } : prev,
        );
      })
      .catch(() => {
        // Best-effort — the email-based fallback display is fine if this fails.
      });
  }, []);

  // The Settings panel dispatches this after a successful profile save —
  // same pattern as "workspace:updated" below, since there's no shared
  // context to notify TopNav directly.
  useEffect(() => {
    const onUserUpdated = () => {
      const stored = getSessionUser();
      if (stored) setSessionUser(stored);
    };
    window.addEventListener("user:updated", onUserUpdated);
    return () => window.removeEventListener("user:updated", onUserUpdated);
  }, []);

  const workspace = sessionUser?.workspaceName || "Workspace";

  const [switching, setSwitching] = useState(false);
  const [createOpen, setCreateOpen] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const [savingWorkspace, setSavingWorkspace] = useState(false);
  const [settingsWorkspace, setSettingsWorkspace] = useState<Workspace | null>(
    null,
  );
  const [profileSettingsOpen, setProfileSettingsOpen] = useState(false);

  const fullName = [sessionUser?.firstName, sessionUser?.lastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  const user = {
    name: fullName || sessionUser?.email || "Admin User",
    initials: fullName
      ? (fullName.match(/\b\w/g) ?? []).slice(0, 2).join("").toUpperCase()
      : sessionUser
        ? initialsFromEmail(sessionUser.email)
        : "AU",
    unread: 3,
  };

  // There's no shared auth context — every mounted component reads its own
  // copy of the session from localStorage, and every fetch hook resolves
  // its data against whichever workspace the current JWT is scoped to. A
  // full reload is the only way to make everything on screen consistent
  // with the newly switched workspace.
  const applyWorkspaceSwitch = async (workspaceId: string, name: string) => {
    setSwitching(true);
    try {
      const tokens = await authApi.switchWorkspace(workspaceId);
      saveSession(tokens);
      updateSessionWorkspace(workspaceId, name);
      window.location.reload();
    } catch (err) {
      showToast(
        (err as { message?: string }).message ?? "Failed to switch workspace",
        "error",
      );
      setSwitching(false);
    }
  };

  const handleSelectWorkspace = (workspaceId: string, name: string) => {
    setWorkspaceAnchorEl(null);
    if (workspaceId === sessionUser?.workspaceId) return;
    applyWorkspaceSwitch(workspaceId, name);
  };

  const handleOpenCreateWorkspace = () => {
    setWorkspaceAnchorEl(null);
    setNewWorkspaceName("");
    setCreateOpen(true);
  };

  const handleOpenWorkspaceSettings = (
    e: React.MouseEvent,
    ws: Workspace,
  ) => {
    e.stopPropagation();
    setWorkspaceAnchorEl(null);
    setSettingsWorkspace(ws);
  };

  // Renaming affects the display-only session copy of workspaceName — no
  // new tokens are needed (unlike switching), so no reload is required.
  // The "workspace:updated" event lets other mounted hooks (e.g. the
  // dashboard's stats, which embeds the workspace name/logo) refresh
  // themselves — there's no shared context to notify them directly.
  const handleUpdateWorkspaceName = async (id: string, name: string) => {
    const updated = await updateWorkspace(id, { name });
    if (id === sessionUser?.workspaceId) {
      updateSessionWorkspace(id, name);
      setSessionUser((prev) => (prev ? { ...prev, workspaceName: name } : prev));
      window.dispatchEvent(new Event("workspace:updated"));
    }
    return updated;
  };

  const handleUploadWorkspaceLogo = async (id: string, file: File) => {
    const updated = await uploadLogo(id, file);
    if (id === sessionUser?.workspaceId) {
      window.dispatchEvent(new Event("workspace:updated"));
    }
    return updated;
  };

  const handleCreateWorkspace = async () => {
    const trimmed = newWorkspaceName.trim();
    if (!trimmed) return;
    setSavingWorkspace(true);
    try {
      const created = await createWorkspace({ name: trimmed });
      setCreateOpen(false);
      showToast(`Workspace "${created.name}" created`, "success");
      await applyWorkspaceSwitch(created.id, created.name);
    } catch (err) {
      showToast(
        (err as { message?: string }).message ?? "Failed to create workspace",
        "error",
      );
    } finally {
      setSavingWorkspace(false);
    }
  };

  return (
    <AppBar
      elevation={0}
      color="inherit"
      position="sticky"
      sx={{
        bgcolor: "#fff",
        borderBottom: "1px solid #ECECEC",
      }}
    >
      <Toolbar
        sx={{
          height: 64,
          minHeight: "64px !important",
          px: 4,
          display: "flex",
          justifyContent: "space-between",
        }}
      >
        {/* LEFT */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
          }}
        >
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 2.5,
            }}
          >
            <motion.div whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}>
              <Typography
                sx={{
                  fontSize: 30,
                  fontWeight: 900,
                  letterSpacing: "-0.05em",
                  color: "#111",
                }}
              >
                Eziyo
              </Typography>
            </motion.div>

            <motion.div whileHover={{ y: -1 }} whileTap={{ scale: 0.97 }}>
              <Box
                onClick={(e) =>
                  !switching && setWorkspaceAnchorEl(e.currentTarget)
                }
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  height: 36,
                  px: 1.5,
                  borderRadius: 2,
                  border: "1px solid #E6EAF0",
                  bgcolor: "#fff",
                  cursor: switching ? "default" : "pointer",
                  opacity: switching ? 0.6 : 1,
                  transition: ".2s",
                  "&:hover": switching
                    ? {}
                    : {
                        bgcolor: "#F8FAFC",
                        borderColor: "#CBD5E1",
                      },
                }}
              >
                {switching ? (
                  <CircularProgress size={11} sx={{ flexShrink: 0 }} />
                ) : (
                  <Box
                    sx={{
                      width: 7,
                      height: 7,
                      bgcolor: "#22C55E",
                      borderRadius: "50%",
                      flexShrink: 0,
                    }}
                  />
                )}

                <Typography
                  sx={{
                    fontSize: 13,
                    fontWeight: 700,
                    lineHeight: 1,
                  }}
                >
                  {workspace}
                </Typography>

                <KeyboardArrowDown
                  sx={{
                    fontSize: 18,
                    color: "#6B7280",
                  }}
                />
              </Box>
              <Menu
                anchorEl={workspaceAnchorEl}
                open={Boolean(workspaceAnchorEl)}
                onClose={() => setWorkspaceAnchorEl(null)}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "left",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "left",
                }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 0.75,
                      minWidth: 230,
                      borderRadius: 3,
                      p: 1,
                      boxShadow: "0 12px 30px rgba(0,0,0,.08)",
                    },
                  },
                }}
              >
                <Typography
                  sx={{
                    px: 2,
                    py: 1,
                    fontSize: 11,
                    fontWeight: 700,
                    color: "#6B7280",
                    textTransform: "uppercase",
                  }}
                >
                  Workspaces
                </Typography>

                {workspaces.map((ws) => {
                  const isActive = ws.id === sessionUser?.workspaceId;
                  return (
                    <MenuItem
                      key={ws.id}
                      onClick={() => handleSelectWorkspace(ws.id, ws.name)}
                      sx={{
                        fontWeight: isActive ? 700 : 400,
                        color: isActive ? "#111" : undefined,
                      }}
                    >
                      <Box
                        sx={{
                          width: 8,
                          height: 8,
                          borderRadius: "50%",
                          bgcolor: isActive ? "#22C55E" : "#CBD5E1",
                          mr: 1.5,
                          flexShrink: 0,
                        }}
                      />
                      <Box sx={{ flex: 1, minWidth: 0 }}>{ws.name}</Box>
                      {isActive && (
                        <Check sx={{ fontSize: 16, color: "#22C55E", mr: 0.5 }} />
                      )}
                      <IconButton
                        size="small"
                        onClick={(e) => handleOpenWorkspaceSettings(e, ws)}
                        sx={{ ml: 0.5 }}
                      >
                        <Settings sx={{ fontSize: 15, color: "#9CA3AF" }} />
                      </IconButton>
                    </MenuItem>
                  );
                })}

                <Divider sx={{ my: 1 }} />

                <MenuItem
                  onClick={handleOpenCreateWorkspace}
                  sx={{
                    fontWeight: 200,
                    color: "#2563EB",
                  }}
                >
                  + New Workspace
                </MenuItem>
              </Menu>

              <Dialog
                open={createOpen}
                onClose={() => !savingWorkspace && setCreateOpen(false)}
                maxWidth="xs"
                fullWidth
                slotProps={{ paper: { sx: { borderRadius: "12px" } } }}
              >
                <DialogTitle sx={{ fontSize: 16, fontWeight: 800 }}>
                  Create new workspace
                </DialogTitle>
                <DialogContent>
                  <TextField
                    autoFocus
                    fullWidth
                    placeholder="Workspace name"
                    value={newWorkspaceName}
                    onChange={(e) => setNewWorkspaceName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleCreateWorkspace();
                    }}
                    size="small"
                    sx={{ mt: 0.5 }}
                  />
                </DialogContent>
                <DialogActions sx={{ px: 3, pb: 2.5 }}>
                  <Button
                    onClick={() => setCreateOpen(false)}
                    disabled={savingWorkspace}
                    sx={{ textTransform: "none", fontWeight: 600, color: "#5A5A5A" }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleCreateWorkspace}
                    disabled={!newWorkspaceName.trim() || savingWorkspace}
                    variant="contained"
                    sx={{
                      textTransform: "none",
                      fontWeight: 700,
                      boxShadow: "none",
                      bgcolor: "#2563EB",
                      "&:hover": { bgcolor: "#1D4ED8", boxShadow: "none" },
                    }}
                  >
                    {savingWorkspace ? (
                      <CircularProgress size={16} sx={{ color: "#fff" }} />
                    ) : (
                      "Create"
                    )}
                  </Button>
                </DialogActions>
              </Dialog>

              {settingsWorkspace && (
                <WorkspaceSettingsDialog
                  workspace={settingsWorkspace}
                  onClose={() => setSettingsWorkspace(null)}
                  onUpdateName={handleUpdateWorkspaceName}
                  onUploadLogo={handleUploadWorkspaceLogo}
                />
              )}
            </motion.div>
          </Box>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              ml: 0.5,
              gap: 0.5,
            }}
          >
            {navLinks.map((item) => {
              const active =
                pathname === item.path ||
                (item.path !== "/" && pathname.startsWith(item.path));

              return (
                <Link
                  key={item.label}
                  href={item.path}
                  style={{
                    textDecoration: "none",
                  }}
                >
                  <MotionBox
                    whileHover={{
                      y: -1,
                    }}
                    whileTap={{
                      scale: 0.96,
                    }}
                    sx={{
                      position: "relative",
                      px: 2,
                      py: 1,
                      borderRadius: 3,
                      color: active ? "#2563EB" : "#666",
                      fontWeight: active ? 700 : 500,
                      overflow: "hidden",
                    }}
                  >
                    {active && (
                      <motion.div
                        layoutId="activeNav"
                        transition={{
                          type: "spring",
                          stiffness: 450,
                          damping: 35,
                        }}
                        style={{
                          position: "absolute",
                          inset: 0,
                          background: "#EEF4FF",
                          borderRadius: 12,
                          zIndex: -1,
                        }}
                      />
                    )}

                    {item.label}
                  </MotionBox>
                </Link>
              );
            })}
          </Box>
        </Box>

        {/* RIGHT */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1,
          }}
        >
          {[<Search key="search" />, <Add key="add" />].map((icon, index) => (
            <motion.div
              key={index}
              whileHover={{
                scale: 1.12,
                rotate: 8,
              }}
              whileTap={{
                scale: 0.9,
              }}
            >
              <IconButton
                sx={{
                  borderRadius: 3,
                }}
              >
                {icon}
              </IconButton>
            </motion.div>
          ))}

          <motion.div
            whileHover={{
              scale: 1.12,
            }}
          >
            <IconButton>
              <Badge badgeContent={user.unread} color="error">
                <NotificationsNone />
              </Badge>
            </IconButton>
          </motion.div>

          <Divider
            orientation="vertical"
            flexItem
            sx={{
              mx: 1,
            }}
          />

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 1.2,
              cursor: "pointer",
              px: 1,
              py: 0.5,
              borderRadius: 3,
              transition: ".2s",
              "&:hover": {
                bgcolor: "#F5F7FA",
              },
            }}
            onClick={(e) => setAnchorEl(e.currentTarget)}
          >
            <Box>
              <Typography
                sx={{
                  fontSize: 13,
                  fontWeight: 700,
                  lineHeight: 1,
                }}
              >
                {user.name}
              </Typography>

              <Typography
                sx={{
                  fontSize: 11,
                  color: "#888",
                }}
              >
                Last login • 4d ago
              </Typography>
            </Box>

            <motion.div
              whileHover={{
                scale: 1.08,
              }}
            >
              <Avatar
                sx={{
                  bgcolor: "#111",
                  width: 36,
                  height: 36,
                  fontSize: 13,
                }}
              >
                {user.initials}
              </Avatar>
            </motion.div>
          </Box>

          <Menu
            open={Boolean(anchorEl)}
            anchorEl={anchorEl}
            onClose={() => setAnchorEl(null)}
            slotProps={{
              paper: {
                sx: {
                  borderRadius: 3,
                  minWidth: 210,
                  mt: 1,
                },
              },
            }}
          >
            <Box
              sx={{
                px: 2,
                py: 1.5,
              }}
            >
              <Typography sx={{ fontWeight: 700 }}>{user.name}</Typography>

              <Typography sx={{ fontSize: 12 }} color="text.secondary">
                {sessionUser?.email ?? "admin@eziyo.com"}
              </Typography>
            </Box>

            <Divider />

            <MenuItem
              onClick={() => {
                setAnchorEl(null);
                setProfileSettingsOpen(true);
              }}
            >
              <Settings
                sx={{
                  mr: 1,
                  fontSize: 18,
                }}
              />
              Settings
            </MenuItem>

            <MenuItem
              onClick={async () => {
                // Awaited so the request goes out (with a valid token)
                // before clearSession removes it — clearing first raced the
                // token out of localStorage before axios's request
                // interceptor (a microtask) could attach it, so the call
                // always 401'd. Best-effort otherwise: sign out is
                // stateless server-side, and local logout must still
                // succeed even if this call fails.
                try {
                  await authApi.signout();
                } catch {
                  // Ignored — see above.
                }
                clearSession();
                showToast("Logged out", "success");
                router.push("/login");
              }}
              sx={{
                color: "#D32F2F",
              }}
            >
              <Logout
                sx={{
                  mr: 1,
                  fontSize: 18,
                }}
              />
              Logout
            </MenuItem>
          </Menu>

          <SettingsPanel
            open={profileSettingsOpen}
            onClose={() => setProfileSettingsOpen(false)}
          />
        </Box>
      </Toolbar>
    </AppBar>
  );
}
