#!/bin/bash
set -e

# Installe wget si besoin
apt-get update && apt-get install -y wget

# Télécharge et installe Piper Linux
wget https://github.com/rhasspy/piper/releases/download/2023.11.14-2/piper_linux_x86_64.tar.gz

tar -xzf piper_linux_x86_64.tar.gz
mv piper /app/piper
