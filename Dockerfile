FROM python:3.11-slim

# Install OpenJDK 17
RUN apt-get update -o Acquire::Retries=3 && \
    apt-get install -y --no-install-recommends default-jdk-headless && \
    apt-get clean && \
    rm -rf /var/lib/apt/lists/*

# Set Java environment
ENV JAVA_HOME=/usr/lib/jvm/default-java
ENV PATH=$PATH:$JAVA_HOME/bin

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy all project files
COPY . .

# Create static folder and move frontend files
RUN mkdir -p static && \
    cp index.html static/ && \
    cp styles.css static/ && \
    cp app.js static/ && \
    cp file-manager.js static/ && \
    cp manifest.json static/ && \
    cp logo.jpeg static/ || true

# Create temp directory
RUN mkdir -p temp

EXPOSE 5000

CMD ["gunicorn", "--bind", "0.0.0.0:5000", "--workers", "2", "--timeout", "30", "app:app"]
