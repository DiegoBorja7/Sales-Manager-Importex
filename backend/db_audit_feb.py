
import sqlite3
import pandas as pd

try:
    conn = sqlite3.connect('sales_manager.db')
    
    # 1. Total sales accounted in Feb 2026 (CSV)
    query_sales = """
    SELECT 
        product_name, 
        SUM(quantity) as qty,
        SUM(sale_price) as ventas, 
        SUM(purchase_price) as proveedor,
        SUM(shipping_cost) as logistica,
        COUNT(*) as rows
    FROM sales 
    WHERE strftime('%Y-%m', sale_date) = '2026-02' AND source = 'csv'
    GROUP BY product_name
    """
    df_sales = pd.read_sql_query(query_sales, conn)
    print("--- DB SALES (ENTREGADO) FEB 2026 ---")
    print(df_sales.to_string())
    
    # 2. Total returns accounted in Feb 2026 (CSV)
    query_returns = """
    SELECT 
        product_name, 
        SUM(quantity) as qty,
        SUM(gross_sale_amount) as g_sales, 
        SUM(provider_cost_amount) as g_prov,
        SUM(shipping_cost_amount) as g_log,
        SUM(return_cost) as ret_cost,
        COUNT(*) as rows
    FROM sale_returns
    WHERE strftime('%Y-%m', return_date) = '2026-02' AND source = 'csv'
    GROUP BY product_name
    """
    df_returns = pd.read_sql_query(query_returns, conn)
    print("\n--- DB RETURNS (DEVOLUCION) FEB 2026 ---")
    print(df_returns.to_string())
    
    # 3. Check for any FilmPro in March that has a February date? Or viceversa.
    query_cross = "SELECT external_id, sale_date, product_name FROM sales WHERE product_name LIKE '%FilmPro%' AND (strftime('%Y-%m', sale_date) = '2026-03')"
    df_cross = pd.read_sql_query(query_cross, conn)
    if not df_cross.empty:
        print("\n--- FilmPro rows in MARCH DB ---")
        print(df_cross.head().to_string())

    conn.close()
except Exception as e:
    print(f"Error: {e}")
