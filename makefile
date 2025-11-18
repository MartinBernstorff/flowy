dev:
	bun dev

deploy:
	bun build:electron
	cp -R release/mac-arm64/Flowy.app /Applications/Flowy.app
	killall "Flowy" || true && sleep 1 && open -a /Applications/Flowy.app