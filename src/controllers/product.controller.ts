import { catchAsync } from "../utils/catchAsync.js";
import { productService } from "../services/product.service.js";

export const createProduct = catchAsync(async (req, res) => {
  const product = await productService.createProduct(req.body);
  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product,
  });
});

export const updateProduct = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const product = await productService.updateProduct(id, req.body);
  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: product,
  });
});

export const deleteProduct = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  await productService.deleteProduct(id);
  res.status(204).send();
});

export const getProducts = catchAsync(async (req, res) => {
  const result = await productService.getProducts(req.query);
  res.status(200).json({
    success: true,
    message: "Products retrieved successfully",
    ...result,
  });
});

export const getArchivedProducts = catchAsync(async (req, res) => {
  const result = await productService.getArchivedProducts(req.query);
  res.status(200).json({
    success: true,
    message: "Archived products retrieved successfully",
    ...result,
  });
});

export const getProductById = catchAsync(async (req, res) => {
  const id = req.params.id as string;
  const product = await productService.getProductById(id);
  res.status(200).json({
    success: true,
    message: "Product retrieved successfully",
    data: product,
  });
});
