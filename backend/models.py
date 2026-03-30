from sqlalchemy import Column, Integer, String, Numeric, Boolean, Date, DateTime, Index, text, ForeignKey
from database import Base

class StockMovement(Base):
    __tablename__ = "stock_movements"
    
    id = Column(Integer, primary_key=True, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    quantity = Column(Integer, nullable=False)
    reason = Column(String(255), nullable=False)
    created_at = Column(DateTime, server_default=text("NOW()"))

class Sale(Base):
    __tablename__ = "sales"
    __table_args__ = (
        Index('ix_sales_date_seller', 'sale_date', 'seller'),
    )

    id = Column(Integer, primary_key=True, index=True)
    sale_date = Column(Date, index=True, nullable=False)
    product_name = Column(String, nullable=False)
    product_id = Column(Integer, ForeignKey("products.id"), nullable=True, index=True)
    quantity = Column(Integer, nullable=False)
    purchase_price = Column(Numeric(10, 2), nullable=False)
    sale_price = Column(Numeric(10, 2), nullable=False)
    profit = Column(Numeric(10, 2), nullable=False)
    seller = Column(String, index=True, nullable=True)
    source = Column(String, nullable=False) # 'csv' or 'manual'
    external_id = Column(String, unique=True, index=True, nullable=True) # E.g., Dropi ID or generated Manual ID
    shipping_cost = Column(Numeric(10, 2), nullable=False, default=0)
    
    # --- Nuevos Campos: Liquidación de Comisiones y Facturación (Tienda Físico) ---
    payment_method = Column(String, nullable=True) # 'Efectivo', 'Transferencia', 'Tarjeta'
    is_invoiced = Column(Boolean, nullable=False, default=False)
    split_seller = Column(Numeric(14, 4), nullable=True)   # 40% (Vendedor)
    split_local = Column(Numeric(14, 4), nullable=True)    # 25% (Local)
    split_app = Column(Numeric(14, 4), nullable=True)      # 25% (Aplicación)
    split_dev = Column(Numeric(14, 4), nullable=True)      # 5% (Devolución)
    split_company = Column(Numeric(14, 4), nullable=True)  # 5% (Empresa)
    
    created_at = Column(DateTime, server_default=text("NOW()"))
    updated_at = Column(DateTime, server_default=text("NOW()"), onupdate=text("NOW()"))

class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, index=True, nullable=False)
    sku = Column(String, unique=True, index=True, nullable=True)
    purchased_by = Column(String, nullable=True)
    purchase_date = Column(Date, nullable=True)
    purchase_price = Column(Numeric(10, 2), nullable=False, default=0)
    sale_price = Column(Numeric(10, 2), nullable=False, default=0)
    stock = Column(Integer, nullable=False, default=0)
    created_at = Column(DateTime, server_default=text("NOW()"))
    updated_at = Column(DateTime, server_default=text("NOW()"), onupdate=text("NOW()"))

class Expense(Base):
    __tablename__ = "expenses"
    __table_args__ = (
        Index('ix_expenses_date_product', 'expense_date', 'product_name'),
    )

    id = Column(Integer, primary_key=True, index=True)
    expense_date = Column(Date, index=True, nullable=False)
    category = Column(String, index=True, nullable=False) # 'Logística', 'Ads', 'Devoluciones', 'Proveedor', 'General'
    amount = Column(Numeric(10, 2), nullable=False)
    product_name = Column(String, index=True, nullable=True) # Optional. Null means generic expense
    description = Column(String, nullable=True)
    target_source = Column(String, default="global", nullable=False) # 'global', 'csv', 'manual'
    created_at = Column(DateTime, server_default=text("NOW()"))
    updated_at = Column(DateTime, server_default=text("NOW()"), onupdate=text("NOW()"))
