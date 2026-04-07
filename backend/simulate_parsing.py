
import pandas as pd
from decimal import Decimal
import datetime

def clean_money(val):
    if pd.isna(val) or str(val).strip() == '' or str(val).strip().upper() in ('N/A', 'NAN', ''):
        return Decimal('0.00')
    s = str(val).replace('$', '').replace(' ', '').strip().replace(',','.')
    try: return Decimal(s)
    except: return Decimal('0.00')

df = pd.read_csv(r'c:\Users\Diego\OneDrive\Importex\Sales-Manager-Importex\files\IMPORTEX - PEDIDOS 2026  - FEBRERO.csv', encoding='utf-8-sig', dtype=str)
df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.normalize('NFKD').str.encode('ascii', errors='ignore').str.decode('utf-8').str.rstrip('_')

# Backend Aliases
mapped_columns = {
    'sale_date': 'fecha',
    'product_name': 'producto',
    'quantity': 'cantidad',
    'purchase_price': 'costo_provedor',
    'sale_price': 'precio_total',
    'estado': 'estado',
    'shipping_cost': 'cstenvio',
}

fp = df[df['producto'].str.contains('FilmPro', case=False, na=False)].copy()
entregado = fp[fp['estado'].str.upper().str.strip() == 'ENTREGADO'].copy()

print(f"FilmPro Entregados in CSV: {len(entregado)}")
print(f"Total CSV Sales Value: {sum(entregado['precio_total'].apply(clean_money))}")

rejections = []
for index, row in entregado.iterrows():
    row_num = index + 2
    try:
        sale_date_val = row.get(mapped_columns['sale_date'])
        product_name_val = row.get(mapped_columns['product_name'])
        quantity_val = row.get(mapped_columns['quantity'])
        
        if pd.isna(sale_date_val) or pd.isna(product_name_val) or pd.isna(quantity_val):
            raise ValueError("Faltan campos obligatorios")
            
        pd.to_datetime(sale_date_val, dayfirst=True).date()
        int(quantity_val)
        clean_money(row.get(mapped_columns['sale_price']))
        clean_money(row.get(mapped_columns['purchase_price']))
        
    except Exception as e:
        rejections.append((row_num, row.get('#_pedido'), str(e), row.get('precio_total')))

print(f"\n--- REJECTED ROWS ({len(rejections)}) ---")
for r in rejections:
    print(f"Fila {r[0]} | Pedido {r[1]} | Error: {r[2]} | Valor: {r[3]}")
