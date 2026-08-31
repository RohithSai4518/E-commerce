.PHONY: all start test build run clean

all: start

start:
	node server/app.js

test:
	node server/tests/suite.test.js

build:
	node server/app.js

clean:
	rm -f data/store.wal
