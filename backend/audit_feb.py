import csv
import unicodedata
import pandas as pd

CSV_PATH = r'c:\Users\Diego\OneDrive\Importex\Sales-Manager-Importex\files\IMPORTEX - PEDIDOS 2026  - FEBRERO.csv'

with open(CSV_PATH, 'rb') as f:
    contents = f.read()

text = contents.decode('utf-8-sig', errors='replace')
lines = [line for line in text.splitlines() if line.strip()]

header_raw = next(csv.reader([lines[0]]))

def clean_col(c):
    c = str(c).strip().lower().replace(' ', '_')
    c = unicodedata.normalize('NFKD', c).encode('ascii', errors='ignore').decode('utf-8')
    return c.rstrip('_')

clean_header = [clean_col(c) for c in header_raw]

estado_idx = clean_header.index('estado')
fecha_idx  = clean_header.index('fecha')
pedido_idx = clean_header.index('#_pedido')
prod_idx   = clean_header.index('producto')
price_idx  = clean_header.index('precio_total')

all_estados = {}
rows_with_price = []

for i, line in enumerate(lines[1:], start=2):
    parsed = next(csv.reader([line]))
    if len(parsed) == 1 and ',' in parsed[0]:
        parsed = next(csv.reader([parsed[0]]))
    if len(parsed) < len(header_raw):
        parsed += [''] * (len(header_raw) - len(parsed))
    elif len(parsed) > len(header_raw):
        parsed = parsed[:len(header_raw)]

    estado = parsed[estado_idx].strip().upper()
    price_raw = parsed[price_idx].strip()
    price_str = price_raw.replace('$', '').replace(',', '.').strip()
    try:
        price_val = float(price_str)
    except Exception:
        price_val = 0.0

    all_estados[estado] = all_estados.get(estado, 0) + 1

    if price_val > 0:
        rows_with_price.append({
            'row': i,
            'estado': estado,
            'pedido': parsed[pedido_idx].strip(),
            'product': parsed[prod_idx].strip(),
            'price': price_val,
            'fecha': parsed[fecha_idx].strip(),
        })

print('Estado distribution:')
for k, v in sorted(all_estados.items(), key=lambda x: -x[1]):
    print(f'  {repr(k)}: {v}')

print('\n--- Rows WITH price > 0 by status ---')
by_status = {}
for r in rows_with_price:
    s = r['estado']
    if s not in by_status:
        by_status[s] = {'count': 0, 'total': 0.0}
    by_status[s]['count'] += 1
    by_status[s]['total'] += r['price']

for s, info in sorted(by_status.items(), key=lambda x: -x[1]['total']):
    print(f'  {repr(s)}: count={info["count"]}, total={info["total"]:.2f}')

print('\n--- NON-ENTREGADO rows WITH price (ignored by system) ---')
ignored_total = 0.0
ignored_count = 0
for r in rows_with_price:
    if r['estado'] != 'ENTREGADO':
        print(f'  Row {r["row"]}: [{r["estado"]}] pedido={r["pedido"]} prod={r["product"]} precio={r["price"]} fecha={r["fecha"]}')
        ignored_total += r['price']
        ignored_count += 1

entregado_total = sum(r['price'] for r in rows_with_price if r['estado'] == 'ENTREGADO')
print(f'\nTotal ignored: {ignored_count} rows, sum={ignored_total:.2f}')
print(f'Total ENTREGADO: {entregado_total:.2f}')
print(f'Grand total all with price: {entregado_total + ignored_total:.2f}')
print(f'\nExcel PM total: 9501.47')
print(f'Difference (Excel - ENTREGADO): {9501.47 - entregado_total:.2f}')
