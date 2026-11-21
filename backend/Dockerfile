FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Production server (gunicorn) instead of Flask's debug server.
# One worker with several threads: a database connection must not be shared between
# worker processes (that caused random "PGRES_TUPLES_OK" errors), and the tables and
# catalog are then set up by a single process only.
CMD ["gunicorn", "--workers", "1", "--threads", "8", "--timeout", "60", "--bind", "0.0.0.0:5000", "--access-logfile", "-", "wsgi:app"]
