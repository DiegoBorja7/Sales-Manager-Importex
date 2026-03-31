from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal

class SaleBase(BaseModel):
    sale_date: date
    product_name: str
    product_id: Optional[int] = None
    quantity: int
    purchase_price: Decimal = Field(decimal_places=2)
    sale_price: Decimal = Field(decimal_places=2)
    seller: Optional[str] = None
    external_id: Optional[str] = None

class SaleCreateManual(BaseModel):
    sale_date: date
    product_id: int
    quantity: int
    purchase_price: Decimal = Field(decimal_places=2)
    sale_price: Decimal = Field(decimal_places=2)
    seller: Optional[str] = None
    payment_method: Optional[str] = None
    is_invoiced: Optional[bool] = False

class SaleResponse(SaleBase):
    id: int
    profit: Decimal
    source: str
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    # Nuevos campos de split/comisión
    payment_method: Optional[str] = None
    is_invoiced: bool = False
    split_seller: Optional[Decimal] = None
    split_local: Optional[Decimal] = None
    split_app: Optional[Decimal] = None
    split_dev: Optional[Decimal] = None
    split_company: Optional[Decimal] = None
    
    model_config = ConfigDict(from_attributes=True)

class ErrorDetail(BaseModel):
    fila: int
    error: str

class ProductBase(BaseModel):
    name: str
    sku: Optional[str] = None
    purchased_by: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Decimal = Field(default=0, decimal_places=2)
    sale_price: Decimal = Field(default=0, decimal_places=2)
    stock: int = Field(default=0)

class ProductCreate(ProductBase):
    pass

class ProductUpdate(BaseModel):
    name: Optional[str] = None
    sku: Optional[str] = None
    purchased_by: Optional[str] = None
    purchase_date: Optional[date] = None
    purchase_price: Optional[Decimal] = None
    sale_price: Optional[Decimal] = None
    stock: Optional[int] = None

class ProductResponse(ProductBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None
    
    model_config = ConfigDict(from_attributes=True)

class StockMovementResponse(BaseModel):
    id: int
    product_id: int
    quantity: int
    reason: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class StockAdjustRequest(BaseModel):
    quantity: int
    reason: str

class PaginatedProductResponse(BaseModel):
    data: List[ProductResponse]
    total: int
    page: int
    limit: int
    total_pages: int

class CSVImportReport(BaseModel):
    total_processed: int
    total_imported: int
    total_ignored: int
    total_errors: int
    error_details: List[ErrorDetail]

class AggregatedMetrics(BaseModel):
    total_revenue: float
    total_profit: float
    total_items: int

class PaginatedSalesResponse(BaseModel):
    data: List[SaleResponse]
    total: int
    page: int
    limit: int
    total_pages: int
    metrics: AggregatedMetrics
    available_products: List[str] = []
    available_sources: List[str] = []

class ExpenseBase(BaseModel):
    expense_date: date
    category: str
    amount: Decimal = Field(decimal_places=2)
    product_name: Optional[str] = None
    description: Optional[str] = None
    target_source: Optional[str] = "global"

class ExpenseCreate(ExpenseBase):
    pass

class ExpenseResponse(ExpenseBase):
    id: int
    created_at: datetime
    updated_at: Optional[datetime] = None

    model_config = ConfigDict(from_attributes=True)

class MonthlySummaryProduct(BaseModel):
    product_name: str
    ventas: float
    proveedor: float
    logistica: float
    devolucion: float
    ads: float
    utilidad: float
    # Campos de reparto para manual (Tienda)
    split_seller: float = 0.0
    split_local: float = 0.0
    split_app: float = 0.0
    split_dev: float = 0.0
    split_company: float = 0.0
    cantidad: Optional[int] = 0

class MonthlySummaryTotal(BaseModel):
    ventas_totales: float
    proveedor_total: float
    logistica_total: float
    devolucion_total: float
    ads_total: float
    utilidad_real: float
    # Conceptos de Liquidación (Solo para Tienda/Manual)
    split_seller_total: float = 0.0
    split_local_total: float = 0.0
    split_app_total: float = 0.0
    split_dev_total: float = 0.0
    split_company_total: float = 0.0
    unidades_totales: Optional[int] = 0
