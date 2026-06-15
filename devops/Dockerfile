FROM oven/bun:1 AS builder
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --no-verify
COPY . .
RUN bun build --compile --outfile /app/debatable src/index.tsx

FROM gcr.io/distroless/cc-debian12
COPY --from=builder /app/debatable /usr/local/bin/debatable
ENTRYPOINT ["debatable"]
