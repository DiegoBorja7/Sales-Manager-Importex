from pydantic import BaseModel, Field, ConfigDict
from datetime import date, datetime
from typing import Optional, List
from decimal import Decimal

class SaleBase(BaseModel):
    sale_date: date
    product_name: str
    quantity: int
    purchase_price: Decimal = Field(decimal_places=2)
    sale_price: Decimal = Field(decimal_places=2)
    seller: Optional[str] = None
    external_id: Optional[str] = None

class SaleCreateManual(SaleBase):
    pass

class SaleResponse(SaleBase):
    id: int
    profit: Decimal
    source: str
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)

class ErrorDetail(BaseModel):
    fila: int
    error: str

class CSVImportReport(BaseModel):
    total_processed: int
    total_imported: int
    total_ignored: int
    total_errors: int
    error_details: List[ErrorDetail]
