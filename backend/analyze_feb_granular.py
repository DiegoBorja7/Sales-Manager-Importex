
import pandas as pd
from decimal import Decimal

def clean_money(val):
    if pd.isna(val) or str(val).strip() == '' or str(val).strip().upper() in ('N/A', 'NAN', ''):
        return Decimal('0.00')
    s = str(val).replace('$', '').replace(' ', '').strip()
    if ',' in s and '.' in s:
        if s.find('.') < s.find(','): s = s.replace('.', '').replace(',', '.')
        else: s = s.replace(',', '')
    elif ',' in s: s = s.replace(',', '.')
    try: return Decimal(s)
    except: return Decimal('0.00')

csv_path = r'c:\Users\Diego\OneDrive\Importex\Sales-Manager-Importex\files\IMPORTEX - PEDIDOS 2026  - FEBRERO.csv'
df = pd.read_csv(csv_path, encoding='utf-8-sig', dtype=str)
df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.normalize('NFKD').str.encode('ascii', errors='ignore').str.decode('utf-8').str.rstrip('_')

print(f"Total Rows in CSV: {len(df)}")

# Analysis for FilmPro
fp = df[df['producto'].str.contains('FilmPro', case=False, na=False)].copy()
print(f"\n--- FILM PRO DETAIL ---")
print(f"Total FilmPro Rows: {len(fp)}")

fp_ent = fp[fp['estado'].str.upper().str.strip() == 'ENTREGADO']
print(f"Entregados: {len(fp_ent)}")
print(f"  Ventas: {sum(fp_ent['precio_total'].apply(clean_money))}")
print(f"  Logistica: {sum(fp_ent['cstenvio'].apply(clean_money))}")
print(f"  Proveedor: {sum(fp_ent['costo_provedor'].apply(clean_money))}")

fp_ret = fp[fp['cst_dev'].apply(clean_money) > 0]
print(f"With Return Cost (CST DEV > 0): {len(fp_ret)}")
print(f"  Estado values: {fp_ret['estado'].unique()}")
print(f"  Sum CST DEV: {sum(fp_ret['cst_dev'].apply(clean_money))}")

# Let's check status count for all
print(f"\n--- ALL STATUS COUNTS ---")
print(df['estado'].str.upper().str.strip().value_counts())

# Check for duplicates in # PEDIDO
if '#_pedido' in df.columns:
    dupes = df[df.duplicated(['#_pedido'], keep=False)]
    if not dupes.empty:
        print(f"\n--- DUPLICATE PEDIDO IDs FOUND: {len(dupes)} rows ---")
        # Just show some
        # print(dupes.sort_values('#_pedido').head(10)[['#_pedido', 'estado', 'producto']])
else:
    print("\nColumn #_pedido not found for duplicate check.")
