FROM python:3.11-slim

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 5000

# Production server (gunicorn) instead of Flask's debug server.
# --preload starts the app once (tables and catalog are set up once), then the workers copy it.
CMD ["gunicorn", "--workers", "2", "--threads", "4", "--preload", "--timeout", "60", "--bind", "0.0.0.0:5000", "--access-logfile", "-", "wsgi:app"]
