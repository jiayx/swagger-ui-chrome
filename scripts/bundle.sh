#!/usr/bin/env bash

# Chrome Extension Bundle Script
# This script packages the Chrome extension into a zip file for distribution

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the directory where this script is located
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
EXTENSION_NAME="swagger-ui-chrome"
OUTPUT_DIR="$PROJECT_ROOT/dist"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

# Read version from manifest.json
VERSION=$(python3 -c "import json; print(json.load(open('$PROJECT_ROOT/manifest.json'))['version'])" 2>/dev/null || \
         awk -F'"' '/$1.*version/ {print $4}' "$PROJECT_ROOT/manifest.json" | head -1)

if [ -z "$VERSION" ]; then
    echo -e "${RED}Error: Could not read version from manifest.json${NC}"
    exit 1
fi

# Output file name
OUTPUT_FILE="${EXTENSION_NAME}-v${VERSION}.zip"
OUTPUT_PATH="$OUTPUT_DIR/$OUTPUT_FILE"

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}Chrome Extension Bundler${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Extension: ${YELLOW}$EXTENSION_NAME${NC}"
echo -e "Version: ${YELLOW}$VERSION${NC}"
echo -e "Output: ${YELLOW}$OUTPUT_FILE${NC}"
echo ""

# Create output directory if it doesn't exist
echo -e "${GREEN}Creating output directory...${NC}"
mkdir -p "$OUTPUT_DIR"

# Create temporary directory for staging
TEMP_DIR=$(mktemp -d)
echo -e "${GREEN}Using temporary directory: $TEMP_DIR${NC}"

# Function to clean up temporary directory
cleanup() {
    echo -e "${GREEN}Cleaning up temporary files...${NC}"
    rm -rf "$TEMP_DIR"
}

# Set up cleanup on exit
trap cleanup EXIT

# Copy files to temporary directory, excluding unwanted files
echo -e "${GREEN}Copying extension files...${NC}"

# List of files and directories to include
INCLUDE_ITEMS=(
    "manifest.json"
    "LICENSE"
    "_locales"
    "src"
    "swagger-ui"
)

# Copy included items
for item in "${INCLUDE_ITEMS[@]}"; do
    if [ -e "$PROJECT_ROOT/$item" ]; then
        echo "  - Including: $item"
        cp -R "$PROJECT_ROOT/$item" "$TEMP_DIR/"
    else
        echo -e "  ${YELLOW}- Skipping (not found): $item${NC}"
    fi
done

# Clean up any unnecessary files that might have been copied
echo -e "${GREEN}Cleaning up unnecessary files...${NC}"

# Remove .DS_Store files (macOS)
find "$TEMP_DIR" -name ".DS_Store" -type f -delete 2>/dev/null || true

# Remove any .git directories
find "$TEMP_DIR" -name ".git" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove any node_modules directories
find "$TEMP_DIR" -name "node_modules" -type d -exec rm -rf {} + 2>/dev/null || true

# Remove any test files
find "$TEMP_DIR" -name "*.test.js" -type f -delete 2>/dev/null || true
find "$TEMP_DIR" -name "*.spec.js" -type f -delete 2>/dev/null || true

# Remove source map files if any
find "$TEMP_DIR" -name "*.map" -type f -delete 2>/dev/null || true

# Create the zip file
echo -e "${GREEN}Creating zip archive...${NC}"
cd "$TEMP_DIR"

# Check if output file already exists
if [ -f "$OUTPUT_PATH" ]; then
    echo -e "${YELLOW}Warning: Output file already exists and will be overwritten${NC}"
    rm -f "$OUTPUT_PATH"
fi

# Create zip with maximum compression
zip -r -9 -q "$OUTPUT_PATH" .

# Get file size
FILE_SIZE=$(du -h "$OUTPUT_PATH" | cut -f1)

# Verify the zip file
echo -e "${GREEN}Verifying zip archive...${NC}"
if unzip -t "$OUTPUT_PATH" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Zip file is valid${NC}"
else
    echo -e "${RED}✗ Zip file validation failed${NC}"
    exit 1
fi

# List contents summary
echo ""
echo -e "${GREEN}Archive contents summary:${NC}"
unzip -l "$OUTPUT_PATH" | tail -n 1

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}✓ Bundle created successfully!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo -e "Output file: ${YELLOW}$OUTPUT_PATH${NC}"
echo -e "File size: ${YELLOW}$FILE_SIZE${NC}"
echo ""
echo -e "${GREEN}You can now:${NC}"
echo -e "  1. Upload this file to Chrome Web Store"
echo -e "  2. Share it for manual installation"
echo -e "  3. Test it by loading as unpacked extension"
echo ""

# Optional: Create a versioned copy with timestamp for backup
BACKUP_FILE="${EXTENSION_NAME}-v${VERSION}-${TIMESTAMP}.zip"
BACKUP_PATH="$OUTPUT_DIR/$BACKUP_FILE"

read -p "Create a timestamped backup copy? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    cp "$OUTPUT_PATH" "$BACKUP_PATH"
    echo -e "${GREEN}Backup created: ${YELLOW}$BACKUP_PATH${NC}"
fi
