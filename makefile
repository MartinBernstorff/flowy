dev:
	bun dev

deploy:
	rm -rf release
	killall "Flowy" || true
	bun build:electron
	rm -rf /Applications/Flowy.app || true
	cp -R release/mac-arm64/Flowy.app /Applications/Flowy.app
	open -a /Applications/Flowy.app

validate:
	bun tsc
	bun lint

publish:
	npm install
	