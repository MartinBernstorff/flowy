dev:
	bun dev

deploy:
	rm -rf release
	bun build:electron
	killall "Flowy" || true
	rm -rf /Applications/Flowy.app || true
	cp -R release/mac-arm64/Flowy.app /Applications/Flowy.app
	sleep 1 && open -a /Applications/Flowy.app