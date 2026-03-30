import pandas as pd
file_path = r'IMPORTEX - PEDIDOS 2026 .xlsx'
sheet_name = 'DATOS MENSUALES'
df = pd.read_excel(file_path, sheet_name=sheet_name, header=None)

print(f'\n--- ESTRUCTURA DE {sheet_name} ---')
print(f'Filas: {len(df)}, Columnas: {len(df.columns)}')
for i, row in df.head(30).iterrows():
    print(f'Fila {i}:', [str(x) for x in row.values[:30]])
