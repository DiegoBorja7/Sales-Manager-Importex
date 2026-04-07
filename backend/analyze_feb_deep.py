
import pandas as pd
from decimal import Decimal
import os

def clean_money(val):
    if pd.isna(val) or str(val).strip() == '' or str(val).strip().upper() in ('N/A', 'NAN', ''):
        return Decimal('0.00')
    s = str(val).replace('$', '').replace(' ', '').strip()
    if ',' in s and '.' in s:
        if s.find('.') < s.find(','): # 1.234,56
            s = s.replace('.', '').replace(',', '.')
        else: # 1,234.56
            s = s.replace(',', '')
    elif ',' in s: # 1234,56
        s = s.replace(',', '.')
    try:
        return Decimal(s)
    except:
        return Decimal('0.00')

csv_path = r'c:\Users\Diego\OneDrive\Importex\Sales-Manager-Importex\files\IMPORTEX - PEDIDOS 2026  - FEBRERO.csv'
df = pd.read_csv(csv_path, encoding='utf-8-sig', dtype=str)
df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.normalize('NFKD').str.encode('ascii', errors='ignore').str.decode('utf-8').str.rstrip('_')

# Filter logic matching backend
entregado = df[df['estado'].str.upper().str.strip() == 'ENTREGADO'].copy()
print(f"--- ENTREGADOS (Sales Accounted) ---")
print(f"Count: {len(entregado)}")
v_total = sum(entregado['precio_total'].apply(clean_money))
p_total = sum(entregado['costo_provedor'].apply(clean_money))
l_total = sum(entregado['cstenvio'].apply(clean_money))
print(f"Ventas (Total): {v_total}")
print(f"Proveedor (Total): {p_total}")
print(f"Logistica (Total): {l_total}")

# Returns logic matching backend (CST DEV > 0)
returns = df[df['cst_dev'].apply(clean_money) > 0].copy()
print(f"\n--- RETURNS (Return Lane: CST DEV > 0) ---")
print(f"Count: {len(returns)}")
# The backend adds these to the totals in the summary query!
r_sales = sum(returns['precio_total'].apply(clean_money))
r_prov = sum(returns['costo_provedor'].apply(clean_money))
r_log = sum(returns['cstenvio'].apply(clean_money))
r_cost = sum(returns['cst_dev'].apply(clean_money))
print(f"Return Gross Sales: {r_sales}")
print(f"Return Provider Cost: {r_prov}")
print(f"Return Shipping Cost: {r_log}")
print(f"Return Cost (CST DEV): {r_cost}")

print(f"\n--- DASHBOARD EXPECTED TOTALS (If backend logic used) ---")
print(f"Dashboard Ventas: {v_total + r_sales}")
print(f"Dashboard Proveedor: {p_total + r_prov}")
print(f"Dashboard Logistica: {l_total + r_log}")
print(f"Dashboard Devolucion: {r_cost}")

print(f"\n--- PM EXCEL REFERENCE (February) ---")
print(f"Excel Ventas: 9501.47")
print(f"Excel Proveedor: 2371.1")
print(f"Excel Logistica: 2236.87")
print(f"Excel Devolucion: 645.54")

print(f"\n--- PRODUCT: FilmPro Analysis ---")
fp_ent = entregado[entregado['producto'].str.contains('FilmPro', case=False, na=False)]
fp_ret = returns[returns['producto'].str.contains('FilmPro', case=False, na=False)]
v_fp = sum(fp_ent['precio_total'].apply(clean_money))
v_fp_ret = sum(fp_ret['precio_total'].apply(clean_money))
print(f"FilmPro Entregado Ventas: {v_fp}")
print(f"FilmPro Return Ventas: {v_fp_ret}")
print(f"FilmPro Dashboard Total Ventas: {v_fp + v_fp_ret}")
