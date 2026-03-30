from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
import pandas as pd
import io
import uuid
import math
import logging
import time
from decimal import Decimal

# ── Logger Setup ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-7s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S"
)
logger = logging.getLogger("importex")

import models
import schemas
from database import engine, get_db

# Create models on startup (if they don't exist in DB)
models.Base.metadata.create_all(bind=engine)

app = FastAPI(title="Importex MVP Backend", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173", 
        "http://localhost:5174", 
        "http://127.0.0.1:5173", 
        "http://127.0.0.1:5174",
        "https://importex-app.vercel.app"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def read_root():
    return {"message": "Importex API is running. Upload CSV at /api/sales/upload-csv"}

def clean_column_names(df: pd.DataFrame) -> pd.DataFrame:
    """Normalize dataframe column names."""
    # 1. Strip whitespace
    # 2. Lowercase
    # 3. Replace space with underscore
    # 4. Remove accents/special chars via NFKD
    # 5. Strip trailing underscores that might occur from special char removal
    df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.normalize('NFKD').str.encode('ascii', errors='ignore').str.decode('utf-8').str.rstrip('_')
    return df

def clean_money(val):
    """Sanitize money strings like '$25,00' or ' 25.00 ' into Decimal."""
    if pd.isna(val) or str(val).strip() == '' or str(val).strip().upper() == 'N/A':
        return Decimal('0.00')
    clean_str = str(val).replace('$', '').replace('.', '').replace(',', '.').strip()
    try:
        return Decimal(clean_str)
    except:
        return Decimal('0.00')

# ==========================================
# PRODUCTS ENDPOINTS
# ==========================================
from typing import Union

@app.get('/api/products', response_model=Union[schemas.PaginatedProductResponse, List[schemas.ProductResponse]])
def get_products(
    page: int = 1,
    limit: int = 50,
    search: str = None,
    sort: str = "asc",
    nopage: bool = False,
    db: Session = Depends(get_db)
):
    """Retrieve products from inventory."""
    query = db.query(models.Product)
    
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            models.Product.name.ilike(search_term) |
            models.Product.sku.ilike(search_term) |
            models.Product.purchased_by.ilike(search_term)
        )
        
    if sort == "desc":
        query = query.order_by(models.Product.name.desc())
    else:
        query = query.order_by(models.Product.name.asc())
        
    if nopage:
        return query.all()
        
    total_count = query.count()
    offset = (page - 1) * limit
    products = query.offset(offset).limit(limit).all()
    total_pages = (total_count + limit - 1) // limit if limit > 0 else 1
    
    return {
        "data": products,
        "total": total_count,
        "page": page,
        "limit": limit,
        "total_pages": total_pages
    }

@app.post('/api/products', response_model=schemas.ProductResponse)
def create_product(product: schemas.ProductCreate, db: Session = Depends(get_db)):
    """Create a new product."""
    new_product = models.Product(**product.model_dump())
    db.add(new_product)
    try:
        db.commit()
        db.refresh(new_product)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error: El producto o SKU ya existe.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error inesperado: {str(e)}")
    return new_product

@app.put('/api/products/{product_id}', response_model=schemas.ProductResponse)
def update_product(product_id: int, product: schemas.ProductUpdate, db: Session = Depends(get_db)):
    """Update a product's details or stock."""
    db_prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    update_data = product.model_dump(exclude_unset=True)
    for k, v in update_data.items():
         setattr(db_prod, k, v)
         
    try:
        db.commit()
        db.refresh(db_prod)
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error: El nombre o SKU ya está en uso.")
    return db_prod

@app.put('/api/products/{product_id}/stock', response_model=schemas.ProductResponse)
def adjust_product_stock(product_id: int, payload: schemas.StockAdjustRequest, db: Session = Depends(get_db)):
    """Adjust stock by adding or subtracting and log the movement."""
    db_prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_prod:
         raise HTTPException(status_code=404, detail="Producto no encontrado")
         
    if payload.quantity == 0:
         raise HTTPException(status_code=400, detail="La cantidad no puede ser 0")
         
    db_prod.stock += payload.quantity
    
    movement = models.StockMovement(
        product_id=product_id,
        quantity=payload.quantity,
        reason=payload.reason
    )
    db.add(movement)
    
    db.commit()
    db.refresh(db_prod)
    return db_prod

@app.get('/api/products/{product_id}/movements', response_model=List[schemas.StockMovementResponse])
def get_product_movements(product_id: int, db: Session = Depends(get_db)):
    """Get stock movements history for a product."""
    movements = db.query(models.StockMovement)\
        .filter(models.StockMovement.product_id == product_id)\
        .order_by(models.StockMovement.created_at.desc())\
        .limit(50)\
        .all()
    return movements

@app.delete('/api/products/{product_id}')
def delete_product(product_id: int, db: Session = Depends(get_db)):
    """Delete a product. Blocks if it has manual sales. Unlinks CSV sales."""
    db_prod = db.query(models.Product).filter(models.Product.id == product_id).first()
    if not db_prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    # Business Logic: Prevent deletion if there are actual physical 'manual' sales
    has_manual_sales = db.query(models.Sale).filter(
        models.Sale.product_id == product_id,
        models.Sale.source == 'manual'
    ).first()
    
    if has_manual_sales:
        raise HTTPException(
            status_code=400, 
            detail="No se puede eliminar: El producto tiene ventas físicas registradas en el local. Debes eliminar las ventas primero."
        )
        
    try:
        # It's safe to unlink any E-commerce (CSV) sales to avoid Integrity errors
        db.query(models.Sale).filter(models.Sale.product_id == product_id).update({"product_id": None})
        
        # Delete the product permanently
        db.delete(db_prod)
        db.commit()
        logger.info(f"DELETE /api/products/{product_id} | Producto eliminado estructuralmente: '{db_prod.name}'")
        return {"message": "Producto eliminado y dependencias e-commerce limpiadas."}
    except Exception as e:
        db.rollback()
        logger.error(f"Error borrando producto: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error interno al eliminar: {str(e)}")

# ==========================================
# SALES ENDPOINTS
# ==========================================

@app.get("/api/sales", response_model=schemas.PaginatedSalesResponse)
def get_sales(
    page: int = 1, 
    limit: int = 50, 
    search: str = "",
    product: str = "",
    source: str = "",
    db: Session = Depends(get_db)
):
    """Retrieve paginated sales with server-side search and filters."""
    from sqlalchemy import func, cast, String
    
    # Ensure valid pagination params
    page = max(1, page)
    limit = max(1, min(limit, 200))
    
    # Base query
    base_query = db.query(models.Sale)
    
    # Apply search filter (ILIKE across multiple columns)
    if search.strip():
        search_term = f"%{search.strip()}%"
        base_query = base_query.filter(
            models.Sale.product_name.ilike(search_term) |
            models.Sale.seller.ilike(search_term) |
            cast(models.Sale.sale_price, String).ilike(search_term)
        )
    
    # Apply product filter (exact match)
    if product.strip():
        base_query = base_query.filter(models.Sale.product_name == product.strip())
    
    # Apply source filter (exact match)  
    if source.strip():
        base_query = base_query.filter(models.Sale.source == source.strip())
    
    # Total count (respecting filters)
    total = base_query.count()
    total_pages = math.ceil(total / limit) if total > 0 else 1
    
    # Paginated data
    offset = (page - 1) * limit
    sales = base_query.order_by(
        models.Sale.sale_date.desc(), 
        models.Sale.id.desc()
    ).offset(offset).limit(limit).all()
    
    # Aggregated metrics (respecting filters)
    metrics_query = db.query(
        func.coalesce(func.sum(models.Sale.sale_price), 0).label('revenue'),
        func.coalesce(func.sum(models.Sale.profit), 0).label('profit'),
        func.coalesce(func.sum(models.Sale.quantity), 0).label('items')
    )
    # Re-apply same filters to metrics
    if search.strip():
        search_term = f"%{search.strip()}%"
        metrics_query = metrics_query.filter(
            models.Sale.product_name.ilike(search_term) |
            models.Sale.seller.ilike(search_term) |
            cast(models.Sale.sale_price, String).ilike(search_term)
        )
    if product.strip():
        metrics_query = metrics_query.filter(models.Sale.product_name == product.strip())
    if source.strip():
        metrics_query = metrics_query.filter(models.Sale.source == source.strip())
    
    metrics_row = metrics_query.first()
    
    # Get unique products and sources for frontend dropdowns
    all_products = [r[0] for r in db.query(models.Sale.product_name).distinct().order_by(models.Sale.product_name).all()]
    all_sources = [r[0] for r in db.query(models.Sale.source).distinct().order_by(models.Sale.source).all()]
    
    logger.info(f"GET /api/sales | page={page} limit={limit} search='{search}' product='{product}' source='{source}' → {total} results")
    
    return schemas.PaginatedSalesResponse(
        data=sales,
        total=total,
        page=page,
        limit=limit,
        total_pages=total_pages,
        metrics=schemas.AggregatedMetrics(
            total_revenue=float(metrics_row.revenue),
            total_profit=float(metrics_row.profit),
            total_items=int(metrics_row.items)
        ),
        available_products=all_products,
        available_sources=all_sources
    )

@app.post("/api/sales/manual", response_model=schemas.SaleResponse)
def create_manual_sale(sale: schemas.SaleCreateManual, db: Session = Depends(get_db)):
    """Create a manual sale record."""
    db_product = db.query(models.Product).filter(models.Product.id == sale.product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    # CÁLCULO DE REPARTO DE ALTA PRECISIÓN (Sin redondeo temprano para evitar drift contable)
    split_vendedor = (profit_val * Decimal('0.40'))
    split_local = (profit_val * Decimal('0.25'))
    split_app = (profit_val * Decimal('0.25'))
    split_dev = (profit_val * Decimal('0.05'))
    split_empresa = (profit_val * Decimal('0.05'))

    new_sale = models.Sale(
        sale_date=sale.sale_date,
        product_id=sale.product_id,
        product_name=db_product.name,
        quantity=sale.quantity,
        purchase_price=actual_purchase_price,
        sale_price=sale.sale_price,
        profit=profit_val,
        seller=sale.seller,
        payment_method=sale.payment_method,
        is_invoiced=sale.is_invoiced,
        split_seller=split_vendedor,
        split_local=split_local,
        split_app=split_app,
        split_dev=split_dev,
        split_company=split_empresa,
        source='manual',
        external_id=f"MANUAL-{uuid.uuid4()}"
    )
    
    db_product.stock -= sale.quantity
    
    try:
        db.add(new_sale)
        db.commit()
        db.refresh(new_sale)
        logger.info(f"POST /api/sales/manual | Venta creada ID={new_sale.id} producto='{db_product.name}' split_vendedor=${split_vendedor}")
        return new_sale
    except IntegrityError:
        db.rollback()
        logger.warning(f"POST /api/sales/manual | Duplicado rechazado producto='{db_product.name}'")
        raise HTTPException(status_code=400, detail="Error: Ya existe un registro idéntico de esta venta.")
    except Exception as e:
        db.rollback()
        logger.error(f"POST /api/sales/manual | Error inesperado: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error inesperado al guardar: {str(e)}")

@app.post("/api/sales/upload-csv", response_model=schemas.CSVImportReport)
async def upload_sales_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    csv_start = time.time()
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")
    
    logger.info(f"POST /api/sales/upload-csv | Archivo recibido: '{file.filename}'")
    contents = await file.read()
    try:
        # Read with default first, but drop rows that are completely empty
        df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
        df.dropna(how='all', inplace=True)
        # Drop columns that are completely unnamed or empty
        df = df.loc[:, ~df.columns.str.contains('^Unnamed')]
        
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error reading CSV: {str(e)}")

    df = clean_column_names(df)
    
    # Flexible column mapping
    aliases = {
        'external_id': ['id', 'pedido', '#_pedido', 'numero_de_pedido', 'order_id'],
        'sale_date': ['fecha', 'sale_date', 'fecha_venta', 'fecha_de_confirmacion', 'fecha_confirmacion', 'fehca_de_confirmacion', 'n', 'n°'],
        'product_name': ['producto', 'product_name', 'articulo', 'nombre_producto', 'producto_'],
        'quantity': ['cantidad', 'quantity', 'cant'],
        'purchase_price': ['costo_proveedor', 'costo', 'costo_prov', 'precio_compra', 'purchase_price', 'costo_provedor'],
        'sale_price': ['precio_total', 'venta', 'sale_price', 'precio_venta', 'precio_total_'],
        'seller': ['plataforma', 'platform', 'canal', 'origen_venta', 'origen', 'tienda'],
        'estado': ['estado', 'status', 'estatus'],
        'shipping_cost': ['cstenvio', 'shipping_cost', 'costo_envio', 'envio']
    }

    mapped_columns = {}
    for standard_name, possible_names in aliases.items():
        found = False
        for col in df.columns:
            if col in possible_names:
                mapped_columns[standard_name] = col
                found = True
                break
        if not found and standard_name == 'estado':
             raise HTTPException(status_code=400, detail="La columna 'estado' es obligatoria en el CSV.")

    estado_col = mapped_columns['estado']
    
    total_processed = len(df)
    total_imported = 0
    total_ignored = 0
    total_errors = 0
    error_details = []

    try:
        # Strict filter: only "entregado"
        entregado_mask = df[estado_col].astype(str).str.strip().str.lower() == 'entregado'
        df_entregado = df[entregado_mask]
        total_ignored = total_processed - len(df_entregado)
    except KeyError:
         raise HTTPException(status_code=400, detail=f"Error al procesar la columna de estado: {estado_col}")

    # ── PHASE 1: Parse and validate all rows (no DB calls yet) ──
    parsed_sales = []  # List of (index, Sale) tuples
    
    for index, row in df_entregado.iterrows():
        try:
            external_id_val = row.get(mapped_columns.get('external_id'))
            sale_date_val = row.get(mapped_columns.get('sale_date'))
            product_name_val = row.get(mapped_columns.get('product_name'))
            quantity_val = row.get(mapped_columns.get('quantity'))
            purchase_price_val = row.get(mapped_columns.get('purchase_price'))
            sale_price_val = row.get(mapped_columns.get('sale_price'))
            seller_val = row.get(mapped_columns.get('seller'))

            # Handle 'N/A' strings that might come in the CSV
            sale_date_str = str(sale_date_val).strip().upper() if not pd.isna(sale_date_val) else ""
            
            # Check required fields
            if pd.isna(sale_date_val) or pd.isna(product_name_val) or pd.isna(quantity_val) or str(product_name_val).strip() == '' or str(quantity_val).strip() == '' or sale_date_str == 'N/A' or sale_date_str == 'NAN':
                raise ValueError("Faltan campos obligatorios en esta fila (fecha, producto o cantidad).")

            try:
                parsed_date = pd.to_datetime(sale_date_val, dayfirst=True).date()
            except Exception:
                raise ValueError(f"Formato de fecha inválido: {sale_date_val}")

            try:
                parsed_quantity = int(quantity_val)
                parsed_sale_price = clean_money(sale_price_val)
                raw_csv_total_cost = clean_money(purchase_price_val)
                # Extraemos el costo de envío (CSTENVIO) si existe
                raw_shipping_cost = clean_money(row.get(mapped_columns.get('shipping_cost'))) if mapped_columns.get('shipping_cost') else 0
                
            except Exception:
                raise ValueError("Formato numérico inválido en cantidad, precios o envío.")

            # REGLA E-COMMERCE: Dropi/CSV exporta el "Costo Proveedor" como el costo total de la orden.
            # Lo convertimos a costo unitario para estandarizarlo en la estructura de DB que lo espera así.
            parsed_unit_purchase_price = raw_csv_total_cost / parsed_quantity if parsed_quantity > 0 else raw_csv_total_cost
            parsed_shipping_cost = raw_shipping_cost
            
            # Utilidad = Venta - Costo Prod (Total) - Envío
            profit_val = parsed_sale_price - raw_csv_total_cost - parsed_shipping_cost
            ext_id = str(external_id_val).strip() if pd.notna(external_id_val) else f"CSV-MISSING-ID-{uuid.uuid4()}"
            
            raw_product_name = str(product_name_val).strip()
            
            # El e-commerce (Dropi) es dinámico, por tanto NO lo atamos al inventario físico
            product_id = None
            final_product_name = raw_product_name

            new_sale = models.Sale(
                sale_date=parsed_date,
                product_id=product_id,
                product_name=final_product_name,
                quantity=parsed_quantity,
                purchase_price=parsed_unit_purchase_price,
                sale_price=parsed_sale_price,
                shipping_cost=parsed_shipping_cost,
                profit=profit_val,
                seller=str(seller_val).strip() if pd.notna(seller_val) else None,
                source='csv',
                external_id=ext_id
            )
            parsed_sales.append(new_sale)
            
        except ValueError as ve:
            total_errors += 1
            ext_ref = row.get(mapped_columns.get('external_id'), '?')
            logger.warning(f"CSV fila #{index + 2} | Pedido: {ext_ref} | {str(ve)}")
            error_details.append(schemas.ErrorDetail(fila=index + 2, error=str(ve)))
        except Exception as e:
            total_errors += 1
            ext_ref = row.get(mapped_columns.get('external_id'), '?')
            logger.error(f"CSV fila #{index + 2} | Pedido: {ext_ref} | Error inesperado: {str(e)}")
            error_details.append(schemas.ErrorDetail(fila=index + 2, error=f"Error inesperado: {str(e)}"))

    # ── PHASE 2: Upsert (Insert new, Update existing) ──
    if parsed_sales:
        # 1. Identificar cuáles ya existen en un solo query
        incoming_ids = [s.external_id for s in parsed_sales]
        db_existing_sales = {
            s.external_id: s for s in db.query(models.Sale)
            .filter(models.Sale.external_id.in_(incoming_ids))
            .all()
        }
        
        new_sales_count = 0
        updated_sales_count = 0
        
        for sale_in in parsed_sales:
            if sale_in.external_id in db_existing_sales:
                # MODO ACTUALIZACIÓN: Refrescamos los datos financieros clave
                db_sale = db_existing_sales[sale_in.external_id]
                db_sale.purchase_price = sale_in.purchase_price
                db_sale.shipping_cost = sale_in.shipping_cost
                db_sale.profit = sale_in.profit
                # También actualizamos el nombre del producto por si cambió en el catálogo
                db_sale.product_name = sale_in.product_name
                updated_sales_count += 1
            else:
                # MODO INSERCIÓN: Nuevo pedido
                db.add(sale_in)
                new_sales_count += 1
        
        db.commit()
        total_imported = new_sales_count
        logger.info(f"CSV upsert | {new_sales_count} nuevos creados, {updated_sales_count} actualizados con éxito")

    csv_elapsed = round(time.time() - csv_start, 2)
    logger.info(f"POST /api/sales/upload-csv | Completado en {csv_elapsed}s → importados={total_imported} ignorados={total_ignored} errores={total_errors} de {total_processed} filas")

    return schemas.CSVImportReport(
        total_processed=total_processed,
        total_imported=total_imported,
        total_ignored=total_ignored,
        total_errors=total_errors,
        error_details=error_details
    )

@app.put('/api/sales/{sale_id}', response_model=schemas.SaleResponse)
def update_sale(sale_id: int, sale: schemas.SaleCreateManual, db: Session = Depends(get_db)):
    db_sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not db_sale:
        raise HTTPException(status_code=404, detail='Venta no encontrada')
        
    db_product = db.query(models.Product).filter(models.Product.id == sale.product_id).first()
    if not db_product:
        raise HTTPException(status_code=404, detail="Producto no encontrado")
        
    # Restituir stock original si era manual
    if db_sale.source == 'manual' and db_sale.product_id:
        old_product = db.query(models.Product).filter(models.Product.id == db_sale.product_id).first()
        if old_product:
            old_product.stock += db_sale.quantity
    
    # Calcular Splits con Alta Precisión (4 decimales soportados en BD)
    split_vendedor = (profit_val * Decimal('0.40'))
    split_local = (profit_val * Decimal('0.25'))
    split_app = (profit_val * Decimal('0.25'))
    split_dev = (profit_val * Decimal('0.05'))
    split_empresa = (profit_val * Decimal('0.05'))

    db_sale.sale_date = sale.sale_date
    db_sale.product_id = sale.product_id
    db_sale.product_name = db_product.name
    db_sale.quantity = sale.quantity
    db_sale.purchase_price = sale.purchase_price
    db_sale.sale_price = sale.sale_price
    db_sale.seller = sale.seller
    db_sale.profit = profit_val
    
    # Nuevos campos
    db_sale.payment_method = sale.payment_method
    db_sale.is_invoiced = sale.is_invoiced
    db_sale.split_seller = split_vendedor
    db_sale.split_local = split_local
    db_sale.split_app = split_app
    db_sale.split_dev = split_dev
    db_sale.split_company = split_empresa 

    # Descontar nuevo stock
    if db_sale.source == 'manual':
        db_product.stock -= sale.quantity
    
    db.commit()
    db.refresh(db_sale)
    logger.info(f"PUT /api/sales/{sale_id} | Venta actualizada con nuevo reparto de utilidad")
    return db_sale

@app.delete('/api/sales/{sale_id}')
def delete_sale(sale_id: int, db: Session = Depends(get_db)):
    db_sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not db_sale:
        raise HTTPException(status_code=404, detail='Venta no encontrada')
        
    # Restituir stock
    if db_sale.source == 'manual' and db_sale.product_id:
        db_product = db.query(models.Product).filter(models.Product.id == db_sale.product_id).first()
        if db_product:
            db_product.stock += db_sale.quantity
    
    db.delete(db_sale)
    db.commit()
    logger.info(f"DELETE /api/sales/{sale_id} | Venta eliminada producto='{db_sale.product_name}'")
    return {'message': 'Venta eliminada exitosamente'}

# ==========================================
# EXPENSES ENDPOINTS
# ==========================================

@app.get('/api/expenses', response_model=List[schemas.ExpenseResponse])
def get_expenses(month: str = None, source: str = None, db: Session = Depends(get_db)):
    """Fetch expenses, optionally filtered by month (YYYY-MM) and source."""
    query = db.query(models.Expense)
    if month:
        try:
            year_str, month_str = month.split('-')
            from sqlalchemy import extract
            query = query.filter(
                extract('year', models.Expense.expense_date) == int(year_str),
                extract('month', models.Expense.expense_date) == int(month_str)
            )
        except ValueError:
            pass # Invalid format, ignore filter
            
    if source:
        query = query.filter(models.Expense.target_source.in_([source, 'global']))
    
    expenses = query.order_by(models.Expense.expense_date.desc()).all()
    return expenses

@app.post('/api/expenses', response_model=schemas.ExpenseResponse)
def create_expense(expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    new_expense = models.Expense(
        expense_date=expense.expense_date,
        category=expense.category,
        amount=expense.amount,
        product_name=expense.product_name,
        description=expense.description,
        target_source=expense.target_source
    )
    db.add(new_expense)
    db.commit()
    db.refresh(new_expense)
    logger.info(f"POST /api/expenses | Gasto registrado category='{new_expense.category}' amount=${new_expense.amount}")
    return new_expense

@app.put('/api/expenses/{expense_id}', response_model=schemas.ExpenseResponse)
def update_expense(expense_id: int, expense: schemas.ExpenseCreate, db: Session = Depends(get_db)):
    db_exp = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_exp:
        raise HTTPException(status_code=404, detail='Gasto no encontrada')
    
    db_exp.expense_date = expense.expense_date
    db_exp.category = expense.category
    db_exp.amount = expense.amount
    db_exp.product_name = expense.product_name
    db_exp.description = expense.description
    db_exp.target_source = expense.target_source
    
    db.commit()
    db.refresh(db_exp)
    logger.info(f"PUT /api/expenses/{expense_id} | Gasto actualizado category='{db_exp.category}' amount=${db_exp.amount}")
    return db_exp

@app.delete('/api/expenses/{expense_id}')
def delete_expense(expense_id: int, db: Session = Depends(get_db)):
    db_exp = db.query(models.Expense).filter(models.Expense.id == expense_id).first()
    if not db_exp:
        raise HTTPException(status_code=404, detail='Gasto no encontrado')
    
    db.delete(db_exp)
    db.commit()
    logger.info(f"DELETE /api/expenses/{expense_id} | Gasto eliminado category='{db_exp.category}'")
    return {'message': 'Gasto eliminado exitosamente'}

# ==========================================
# SUMMARY ENDPOINTS (MONTHLY INTELLIGENCE)
# ==========================================

from sqlalchemy import func

@app.get('/api/summary/monthly', response_model=List[schemas.MonthlySummaryProduct])
def get_monthly_summary(month: str, source: str = None, db: Session = Depends(get_db)):
    """
    Returns financial aggregation per product for a given month.
    Month format: 'YYYY-MM'
    source: Optional 'csv' (Dropi) or 'manual'. null = all.
    """
    try:
        year_str, month_str = month.split('-')
        year_int = int(year_str)
        month_int = int(month_str)
    except ValueError:
        raise HTTPException(status_code=400, detail="Mes inválido. Use formato YYYY-MM")

    # 1. Base Sales Aggregation
    from sqlalchemy import extract
    from sqlalchemy import func
    
    sales_base = db.query(
        func.coalesce(models.Product.name, models.Sale.product_name).label('product_name'),
        func.sum(models.Sale.sale_price).label('ventas'),
        func.sum(models.Sale.purchase_price * models.Sale.quantity).label('proveedor_base'),
        func.sum(models.Sale.shipping_cost).label('logistica_base'),
        func.sum(models.Sale.split_seller).label('split_seller_base'),
        func.sum(models.Sale.split_local).label('split_local_base'),
        func.sum(models.Sale.split_app).label('split_app_base'),
        func.sum(models.Sale.split_dev).label('split_dev_base'),
        func.sum(models.Sale.split_company).label('split_company_base')
    ).join(models.Product, models.Sale.product_id == models.Product.id, isouter=True).filter(
        extract('year', models.Sale.sale_date) == year_int,
        extract('month', models.Sale.sale_date) == month_int
    )
    
    if source:
        sales_base = sales_base.filter(models.Sale.source == source)
        
    sales_query = sales_base.group_by(func.coalesce(models.Product.name, models.Sale.product_name)).all()

    summary_data = {}
    
    from decimal import ROUND_HALF_UP
    
    for row in sales_query:
        prod = row.product_name
        
        # 1. Capturar valores con máxima precisión
        v = Decimal(str(row.ventas or 0))
        p = Decimal(str(row.proveedor_base or 0))
        l = Decimal(str(row.logistica_base or 0))
        
        # 2. Calcular Utilidad de la fila (Redondeada a 2 decimales para el reporte)
        u = (v - p - l).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # 3. Calcular Splits redondeados individualmente
        s_seller = (Decimal(str(row.split_seller_base or 0))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        s_local = (Decimal(str(row.split_local_base or 0))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        s_app = (Decimal(str(row.split_app_base or 0))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        s_dev = (Decimal(str(row.split_dev_base or 0))).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
        
        # 4. RECONCILIACIÓN VISUAL: La empresa absorbe el drift de redondeo de visualización (+/- 0.01)
        # Esto hace que la suma de las columnas mostradas sea EXACTAMENTE igual a la utilidad de la fila.
        s_company = u - (s_seller + s_local + s_app + s_dev)
        
        summary_data[prod] = {
            "product_name": prod,
            "ventas": float(v),
            "proveedor": float(p),
            "logistica": float(l),
            "devolucion": 0.0,
            "ads": 0.0,
            "utilidad": float(u),
            "split_seller": float(s_seller),
            "split_local": float(s_local),
            "split_app": float(s_app),
            "split_dev": float(s_dev),
            "split_company": float(s_company)
        }

    # 2. Expenses Aggregation
    expenses_base = db.query(
        models.Expense.product_name,
        models.Expense.category,
        func.sum(models.Expense.amount).label('total_amount'),
        models.Expense.target_source
    ).filter(
        extract('year', models.Expense.expense_date) == year_int,
        extract('month', models.Expense.expense_date) == month_int
    )
    
    if source:
        expenses_base = expenses_base.filter(models.Expense.target_source.in_([source, 'global']))

    expenses_query = expenses_base.group_by(models.Expense.product_name, models.Expense.category, models.Expense.target_source).all()

    has_general_expenses = False
    general_expenses = {
        "product_name": "Gastos Generales / Sin Asignar",
        "ventas": 0.0,
        "proveedor": 0.0,
        "logistica": 0.0,
        "devolucion": 0.0,
        "ads": 0.0,
        "utilidad": 0.0
    }

    for row in expenses_query:
        prod = row.product_name
        cat = str(row.category).lower()
        amt = float(row.total_amount or 0)

        target_dict = None
        if not prod or str(prod).strip() == "":
            target_dict = general_expenses
            has_general_expenses = True
        else:
            if prod not in summary_data:
                summary_data[prod] = {
                    "product_name": prod,
                    "ventas": 0.0,
                    "proveedor": 0.0,
                    "logistica": 0.0,
                    "devolucion": 0.0,
                    "ads": 0.0,
                    "utilidad": 0.0
                }
            target_dict = summary_data[prod]

        # Map categories
        if 'log' in cat:
            target_dict["logistica"] += amt
        elif 'dev' in cat:
            target_dict["devolucion"] += amt
        elif 'ad' in cat or 'facebook' in cat or 'tik tok' in cat:
            target_dict["ads"] += amt
        elif 'prov' in cat or 'prima' in cat:
            target_dict["proveedor"] += amt
        else:
            target_dict["logistica"] += amt # Fallback para gastos varios

    # 3. Calculate Real Profit
    results = []
    for params in summary_data.values():
        params["utilidad"] = params["ventas"] - (params["proveedor"] + params["logistica"] + params["devolucion"] + params["ads"])
        results.append(params)
    
    if has_general_expenses:
        general_expenses["utilidad"] = general_expenses["ventas"] - (general_expenses["proveedor"] + general_expenses["logistica"] + general_expenses["devolucion"] + general_expenses["ads"])
        results.append(general_expenses)

    # Sort: Generales at the end, rest by highest sales
    results.sort(key=lambda x: (-x['ventas'] if x['product_name'] != "Gastos Generales / Sin Asignar" else float('inf')))

    return results

@app.get('/api/summary/monthly-total', response_model=schemas.MonthlySummaryTotal)
def get_monthly_summary_total(month: str, source: str = None, db: Session = Depends(get_db)):
    """
    Returns grand totals for the financial dashboard.
    """
    products = get_monthly_summary(month, source, db)
    
    total = schemas.MonthlySummaryTotal(
        ventas_totales=0.0,
        proveedor_total=0.0,
        logistica_total=0.0,
        devolucion_total=0.0,
        ads_total=0.0,
        utilidad_real=0.0,
        split_seller_total=0.0,
        split_local_total=0.0,
        split_app_total=0.0,
        split_dev_total=0.0,
        split_company_total=0.0
    )
    
    for p in products:
        total.ventas_totales += p["ventas"]
        total.proveedor_total += p["proveedor"]
        total.logistica_total += p["logistica"]
        total.devolucion_total += p["devolucion"]
        total.ads_total += p["ads"]
        total.utilidad_real += p["utilidad"]
        
        # Sumar los splits ya reconciliados y redondeados de cada producto
        total.split_seller_total += p.get("split_seller", 0)
        total.split_local_total += p.get("split_local", 0)
        total.split_app_total += p.get("split_app", 0)
        total.split_dev_total += p.get("split_dev", 0)
        total.split_company_total += p.get("split_company", 0)
            
    return total
