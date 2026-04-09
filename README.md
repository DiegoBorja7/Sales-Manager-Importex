# Importex MVP - Gestor de Ventas y Análisis de Utilidades

Importex MVP es una plataforma web (Single Page Application) diseñada para centralizar, gestionar y analizar la rentabilidad de las ventas. El sistema procesa grandes volúmenes de datos mediante importación de archivos CSV heredados y permite ingresos manuales, proveyendo un tablero de control reactivo y cálculos de ganancias automáticos.

## 🚀 Características Principales

- **Dashboard Analítico**: Tarjetas de rendimiento (KPIs) en tiempo real incluyendo ingresos totales, ganancias netas y volumen de mercancía entregada.
- **Motor de Importación CSV Tolerante a Fallos**: Limpieza automática de encabezados, estandarización de fechas y omisión de registros corruptos o incompletos, priorizando la integridad de la base de datos.
- **Registro Manual**: Formulario de ingreso de datos financieros con validación estricta y cálculo de utilidad automática.
- **Filtro y Búsqueda Inteligente**: Búsqueda instantánea en la tabla por nombre de asesor o producto.
- **Arquitectura Escalable**: Frontend y Backend completamente desacoplados con base de datos en la nube (PostgreSQL Serverless).

## 🛠️ Stack Tecnológico

**Frontend:**
- [React 19](https://react.dev/)
- [Vite](https://vitejs.dev/) (Build tool)
- [Tailwind CSS v4](https://tailwindcss.com/) (Estilos UI estilo Glassmorphism)
- [Axios](https://axios-http.com/) (Cliente HTTP)
- [Lucide React](https://lucide.dev/) (Iconografía)
- [React Hot Toast](https://react-hot-toast.com/) (Alertas no intrusivas)

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) (Framework web de alto rendimiento)
- [Python 3.10+](https://www.python.org/)
- [SQLAlchemy](https://www.sqlalchemy.org/) (ORM)
- [Pydantic](https://docs.pydantic.dev/) (Validación de esquemas)
- [Pandas](https://pandas.pydata.org/) (Procesamiento y limpieza de datos CSV)

**Base de Datos:**
- [PostgreSQL](https://www.postgresql.org/) (Alojado en Neon Tech - Serverless)

## 📁 Estructura del Proyecto

```bash
importex-sales-manager/
├── backend/                  # API FastAPI
│   ├── main.py               # Endpoints REST y Middleware CORS
│   ├── database.py           # Conexión al motor PostgreSQL (Neon)
│   ├── models.py             # Modelos declarativos SQLAlchemy
│   ├── schemas.py            # Esquemas de entrada y salida Pydantic
│   ├── requirements.txt      # Dependencias de Python
│   └── tests/                # Futuros tests unitarios
│
└── frontend/                 # Aplicación SPA React
    ├── public/               # Assets estáticos
    ├── src/
    │   ├── components/       # Componentes reusables (Tabla, Formularios)
    │   ├── pages/            # Vistas principales (SalesPage)
    │   ├── services/         # Integración API (Axios calls)
    │   ├── App.jsx           # Componente Raíz / Layout
    │   ├── main.jsx          # Punto de entrada de React
    │   └── index.css         # Directivas globales Tailwind v4
    ├── package.json          # Dependencias Node
    └── vite.config.js        # Configuración del bundler y Tailwind plugin
```

## ⚙️ Configuración y Ejecución Local

Para correr el proyecto en ambiente de desarrollo, necesitas ejecutar tanto el servidor Backend como el servidor de desarrollo del Frontend en terminales separadas.

### 1. Variables de Entorno

**Backend** (`backend/.env`):
Crea un archivo `.env` en la carpeta `backend/` e incluye el string de conexión de tu base de datos Neon:
```env
SQLALCHEMY_DATABASE_URL=postgresql://usuario:contraseña@servidor.neon.tech/nombreBD?sslmode=require
```

**Frontend** (`frontend/.env`):
Crea un archivo `.env` en la carpeta `frontend/` y apunta a tu servidor local de FastAPI:
```env
VITE_API_URL=http://127.0.0.1:8000
```

### 2. Iniciar el Backend (FastAPI)

```bash
cd backend

# Crear entorno virtual
python -m venv venv

# Activar entorno (Windows)
.\venv\Scripts\activate
# Activar entorno (Mac/Linux)
# source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar servidor de desarrollo en el puerto 8000
uvicorn main:app --reload
```
Documentación interactiva disponible en: `http://127.0.0.1:8000/docs`

### 3. Iniciar el Frontend (React)

```bash
cd frontend

# Instalar dependencias
npm install

# Correr en servidor de desarrollo Vite (usualmente en puerto 5173 o 5174)
npm run dev
```
Abre en tu navegador la dirección indicada en la consola (Ej. `http://localhost:5173/`).

## 🌐 Despliegue en Producción

### Frontend (Vercel)
1. Conecta tu repositorio a Vercel.
2. Configura las variables de entorno en el dashboard de Vercel:
   - `VITE_API_URL`: La URL de tu backend desplegado (ej. `https://api.tuapp.com`).
3. El archivo `vercel.json` ya está configurado para manejar las rutas de React.

### Backend (Render / Railway / Koyeb)
1. El backend incluye un `Procfile` para despliegues automatizados.
2. Asegúrate de configurar las variables de entorno:
   - `DATABASE_URL`: Tu string de conexión de Neon Postgres.
   - `ALLOWED_ORIGINS`: Una lista separada por comas de los orígenes permitidos (ej. `https://tuapp.vercel.app`).
   - `PORT`: El puerto (usualmente manejado automáticamente por la plataforma).
3. Comando de inicio sugerido: `gunicorn -w 4 -k uvicorn.workers.UvicornWorker main:app --bind 0.0.0.0:$PORT`

---

**Nota de Seguridad:** En producción, asegúrate de que `DATABASE_URL` sea privada y que el CORS esté restringido únicamente a tus dominios reales.

