import { useEffect, useState, useCallback } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControlLabel,
  Checkbox,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  CircularProgress,
  Snackbar,
  InputAdornment,
  Tooltip,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import LinkIcon from "@mui/icons-material/Link";
import { useAuth } from "../auth/useAuth";
import { Permissions } from "../auth/authTypes";
import { NoPermission } from "../components/NoPermission";
import { API_BASE_URL } from "../api/apiClientFactory";
import { getAccessToken } from "../auth/authUtils";

interface Invite {
  id: string;
  empresaId: string;
  email: string;
  roles: string[];
  permissions: string[];
  createdAt: string;
  expiresAt: string;
  redeemedAt: string | null;
  revokedAt: string | null;
}

interface InviteCreateResponse extends Invite {
  token: string;
  inviteUrl: string;
}

interface PermissionDefinition {
  key: string;
  module: string;
  action: string;
  description: string;
}

const InviteSchema = Yup.object().shape({
  email: Yup.string()
    .email("Email invalido")
    .required("Email obrigatorio"),
  expiresInDays: Yup.number()
    .min(1, "Minimo 1 dia")
    .max(30, "Maximo 30 dias")
    .required("Dias de validade obrigatorio"),
});

interface InviteFormValues {
  email: string;
  expiresInDays: number;
  sendEmail: boolean;
  roles: string[];
  permissions: string[];
}

const initialFormValues: InviteFormValues = {
  email: "",
  expiresInDays: 7,
  sendEmail: true,
  roles: [],
  permissions: [],
};

export function Invites() {
  const { hasPermission } = useAuth();

  const [invites, setInvites] = useState<Invite[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [inviteToDelete, setInviteToDelete] = useState<Invite | null>(null);
  const [createdInvite, setCreatedInvite] = useState<InviteCreateResponse | null>(null);
  const [copySnackbar, setCopySnackbar] = useState(false);

  const canView = hasPermission(Permissions.USUARIOS_CONVITES_VISUALIZAR);
  const canCreate = hasPermission(Permissions.USUARIOS_CONVITES_CRIAR);
  const canRevoke = hasPermission(Permissions.USUARIOS_CONVITES_REVOGAR);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!canView) return;

    try {
      setLoading(true);
      setError(null);

      const headers = {
        "Authorization": `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      };

      const [invitesRes, rolesRes, permsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/usuarios/convites`, { headers, signal }),
        fetch(`${API_BASE_URL}/api/usuarios/roles`, { headers, signal }),
        fetch(`${API_BASE_URL}/api/usuarios/permissoes`, { headers, signal }),
      ]);

      if (!invitesRes.ok) throw new Error("Falha ao carregar convites");
      if (!rolesRes.ok) throw new Error("Falha ao carregar roles");
      if (!permsRes.ok) throw new Error("Falha ao carregar permissoes");

      const [invitesData, rolesData, permsData] = await Promise.all([
        invitesRes.json(),
        rolesRes.json(),
        permsRes.json(),
      ]);

      setInvites(invitesData);
      setAvailableRoles(rolesData);
      setAvailablePermissions(permsData);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Erro ao carregar dados");
    } finally {
      setLoading(false);
    }
  }, [canView]);

  useEffect(() => {
    const controller = new AbortController();
    fetchData(controller.signal);
    return () => controller.abort();
  }, [fetchData]);

  const handleSubmit = async (values: InviteFormValues, { resetForm }: { resetForm: () => void }) => {
    try {
      setError(null);
      const headers = {
        "Authorization": `Bearer ${getAccessToken()}`,
        "Content-Type": "application/json",
      };

      const response = await fetch(`${API_BASE_URL}/api/usuarios/convites`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          email: values.email,
          expiresInDays: values.expiresInDays,
          sendEmail: values.sendEmail,
          roles: values.roles,
          permissions: values.permissions,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.title || "Falha ao criar convite");
      }

      const createdData: InviteCreateResponse = await response.json();
      setCreatedInvite(createdData);
      resetForm();
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao criar convite");
    }
  };

  const handleRevoke = async () => {
    if (!inviteToDelete) return;

    try {
      const response = await fetch(`${API_BASE_URL}/api/usuarios/convites/${inviteToDelete.id}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${getAccessToken()}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.detail || errorData.title || "Falha ao revogar convite");
      }

      setDeleteConfirmOpen(false);
      setInviteToDelete(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao revogar convite");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySnackbar(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getInviteStatus = (invite: Invite) => {
    if (invite.revokedAt) return { label: "Revogado", color: "error" as const };
    if (invite.redeemedAt) return { label: "Aceito", color: "success" as const };
    if (new Date(invite.expiresAt) < new Date()) return { label: "Expirado", color: "warning" as const };
    return { label: "Pendente", color: "info" as const };
  };

  // Group permissions by module
  const permissionsByModule = availablePermissions.reduce((acc, perm) => {
    if (!acc[perm.module]) {
      acc[perm.module] = [];
    }
    acc[perm.module].push(perm);
    return acc;
  }, {} as Record<string, PermissionDefinition[]>);

  const columns: GridColDef[] = [
    {
      field: "email",
      headerName: "Email",
      flex: 1,
      minWidth: 200,
    },
    {
      field: "roles",
      headerName: "Funcoes",
      flex: 1,
      minWidth: 150,
      renderCell: (params: GridRenderCellParams<Invite>) => (
        <Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
          {params.row.roles?.map((role) => (
            <Chip key={role} label={role} size="small" color="primary" />
          ))}
        </Box>
      ),
    },
    {
      field: "status",
      headerName: "Status",
      width: 120,
      renderCell: (params: GridRenderCellParams<Invite>) => {
        const status = getInviteStatus(params.row);
        return <Chip label={status.label} size="small" color={status.color} />;
      },
    },
    {
      field: "expiresAt",
      headerName: "Expira em",
      width: 160,
      renderCell: (params: GridRenderCellParams<Invite>) => (
        <Typography variant="body2">
          {formatDate(params.row.expiresAt)}
        </Typography>
      ),
    },
    {
      field: "createdAt",
      headerName: "Criado em",
      width: 160,
      renderCell: (params: GridRenderCellParams<Invite>) => (
        <Typography variant="body2">
          {formatDate(params.row.createdAt)}
        </Typography>
      ),
    },
    {
      field: "actions",
      headerName: "Acoes",
      width: 80,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<Invite>) => {
        const status = getInviteStatus(params.row);
        const canRevokeThis = canRevoke && status.label === "Pendente";

        return canRevokeThis ? (
          <Tooltip title="Revogar convite">
            <IconButton
              size="small"
              onClick={() => {
                setInviteToDelete(params.row);
                setDeleteConfirmOpen(true);
              }}
              color="error"
            >
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        ) : null;
      },
    },
  ];

  if (!canView) {
    return <NoPermission message="Voce nao tem permissao para visualizar convites." />;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Convites
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={() => {
              setCreatedInvite(null);
              setDialogOpen(true);
            }}
          >
            Novo Convite
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <DataGrid
        rows={invites}
        columns={columns}
        loading={loading}
        disableRowSelectionOnClick
        autoHeight
        getRowId={(row) => row.id}
        pageSizeOptions={[10, 25, 50]}
        initialState={{
          pagination: { paginationModel: { pageSize: 10 } },
        }}
        localeText={{
          noRowsLabel: "Nenhum convite encontrado",
        }}
      />

      {/* Invite Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          {createdInvite ? "Convite Criado" : "Novo Convite"}
        </DialogTitle>

        {createdInvite ? (
          <>
            <DialogContent>
              <Alert severity="success" sx={{ mb: 2 }}>
                Convite criado com sucesso!
              </Alert>

              <Typography variant="body2" color="text.secondary" gutterBottom>
                Compartilhe o link abaixo com o usuario:
              </Typography>

              <TextField
                fullWidth
                value={createdInvite.inviteUrl}
                InputProps={{
                  readOnly: true,
                  startAdornment: (
                    <InputAdornment position="start">
                      <LinkIcon />
                    </InputAdornment>
                  ),
                  endAdornment: (
                    <InputAdornment position="end">
                      <Tooltip title="Copiar link">
                        <IconButton onClick={() => copyToClipboard(createdInvite.inviteUrl)}>
                          <ContentCopyIcon />
                        </IconButton>
                      </Tooltip>
                    </InputAdornment>
                  ),
                }}
                sx={{ mt: 1 }}
              />

              <Box sx={{ mt: 2 }}>
                <Typography variant="body2" color="text.secondary">
                  Email: <strong>{createdInvite.email}</strong>
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Expira em: <strong>{formatDate(createdInvite.expiresAt)}</strong>
                </Typography>
              </Box>
            </DialogContent>
            <DialogActions>
              <Button onClick={() => setDialogOpen(false)} variant="contained">
                Fechar
              </Button>
            </DialogActions>
          </>
        ) : (
          <Formik
            initialValues={initialFormValues}
            validationSchema={InviteSchema}
            onSubmit={handleSubmit}
          >
            {({ values, errors, touched, handleChange, handleBlur, setFieldValue, isSubmitting }) => (
              <Form>
                <DialogContent>
                  <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                    <TextField
                      fullWidth
                      name="email"
                      label="Email"
                      type="email"
                      value={values.email}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.email && Boolean(errors.email)}
                      helperText={touched.email && errors.email}
                    />

                    <TextField
                      fullWidth
                      name="expiresInDays"
                      label="Validade (dias)"
                      type="number"
                      value={values.expiresInDays}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.expiresInDays && Boolean(errors.expiresInDays)}
                      helperText={touched.expiresInDays && errors.expiresInDays}
                      inputProps={{ min: 1, max: 30 }}
                    />

                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={values.sendEmail}
                          onChange={(e) => setFieldValue("sendEmail", e.target.checked)}
                        />
                      }
                      label="Enviar email de convite automaticamente"
                    />

                    {/* Roles */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Funcoes
                      </Typography>
                      <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                        {availableRoles.map((role) => (
                          <FormControlLabel
                            key={role}
                            control={
                              <Checkbox
                                checked={values.roles.includes(role)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFieldValue("roles", [...values.roles, role]);
                                  } else {
                                    setFieldValue("roles", values.roles.filter((r) => r !== role));
                                  }
                                }}
                              />
                            }
                            label={role}
                          />
                        ))}
                      </Box>
                    </Box>

                    {/* Permissions by module */}
                    <Box>
                      <Typography variant="subtitle2" gutterBottom>
                        Permissoes
                      </Typography>
                      {Object.entries(permissionsByModule).map(([module, perms]) => (
                        <Accordion key={module} defaultExpanded={false}>
                          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                            <Typography>{module}</Typography>
                            <Chip
                              label={`${perms.filter((p) => values.permissions.includes(p.key)).length}/${perms.length}`}
                              size="small"
                              sx={{ ml: 1 }}
                            />
                          </AccordionSummary>
                          <AccordionDetails>
                            <Box sx={{ display: "flex", flexDirection: "column" }}>
                              {perms.map((perm) => (
                                <FormControlLabel
                                  key={perm.key}
                                  control={
                                    <Checkbox
                                      checked={values.permissions.includes(perm.key)}
                                      onChange={(e) => {
                                        if (e.target.checked) {
                                          setFieldValue("permissions", [...values.permissions, perm.key]);
                                        } else {
                                          setFieldValue("permissions", values.permissions.filter((p) => p !== perm.key));
                                        }
                                      }}
                                    />
                                  }
                                  label={
                                    <Box>
                                      <Typography variant="body2">{perm.action}</Typography>
                                      <Typography variant="caption" color="text.secondary">
                                        {perm.description}
                                      </Typography>
                                    </Box>
                                  }
                                />
                              ))}
                            </Box>
                          </AccordionDetails>
                        </Accordion>
                      ))}
                    </Box>
                  </Box>
                </DialogContent>
                <DialogActions>
                  <Button onClick={() => setDialogOpen(false)}>Cancelar</Button>
                  <Button type="submit" variant="contained" disabled={isSubmitting}>
                    {isSubmitting ? <CircularProgress size={24} /> : "Criar Convite"}
                  </Button>
                </DialogActions>
              </Form>
            )}
          </Formik>
        )}
      </Dialog>

      {/* Revoke Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Revogacao</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja revogar o convite para "{inviteToDelete?.email}"?
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            O usuario nao podera mais usar este convite para criar uma conta.
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleRevoke} color="error" variant="contained">
            Revogar
          </Button>
        </DialogActions>
      </Dialog>

      {/* Copy Snackbar */}
      <Snackbar
        open={copySnackbar}
        autoHideDuration={2000}
        onClose={() => setCopySnackbar(false)}
        message="Link copiado!"
      />
    </Box>
  );
}
