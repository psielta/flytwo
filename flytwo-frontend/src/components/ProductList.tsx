import { useEffect, useState, useCallback } from "react";
import { Formik, Form } from "formik";
import * as Yup from "yup";
import {
  Box,
  Typography,
  Button,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormHelperText,
  InputAdornment
} from "@mui/material";
import { DataGrid } from "@mui/x-data-grid";
import type { GridColDef, GridPaginationModel, GridRenderCellParams } from "@mui/x-data-grid";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { getApiClient } from "../api/apiClientFactory";
import type { ProductDto, CreateProductRequest, UpdateProductRequest } from "../api/api-client";

const CATEGORIES = ["Electronics", "Clothing", "Books", "Home", "Sports", "Toys", "Food", "Beauty"];

const ProductSchema = Yup.object().shape({
  name: Yup.string()
    .min(2, "Name must be at least 2 characters")
    .max(200, "Name must be at most 200 characters")
    .required("Name is required"),
  sku: Yup.string()
    .min(3, "SKU must be at least 3 characters")
    .max(50, "SKU must be at most 50 characters")
    .required("SKU is required"),
  category: Yup.string()
    .oneOf(CATEGORIES, "Invalid category")
    .required("Category is required"),
  price: Yup.number()
    .min(0.01, "Price must be at least 0.01")
    .max(999999.99, "Price must be at most 999,999.99")
    .required("Price is required"),
  stockQuantity: Yup.number()
    .min(0, "Stock cannot be negative")
    .integer("Stock must be a whole number")
    .required("Stock quantity is required"),
  description: Yup.string()
    .max(2000, "Description must be at most 2000 characters")
    .nullable(),
});

interface ProductFormValues {
  name: string;
  description: string;
  category: string;
  price: number;
  stockQuantity: number;
  sku: string;
}

const initialFormValues: ProductFormValues = {
  name: "",
  description: "",
  category: "Electronics",
  price: 0,
  stockQuantity: 0,
  sku: "",
};

export function ProductList() {
  const [products, setProducts] = useState<ProductDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editFormValues, setEditFormValues] = useState<ProductFormValues>(initialFormValues);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [productToDelete, setProductToDelete] = useState<ProductDto | null>(null);

  // Pagination state
  const [paginationModel, setPaginationModel] = useState<GridPaginationModel>({
    page: 0,
    pageSize: 25,
  });
  const [totalRows, setTotalRows] = useState(0);

  const fetchProducts = useCallback(async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);

      const client = getApiClient();
      const pageNumber = paginationModel.page + 1; // DataGrid uses 0-indexed
      const pageSize = paginationModel.pageSize;

      const data = selectedCategory
        ? await client.paged2(selectedCategory, pageNumber, pageSize, signal)
        : await client.paged(pageNumber, pageSize, signal);

      setProducts(data.items || []);
      setTotalRows(data.totalCount || 0);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  }, [paginationModel, selectedCategory]);

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [fetchProducts]);

  // Reset to first page when category changes
  useEffect(() => {
    setPaginationModel(prev => ({ ...prev, page: 0 }));
  }, [selectedCategory]);

  const handleSubmit = async (values: ProductFormValues, { resetForm }: { resetForm: () => void }) => {
    try {
      const client = getApiClient();
      if (editingId) {
        const request: UpdateProductRequest = {
          name: values.name,
          description: values.description || undefined,
          category: values.category,
          price: values.price,
          stockQuantity: values.stockQuantity,
          isActive: true,
        };
        await client.productPUT(editingId, request);
      } else {
        const request: CreateProductRequest = {
          name: values.name,
          description: values.description || undefined,
          category: values.category,
          price: values.price,
          stockQuantity: values.stockQuantity,
          sku: values.sku,
        };
        await client.productPOST(request);
      }
      resetForm();
      setDialogOpen(false);
      setEditingId(null);
      setEditFormValues(initialFormValues);
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    }
  };

  const handleDelete = async () => {
    if (!productToDelete) return;
    try {
      const client = getApiClient();
      await client.productDELETE(productToDelete.id!);
      setDeleteConfirmOpen(false);
      setProductToDelete(null);
      fetchProducts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete product");
    }
  };

  const startEditing = (product: ProductDto) => {
    setEditingId(product.id!);
    setEditFormValues({
      name: product.name || "",
      description: product.description || "",
      category: product.category || "Electronics",
      price: product.price || 0,
      stockQuantity: product.stockQuantity || 0,
      sku: product.sku || "",
    });
    setDialogOpen(true);
  };

  const openNewProductDialog = () => {
    setEditingId(null);
    setEditFormValues(initialFormValues);
    setDialogOpen(true);
  };

  const formatPrice = (price?: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(price || 0);
  };

  const columns: GridColDef[] = [
    {
      field: "name",
      headerName: "Name",
      flex: 2,
      minWidth: 200,
      renderCell: (params: GridRenderCellParams<ProductDto>) => (
        <Box>
          <Typography variant="body2" fontWeight="medium">
            {params.row.name}
          </Typography>
          {params.row.description && (
            <Typography variant="caption" color="text.secondary" sx={{ display: "block" }}>
              {params.row.description.length > 50
                ? `${params.row.description.substring(0, 50)}...`
                : params.row.description}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      field: "category",
      headerName: "Category",
      width: 130,
      renderCell: (params: GridRenderCellParams<ProductDto>) => (
        <Chip label={params.row.category} size="small" color="primary" variant="outlined" />
      ),
    },
    {
      field: "price",
      headerName: "Price",
      width: 120,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<ProductDto>) => (
        <Typography fontWeight="bold">{formatPrice(params.row.price)}</Typography>
      ),
    },
    {
      field: "stockQuantity",
      headerName: "Stock",
      width: 100,
      align: "right",
      headerAlign: "right",
      renderCell: (params: GridRenderCellParams<ProductDto>) => (
        <Typography color={(params.row.stockQuantity || 0) < 10 ? "error" : "inherit"}>
          {params.row.stockQuantity}
        </Typography>
      ),
    },
    {
      field: "sku",
      headerName: "SKU",
      width: 130,
      renderCell: (params: GridRenderCellParams<ProductDto>) => (
        <Typography variant="body2" fontFamily="monospace">
          {params.row.sku}
        </Typography>
      ),
    },
    {
      field: "isActive",
      headerName: "Active",
      width: 100,
      align: "center",
      headerAlign: "center",
      renderCell: (params: GridRenderCellParams<ProductDto>) => (
        <Chip
          label={params.row.isActive ? "Yes" : "No"}
          size="small"
          color={params.row.isActive ? "success" : "error"}
        />
      ),
    },
    {
      field: "actions",
      headerName: "Actions",
      width: 120,
      align: "center",
      headerAlign: "center",
      sortable: false,
      filterable: false,
      renderCell: (params: GridRenderCellParams<ProductDto>) => (
        <>
          <IconButton size="small" onClick={() => startEditing(params.row)} color="primary">
            <EditIcon />
          </IconButton>
          <IconButton
            size="small"
            onClick={() => {
              setProductToDelete(params.row);
              setDeleteConfirmOpen(true);
            }}
            color="error"
          >
            <DeleteIcon />
          </IconButton>
        </>
      ),
    },
  ];

  return (
    <Box>
      <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 3 }}>
        <Typography variant="h4" component="h1">
          Products
        </Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={openNewProductDialog}
        >
          Add Product
        </Button>
      </Box>

      {error && (
        <Alert severity="error" onClose={() => setError(null)} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 2, mb: 3, alignItems: "center" }}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Category</InputLabel>
          <Select
            value={selectedCategory}
            label="Category"
            onChange={(e) => setSelectedCategory(e.target.value)}
          >
            <MenuItem value="">All Categories</MenuItem>
            {CATEGORIES.map((cat) => (
              <MenuItem key={cat} value={cat}>
                {cat}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Typography variant="body2" color="text.secondary">
          {loading ? "Loading..." : `${totalRows} products total`}
        </Typography>
      </Box>

      <DataGrid
        rows={products}
        columns={columns}
        paginationMode="server"
        rowCount={totalRows}
        paginationModel={paginationModel}
        onPaginationModelChange={setPaginationModel}
        pageSizeOptions={[10, 25, 50, 100]}
        loading={loading}
        disableRowSelectionOnClick
        autoHeight
        getRowId={(row) => row.id!}
        getRowHeight={() => "auto"}
        sx={{
          "& .MuiDataGrid-cell": {
            py: 1,
          },
        }}
        slotProps={{
          loadingOverlay: {
            variant: "skeleton",
            noRowsVariant: "skeleton",
          },
        }}
        localeText={{
          noRowsLabel: selectedCategory
            ? "No products found. Try selecting a different category or add one above!"
            : "No products found. Add one above!",
        }}
      />

      {/* Product Form Dialog */}
      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? "Edit Product" : "New Product"}</DialogTitle>
        <Formik
          initialValues={editingId ? editFormValues : initialFormValues}
          validationSchema={ProductSchema}
          onSubmit={handleSubmit}
          enableReinitialize
        >
          {({ values, errors, touched, handleChange, handleBlur, isSubmitting }) => (
            <Form>
              <DialogContent>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
                  <TextField
                    fullWidth
                    name="name"
                    label="Name"
                    value={values.name}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.name && Boolean(errors.name)}
                    helperText={touched.name && errors.name}
                  />
                  <TextField
                    fullWidth
                    name="sku"
                    label="SKU"
                    value={values.sku}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.sku && Boolean(errors.sku)}
                    helperText={touched.sku && errors.sku}
                    disabled={!!editingId}
                  />
                  <FormControl fullWidth error={touched.category && Boolean(errors.category)}>
                    <InputLabel>Category</InputLabel>
                    <Select
                      name="category"
                      value={values.category}
                      label="Category"
                      onChange={handleChange}
                      onBlur={handleBlur}
                    >
                      {CATEGORIES.map((cat) => (
                        <MenuItem key={cat} value={cat}>
                          {cat}
                        </MenuItem>
                      ))}
                    </Select>
                    {touched.category && errors.category && (
                      <FormHelperText>{errors.category}</FormHelperText>
                    )}
                  </FormControl>
                  <TextField
                    fullWidth
                    name="price"
                    label="Price"
                    type="number"
                    value={values.price}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.price && Boolean(errors.price)}
                    helperText={touched.price && errors.price}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                    inputProps={{ min: 0, step: 0.01 }}
                  />
                  <TextField
                    fullWidth
                    name="stockQuantity"
                    label="Stock Quantity"
                    type="number"
                    value={values.stockQuantity}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.stockQuantity && Boolean(errors.stockQuantity)}
                    helperText={touched.stockQuantity && errors.stockQuantity}
                    inputProps={{ min: 0 }}
                  />
                  <TextField
                    fullWidth
                    name="description"
                    label="Description"
                    multiline
                    rows={3}
                    value={values.description}
                    onChange={handleChange}
                    onBlur={handleBlur}
                    error={touched.description && Boolean(errors.description)}
                    helperText={touched.description && errors.description}
                  />
                </Box>
              </DialogContent>
              <DialogActions>
                <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
                <Button type="submit" variant="contained" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingId ? "Update" : "Create"}
                </Button>
              </DialogActions>
            </Form>
          )}
        </Formik>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteConfirmOpen} onClose={() => setDeleteConfirmOpen(false)}>
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          <Typography>
            Are you sure you want to delete "{productToDelete?.name}"?
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteConfirmOpen(false)}>Cancel</Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
