#!/bin/bash

echo "Starting JMX Geek Manager Backend..."
cd jmx-backend

# Use custom settings if available to avoid Maven central issues
if [ -f "custom-settings.xml" ]; then
    echo "Using custom-settings.xml for Maven..."
    ./mvnw spring-boot:run -s custom-settings.xml
else
    ./mvnw spring-boot:run
fi
