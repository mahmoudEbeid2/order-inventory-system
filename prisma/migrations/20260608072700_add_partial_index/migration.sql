CREATE UNIQUE INDEX products_sku_active_key 
ON "products"("sku") WHERE "is_deleted" = false;