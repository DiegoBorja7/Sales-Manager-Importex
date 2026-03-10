from fastapi import FastAPI, Depends, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import List
import pandas as pd
import io
import uuid
from decimal import Decimal

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

@app.get("/api/sales", response_model=List[schemas.SaleResponse])
def get_sales(db: Session = Depends(get_db)):
    """Retrieve all sales sorted by most recent date."""
    sales = db.query(models.Sale).order_by(models.Sale.sale_date.desc(), models.Sale.id.desc()).all()
    return sales

@app.post("/api/sales/manual", response_model=schemas.SaleResponse)
def create_manual_sale(sale: schemas.SaleCreateManual, db: Session = Depends(get_db)):
    """Create a manual sale record."""
    profit_val = sale.sale_price - (sale.purchase_price * sale.quantity)
    
    new_sale = models.Sale(
        sale_date=sale.sale_date,
        product_name=sale.product_name,
        quantity=sale.quantity,
        purchase_price=sale.purchase_price,
        sale_price=sale.sale_price,
        profit=profit_val,
        seller=sale.seller,
        source='manual',
        external_id=f"MANUAL-{uuid.uuid4()}"
    )
    
    try:
        db.add(new_sale)
        db.commit()
        db.refresh(new_sale)
        return new_sale
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Error: Ya existe un registro idéntico de esta venta.")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error inesperado al guardar: {str(e)}")

@app.post("/api/sales/upload-csv", response_model=schemas.CSVImportReport)
async def upload_sales_csv(file: UploadFile = File(...), db: Session = Depends(get_db)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(status_code=400, detail="Invalid file type. Please upload a CSV.")
    
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
        'estado': ['estado', 'status', 'estatus']
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

    # Process filtered rows
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
            
            # Check required fields for these delivery sales (relaxing purchase_price and sale_price requirements)
            if pd.isna(sale_date_val) or pd.isna(product_name_val) or pd.isna(quantity_val) or str(product_name_val).strip() == '' or str(quantity_val).strip() == '' or sale_date_str == 'N/A' or sale_date_str == 'NAN':
                raise ValueError("Faltan campos obligatorios en esta fila (fecha, producto o cantidad).")

            try:
                # To handle formats like DD/MM/YYYY or similar if needed, pandas is generally smart
                parsed_date = pd.to_datetime(sale_date_val, dayfirst=True).date()
            except Exception:
                 raise ValueError(f"Formato de fecha inválido: {sale_date_val}")

            try:
                parsed_quantity = int(quantity_val)
                
                # Cleaning function for money strings like "$25,00" or " 25.00 "
                def clean_money(val):
                    if pd.isna(val) or str(val).strip() == '' or str(val).strip().upper() == 'N/A':
                        return Decimal('0.00')
                    # Remove $ sign, replace , with . for decimal casting
                    clean_str = str(val).replace('$', '').replace('.', '').replace(',', '.').strip()
                    try:
                        return Decimal(clean_str)
                    except:
                        return Decimal('0.00')

                parsed_sale_price = clean_money(sale_price_val)
                parsed_purchase_price = clean_money(purchase_price_val)
                
            except Exception:
                raise ValueError("Formato numérico inválido en cantidad o precios (costo_proveedor, precio_total).")

            # Core business rule: profit calculation
            profit_val = parsed_sale_price - (parsed_purchase_price * parsed_quantity)
            
            new_sale = models.Sale(
                sale_date=parsed_date,
                product_name=str(product_name_val).strip(),
                quantity=parsed_quantity,
                purchase_price=parsed_purchase_price,
                sale_price=parsed_sale_price,
                profit=profit_val,
                seller=str(seller_val).strip() if pd.notna(seller_val) else None,
                source='csv',
                external_id=str(external_id_val).strip() if pd.notna(external_id_val) else f"CSV-MISSING-ID-{uuid.uuid4()}"
            )
            
            db.add(new_sale)
            db.commit()
            total_imported += 1
            
        except IntegrityError:
            db.rollback()
            # This is IDEMPOTENCY: We legitimately wanted to insert, but it's a known duplicate external_id.
            # We silently ignore it instead of treating it as a critical error.
            total_ignored += 1
        except ValueError as ve:
            db.rollback()
            total_errors += 1
            error_details.append(schemas.ErrorDetail(fila=index + 2, error=str(ve)))
        except Exception as e:
            db.rollback()
            total_errors += 1
            error_details.append(schemas.ErrorDetail(fila=index + 2, error=f"Error inesperado: {str(e)}"))

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
    
    profit_val = sale.sale_price - (sale.purchase_price * sale.quantity)
    
    db_sale.sale_date = sale.sale_date
    db_sale.product_name = sale.product_name
    db_sale.quantity = sale.quantity
    db_sale.purchase_price = sale.purchase_price
    db_sale.sale_price = sale.sale_price
    db_sale.seller = sale.seller
    db_sale.profit = profit_val
    
    db.commit()
    db.refresh(db_sale)
    return db_sale

@app.delete('/api/sales/{sale_id}')
def delete_sale(sale_id: int, db: Session = Depends(get_db)):
    db_sale = db.query(models.Sale).filter(models.Sale.id == sale_id).first()
    if not db_sale:
        raise HTTPException(status_code=404, detail='Venta no encontrada')
    
    db.delete(db_sale)
    db.commit()
    return {'message': 'Venta eliminada exitosamente'}

