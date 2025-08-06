# Build extension for Chrome Web Store
zip:
	zip -r jupyter-notebook-viewer.zip . \
		-x "*.DS_Store" \
		-x "node_modules/*" \
		-x ".git/*" \
		-x ".idea/*" \
		-x "test/*" \
		-x "*.test.json" \
		-x "package-lock.json" \
		-x ".gitignore" \
		-x ".gitmodules" \
		-x "Makefile"

# Clean build artifacts
clean:
	rm -f jupyter-notebook-viewer.zip
	rm -rf node_modules/.cache

# Install dependencies
install:
	npm install

# Run tests
test:
	npm test

# Build all components
build: build-mdc build-prism build-remark build-themes

build-mdc:
	npm run build:mdc

build-prism:
	npm run build:prism

build-remark:
	npm run build:remark

build-themes:
	npm run build:themes

# Development workflow
dev: install build

# Package for store submission
package: clean build zip

.PHONY: zip clean install test build build-mdc build-prism build-remark build-themes dev package
