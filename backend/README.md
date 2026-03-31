# Backend Structure

This backend is organized to keep runtime code clean and maintenance utilities separated.

## Runtime (`backend/`)

- `main.py`: FastAPI app and endpoints.
- `database.py`: SQLAlchemy engine/session setup.
- `models.py`: ORM models.
- `schemas.py`: Pydantic schemas.
- `requirements.txt`: Python dependencies.

## Migrations (`backend/migrations/`)

- SQL migration history and migration scripts.
- Run these scripts only when applying schema/data transitions.

## Utility Scripts (`backend/scripts/`)

- `diagnostics/`: read-only verification and data audits.
- `maintenance/`: data-fix scripts with write operations.
- `tests/`: manual smoke tests against running API.

## Notes

- Scripts in `migrations/` and `scripts/` auto-resolve the backend root path, so they can be run from repository root.
- Temporary outputs and one-off scratch files were removed to reduce noise.
