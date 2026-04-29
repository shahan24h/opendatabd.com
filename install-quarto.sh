#!/bin/bash
set -e

QUARTO_VERSION="1.5.57"
curl -L -o quarto.tar.gz "https://github.com/quarto-dev/quarto-cli/releases/download/v${QUARTO_VERSION}/quarto-${QUARTO_VERSION}-linux-amd64.tar.gz"
mkdir -p "$HOME/opt"
tar -xzf quarto.tar.gz -C "$HOME/opt/"
mv "$HOME/opt/quarto-${QUARTO_VERSION}" "$HOME/opt/quarto"
export PATH="$HOME/opt/quarto/bin:$PATH"
quarto --version