dev:
	bun dev

deploy:
	bun build:electron
	open release/mac-arm64/Flowy.app