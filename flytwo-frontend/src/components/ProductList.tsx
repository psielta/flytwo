import { useEffect, useState } from "react";
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
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Chip,
  Alert,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  FormHelperText,
  InputAdornment
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import EditIcon from "@mui/icons-material/Edit";
import DeleteIcon from "@mui/icons-material/Delete";
import { ApiClient } from "../api/api-client";
import type { ProductDto, CreateProductRequest, UpdateProductRequest } from "../api/api-client";

const client = new ApiClient("http://localhost:5110");

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

  const fetchProducts = async (signal?: AbortSignal) => {
    try {
      setLoading(true);
      setError(null);
      const data = selectedCategory
        ? await client.category(selectedCategory, signal)
        : await client.productAll(signal);
      setProducts(data);
    } catch (err) {
      if (err instanceof Error && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Failed to fetch products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    fetchProducts(controller.signal);
    return () => controller.abort();
  }, [selectedCategory]);

  const handleSubmit = async (values: ProductFormValues, { resetForm }: { resetForm: () => void }) => {
    try {
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
          {loading ? "Loading..." : `${products.length} products`}
        </Typography>
      </Box>

      {loading && products.length === 0 ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress />
        </Box>
      ) : (
        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Name</TableCell>
                <TableCell>Category</TableCell>
                <TableCell align="right">Price</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell>SKU</TableCell>
                <TableCell align="center">Active</TableCell>
                <TableCell align="center">Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id} hover>
                  <TableCell>
                    <Typography variant="body1" fontWeight="medium">
                      {product.name}
                    </Typography>
                    {product.description && (
                      <Typography variant="body2" color="text.secondary">
                        {product.description}
                      </Typography>
                    )}
                  </TableCell>
                  <TableCell>
                    <Chip label={product.category} size="small" color="primary" variant="outlined" />
                  </TableCell>
                  <TableCell align="right">
                    <Typography fontWeight="bold">{formatPrice(product.price)}</Typography>
                  </TableCell>
                  <TableCell align="right">
                    <Typography color={(product.stockQuantity || 0) < 10 ? "error" : "inherit"}>
                      {product.stockQuantity}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" fontFamily="monospace">
                      {product.sku}
                    </Typography>
                  </TableCell>
                  <TableCell align="center">
                    <Chip
                      label={product.isActive ? "Yes" : "No"}
                      size="small"
                      color={product.isActive ? "success" : "error"}
                    />
                  </TableCell>
                  <TableCell align="center">
                    <IconButton size="small" onClick={() => startEditing(product)} color="primary">
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => {
                        setProductToDelete(product);
                        setDeleteConfirmOpen(true);
                      }}
                      color="error"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
              {products.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7} align="center">
                    <Typography color="text.secondary" py={4}>
                      No products found. {selectedCategory && "Try selecting a different category or"} Add one above!
                    </Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}

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
