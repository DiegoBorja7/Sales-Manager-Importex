from sqlalchemy import Column, Integer, String, Numeric, Date, DateTime, text, UniqueConstraint
from database import Base

class Sale(Base):
    __tablename__ = "sales"

    id = Column(Integer, primary_key=True, index=True)
    sale_date = Column(Date, index=True, nullable=False)
    product_name = Column(String, nullable=False)
    quantity = Column(Integer, nullable=False)
    purchase_price = Column(Numeric(10, 2), nullable=False)
    sale_price = Column(Numeric(10, 2), nullable=False)
    profit = Column(Numeric(10, 2), nullable=False)
    seller = Column(String, index=True, nullable=True)
    source = Column(String, nullable=False) # 'csv' or 'manual'
    created_at = Column(DateTime, server_default=text("NOW()"))

    __table_args__ = (
        UniqueConstraint('sale_date', 'product_name', 'seller', 'quantity', name='uq_sale_duplicate'),
    )
