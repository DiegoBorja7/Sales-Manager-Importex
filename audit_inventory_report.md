# 📊 Auditoría Total y Roadmap: Módulo de Inventario (Importex)

Este documento es el resultado de la auditoría técnica Full-Stack (Database, Backend, Frontend) realizada al módulo de Inventario. Detalla las vulnerabilidades, omisiones operativas y los pasos exactos para evolucionar el sistema hacia un estándar ERP profesional.

Ocupa este archivo como tu **Checklist Maestro** para las siguientes fases de desarrollo.

---

## ✅ FASE 1: Sistema de Kardex (COMPLETADO)
*El problema de trazabilidad y ajustes ciegos de stock ha sido mitigado.*

- [x] **DB:** Crear tabla `stock_movements` vinculada a `products`.
- [x] **Backend:** Endpoint `PUT /api/products/{id}/stock` exige ahora una cantidad exacta y una razón estricta (concepto).
- [x] **Backend:** Endpoint `GET /api/products/{id}/movements` para leer el historial.
- [x] **Frontend:** Modal de Ajuste de Stock rediseñado (Añadir/Descontar) con menú desplegable de razones validadas.
- [x] **Frontend:** Botón visor (ícono de Historial) para consultar la bitácora inmutable por cada producto.

---

## ⏳ FASE 2: Integridad y Seguridad de Base de Datos (PENDIENTE)

### 1. Constraints de Stock No Negativo
- [ ] **DB / Migración:** Ejecutar una migración SQL que añada una restricción a nivel de motor de base de datos (`ALTER TABLE products ADD CONSTRAINT stock_non_negative CHECK (stock >= 0);`). 
- **Razón:** Actualmente es posible que el cálculo o un error humano baje el stock a números negativos. Postgres debe rechazar matemáticamente cualquier transacción que resulte en stock menor a 0.

### 2. Bloqueo de Eliminación de Productos con Kardex
- [ ] **Backend (`main.py`):** Modificar `delete_product` para que verifique si el producto tiene historial en `stock_movements`.
- **Razón:** Si un administrador borra por accidente un producto físico, los registros del Kardex desaparecerán (por el CASCADE). Se debe impedir la eliminación si el producto tuvo movimientos, sugiriendo en su lugar un "Soft Delete" (Archivar / Ocultar producto).

---

## ⏳ FASE 3: Exportación Contable y Reportes (PENDIENTE)

### 1. Exportación a Excel (.xlsx) / CSV
- [ ] **Frontend (`InventoryPage.jsx`):** Añadir un botón "Exportar Catálogo".
- [ ] **Lógica:** Implementar la librería `xlsx` (o generar Blob CSV nativo) para descargar la tabla de productos actuales (con sus respectivos % de margen y valor de costo) directo a un archivo Excel.
- **Razón:** Requisito indispensable para revisiones contables, cierres de mes físicos y respaldos del administrador.

### 2. Exportación del Resumen Financiero
- [ ] **Frontend (`MonthlySummaryPage.jsx`):** Añadir exportación Excel para todo el dashboard de ingresos, egresos y utilidades.

---

## ⏳ FASE 4: Filtros de Tiempo y Búsqueda Avanzada (PENDIENTE)

### 1. Date-Picker en Dashboard Financiero
- [ ] **Frontend & Backend:** Implementar selectores de Fecha Inicio y Fecha Fin.
- **Razón:** El "Resumen Mensual" eventualmente colapsará cuando tengas años de información. Se requiere poder filtrar "Ver ganancias de Enero 1 a Marzo 31".

### 2. Filtros de Kardex por Fechas
- [ ] **Frontend (`InventoryPage.jsx`):** En el modal del Historial de Movimientos, añadir un pequeño filtro por fechas para búsquedas rápidas cuando la bitácora supere los 100 movimientos.

---

## ⏳ FASE 5: Autenticación y Despliegue (PENDIENTE)

### 1. Login Básico y Roles
- [ ] **Backend & Frontend:** Crear tabla `users` y un sistema de inicio de sesión básico (JWT Token).
- **Razón:** La aplicación es accesible para cualquiera con el link. Se necesita un control de acceso para proteger la modificación de precios, inserción de gastos y visualización de utilidades. Se puede dividir en roles: `Admin` (ve todo) y `Vendedor` (solo puede descontar stock por ventas).

### 2. Configuración de PWA y Hosting (Deploy final)
- [ ] **Frontend (`vercel.json` / `_redirects`):** Configurar el enrutador de React (`react-router-dom`) para que soporte urls directas en producción y funcione como aplicación móvil (PWA).
