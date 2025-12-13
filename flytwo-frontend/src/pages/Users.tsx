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
  Paper,
  Tooltip,
  Stack,
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridRenderCellParams } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import PersonIcon from "@mui/icons-material/Person";
import { useAuth } from "../auth/useAuth";
import { Permissions } from "../auth/authTypes";
import { NoPermission } from "../components/NoPermission";
import { getApiClient } from "../api/apiClientFactory";
import type { UsuarioResponse, PermissionDefinition } from "../api/api-client";

const CreateUserSchema = Yup.object().shape({
  email: Yup.string()
    .email("Email invalido")
    .required("Email obrigatorio"),
  fullName: Yup.string()
    .max(100, "Nome deve ter no maximo 100 caracteres"),
  password: Yup.string()
    .min(6, "Senha deve ter no minimo 6 caracteres")
    .required("Senha obrigatoria"),
});

const EditUserSchema = Yup.object().shape({
  email: Yup.string()
    .email("Email invalido")
    .required("Email obrigatorio"),
  fullName: Yup.string()
    .max(100, "Nome deve ter no maximo 100 caracteres"),
});

interface UserFormValues {
  email: string;
  fullName: string;
  password: string;
  roles: string[];
  permissions: string[];
}

const initialFormValues: UserFormValues = {
  email: "",
  fullName: "",
  password: "",
  roles: [],
  permissions: [],
};

export function Users() {
  const { hasPermission } = useAuth();

  const [users, setUsers] = useState<UsuarioResponse[]>([]);
  const [availableRoles, setAvailableRoles] = useState<string[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<PermissionDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UsuarioResponse | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UsuarioResponse | null>(null);
  const [formValues, setFormValues] = useState<UserFormValues>(initialFormValues);

  const canView = hasPermission(Permissions.USUARIOS_VISUALIZAR);
  const canCreate = hasPermission(Permissions.USUARIOS_CRIAR);
  const canEdit = hasPermission(Permissions.USUARIOS_EDITAR);
  const canDelete = hasPermission(Permissions.USUARIOS_EXCLUIR);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    if (!canView) return;

    try {
      setLoading(true);
      setError(null);

      const client = getApiClient();
      const [usersData, rolesData, permsData] = await Promise.all([
        client.usuariosAll(signal),
        client.roles(signal),
        client.permissoes(signal),
      ]);

      setUsers(usersData);
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

  const handleSubmit = async (values: UserFormValues, { resetForm }: { resetForm: () => void }) => {
    try {
      setError(null);
      const client = getApiClient();

      if (editingUser) {
        await client.usuariosPUT(editingUser.id!, {
          email: values.email,
          fullName: values.fullName || undefined,
          roles: values.roles,
          permissions: values.permissions,
        });
      } else {
        await client.usuariosPOST({
          email: values.email,
          password: values.password,
          fullName: values.fullName || undefined,
          roles: values.roles,
          permissions: values.permissions,
        });
      }

      resetForm();
      setDialogOpen(false);
      setEditingUser(null);
      setFormValues(initialFormValues);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao salvar usuario");
    }
  };

  const handleDelete = async () => {
    if (!userToDelete) return;

    try {
      const client = getApiClient();
      await client.usuariosDELETE(userToDelete.id!);
      setDeleteConfirmOpen(false);
      setUserToDelete(null);
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro ao excluir usuario");
    }
  };

  const startEditing = (user: UsuarioResponse) => {
    setEditingUser(user);
    setFormValues({
      email: user.email || "",
      fullName: user.fullName || "",
      password: "",
      roles: user.roles || [],
      permissions: user.permissions || [],
    });
    setDialogOpen(true);
  };

  const openNewUserDialog = () => {
    setEditingUser(null);
    setFormValues(initialFormValues);
    setDialogOpen(true);
  };

  // Group permissions by module
  const permissionsByModule = availablePermissions.reduce((acc, perm) => {
    const module = perm.module || "Outros";
    if (!acc[module]) {
      acc[module] = [];
    }
    acc[module].push(perm);
    return acc;
  }, {} as Record<string, PermissionDefinition[]>);

  const columns: GridColDef[] = [
    {
      field: "fullName",
      headerName: "Usuario",
      flex: 1.5,
      minWidth: 250,
      renderCell: (params: GridRenderCellParams<UsuarioResponse>) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 1.5,
            width: "100%",
            height: "100%",
            py: 1,
          }}
        >
          <Box
            sx={{
              width: 40,
              height: 40,
              borderRadius: "50%",
              bgcolor: "primary.main",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <PersonIcon sx={{ color: "primary.contrastText", fontSize: 20 }} />
          </Box>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {params.row.fullName || "-"}
            </Typography>
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                display: "block",
              }}
            >
              {params.row.email}
            </Typography>
          </Box>
        </Box>
      ),
    },
    {
      field: "roles",
      headerName: "Funcoes",
      flex: 1,
      minWidth: 180,
      renderCell: (params: GridRenderCellParams<UsuarioResponse>) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            height: "100%",
            width: "100%",
            py: 1,
          }}
        >
          <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
            {params.row.roles && params.row.roles.length > 0 ? (
              params.row.roles.map((role) => (
                <Chip
                  key={role}
                  label={role}
                  size="small"
                  color={role === "Admin" ? "error" : "primary"}
                  variant={role === "Admin" ? "filled" : "outlined"}
                  sx={{ fontWeight: 500 }}
                />
              ))
            ) : (
              <Typography variant="body2" color="text.secondary">
                -
              </Typography>
            )}
          </Stack>
        </Box>
      ),
    },
    {
      field: "permissionsCount",
      headerName: "Permissoes",
      width: 120,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams<UsuarioResponse>) => {
        const count = params.row.permissions?.length || 0;
        return (
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              height: "100%",
              width: "100%",
            }}
          >
            <Chip
              label={count}
              size="small"
              color={count > 0 ? "success" : "default"}
              variant="outlined"
              sx={{ minWidth: 40 }}
            />
          </Box>
        );
      },
    },
    {
      field: "actions",
      headerName: "Acoes",
      width: 100,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      disableColumnMenu: true,
      renderCell: (params: GridRenderCellParams<UsuarioResponse>) => (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 0.5,
            height: "100%",
            width: "100%",
          }}
        >
          {canEdit && (
            <Tooltip title="Editar usuario">
              <IconButton
                size="small"
                onClick={() => startEditing(params.row)}
                color="primary"
                sx={{
                  "&:hover": {
                    bgcolor: "primary.light",
                    color: "primary.contrastText",
                  },
                }}
              >
                <EditIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          {canDelete && (
            <Tooltip title="Excluir usuario">
              <IconButton
                size="small"
                onClick={() => {
                  setUserToDelete(params.row);
                  setDeleteConfirmOpen(true);
                }}
                color="error"
                sx={{
                  "&:hover": {
                    bgcolor: "error.light",
                    color: "error.contrastText",
                  },
                }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      ),
    },
  ];

  if (!canView) {
    return <NoPermission message="Voce nao tem permissao para visualizar usuarios." />;
  }

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Usuarios
        </Typography>
        {canCreate && (
          <Button
            variant="contained"
            color="primary"
            startIcon={<AddIcon />}
            onClick={openNewUserDialog}
          >
            Novo Usuario
          </Button>
        )}
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Paper
        elevation={0}
        sx={{
          border: 1,
          borderColor: "divider",
          borderRadius: 2,
          overflow: "hidden",
        }}
      >
        <DataGrid
          rows={users}
          columns={columns}
          loading={loading}
          disableRowSelectionOnClick
          autoHeight
          getRowId={(row) => row.id!}
          rowHeight={72}
          pageSizeOptions={[10, 25, 50]}
          initialState={{
            pagination: { paginationModel: { pageSize: 10 } },
          }}
          localeText={{
            noRowsLabel: "Nenhum usuario encontrado",
          }}
          sx={{
            border: 0,
            "& .MuiDataGrid-columnHeaders": {
              bgcolor: "action.hover",
              borderBottom: 1,
              borderColor: "divider",
            },
            "& .MuiDataGrid-columnHeaderTitle": {
              fontWeight: 600,
              fontSize: "0.875rem",
            },
            "& .MuiDataGrid-cell": {
              borderColor: "divider",
              display: "flex",
              alignItems: "center",
            },
            "& .MuiDataGrid-row:hover": {
              bgcolor: "action.hover",
            },
            "& .MuiDataGrid-footerContainer": {
              borderTop: 1,
              borderColor: "divider",
            },
          }}
        />
      </Paper>

      {/* User Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>{editingUser ? "Editar Usuario" : "Novo Usuario"}</DialogTitle>
        <Formik
          initialValues={formValues}
          validationSchema={editingUser ? EditUserSchema : CreateUserSchema}
          onSubmit={handleSubmit}
          enableReinitialize
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
                    name="fullName"
                    label="Nome completo"
                    value={values.fullName}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.fullName && Boolean(errors.fullName)}
                    helperText={touched.fullName && errors.fullName}
                  />
                  {!editingUser && (
                    <TextField
                      fullWidth
                      name="password"
                      label="Senha"
                      type="password"
                      value={values.password}
                      onChange={handleChange}
                      onBlur={handleBlur}
                      error={touched.password && Boolean(errors.password)}
                      helperText={touched.password && errors.password}
                    />
                  )}

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
                            label={`${perms.filter((p) => values.permissions.includes(p.key || "")).length}/${perms.length}`}
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
                                    checked={values.permissions.includes(perm.key || "")}
                                    onChange={(e) => {
                                      if (e.target.checked) {
                                        setFieldValue("permissions", [...values.permissions, perm.key || ""]);
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
                  {isSubmitting ? <CircularProgress size={24} /> : editingUser ? "Atualizar" : "Criar"}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirmar Exclusao</DialogTitle>
        <DialogContent>
          <Typography>
            Tem certeza que deseja excluir o usuario "{userToDelete?.email}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancelar</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Excluir
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
