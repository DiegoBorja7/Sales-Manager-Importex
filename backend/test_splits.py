import os
import requests
import json
from decimal import Decimal

# Test URL
URL = "http://127.0.0.1:8000/api/sales/manual"

# 1. First find a valid product ID
PRODUCTS_URL = "http://127.0.0.1:8000/api/products?page=1&limit=1"
try:
    p_res = requests.get(PRODUCTS_URL)
    product = p_res.json()['data'][0]
    pid = product['id']
    pprice = float(product['purchase_price'])
    # We'll set a sale price that yields exactly $100 profit for easy verification
    # Profit = SalePrice - (PurchasePrice * Qty)
    # 100 = SalePrice - (pprice * 1)
    # SalePrice = 100 + pprice
    test_sale_price = 100.0 + pprice
    
    payload = {
        "sale_date": "2026-03-30",
        "product_id": pid,
        "quantity": 1,
        "purchase_price": pprice,
        "sale_price": test_sale_price,
        "seller": "Mago Test",
        "payment_method": "Efectivo",
        "is_invoiced": True
    }
    
    print(f"Enviando venta de prueba para producto ID {pid}...")
    res = requests.post(URL, json=payload)
    
    if res.status_code == 200:
        data = res.json()
        print("--- Venta Creada con Éxito ---")
        print(f"Profit Calculado: {data.get('profit')}")
        print(f"Split Vendedor (40%): {data.get('split_seller')}")
        print(f"Split Local (25%): {data.get('split_local')}")
        print(f"Split App (25%): {data.get('split_app')}")
        print(f"Split Dev (5%): {data.get('split_dev')}")
        print(f"Split Empresa (5%): {data.get('split_company')}")
        
        # Verify
        if float(data['split_seller']) == 40.0:
            print("✅ VERIFICACIÓN EXITOSA: Los porcentajes coinciden.")
        else:
            print("❌ ERROR: Los porcentajes no coinciden.")
    else:
        print(f"Error en creación: {res.status_code}")
        print(res.text)

except Exception as e:
    print(f"Error en el test: {str(e)}")
