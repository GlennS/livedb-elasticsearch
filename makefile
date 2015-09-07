.PHONY: build;

build: npm;

npm: ; npm install;

test: ; node test.js | tap-spec;
