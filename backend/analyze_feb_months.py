
import pandas as pd
from decimal import Decimal

df = pd.read_csv(r'c:\Users\Diego\OneDrive\Importex\Sales-Manager-Importex\files\IMPORTEX - PEDIDOS 2026  - FEBRERO.csv', encoding='utf-8-sig', dtype=str)
df.columns = df.columns.str.strip().str.lower().str.replace(' ', '_').str.normalize('NFKD').str.encode('ascii', errors='ignore').str.decode('utf-8').str.rstrip('_')

def clean_money(val):
    if pd.isna(val) or str(val).strip() == '' or str(val).strip().upper() in ('N/A', 'NAN', ''):
        return Decimal('0.00')
    s = str(val).replace('$', '').replace(' ', '').strip().replace(',','.')
    try: return Decimal(s)
    except: return Decimal('0.00')

df['parsed_date'] = pd.to_datetime(df['fecha'], dayfirst=True, errors='coerce')
fp = df[df['producto'].str.contains('FilmPro', case=False, na=False)].copy()

print(f"FilmPro row count: {len(fp)}")
print("\n--- Distribution by Month in FEBRERO.csv (FilmPro) ---")
print(fp['parsed_date'].dt.month.value_counts())

print("\n--- Rows with Month 3 in FEBRERO.csv ---")
march_rows = fp[fp['parsed_date'].dt.month == 3]
print(march_rows[['fecha', 'estado', 'precio_total', 'cst_dev']])

print("\n--- Returns (CST DEV > 0) in FEBRERO.csv by Month ---")
rets = fp[fp['cst_dev'].apply(clean_money) > 0].copy()
rets['month'] = rets['parsed_date'].dt.month
print(rets.groupby('month')['cst_dev'].apply(lambda x: sum(x.apply(clean_money))))
