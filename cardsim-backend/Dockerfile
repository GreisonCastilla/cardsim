FROM golang:1.22-alpine AS builder

WORKDIR /app
COPY cardsim-backend/go.mod cardsim-backend/go.sum ./cardsim-backend/
WORKDIR /app/cardsim-backend
RUN go mod download

WORKDIR /app
COPY cardsim-backend/ ./cardsim-backend/
WORKDIR /app/cardsim-backend
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o server .

FROM alpine:latest
WORKDIR /app/cardsim-backend
COPY --from=builder /app/cardsim-backend/server .
# Set permissions and create data volume mount point
RUN chmod +x ./server

EXPOSE 8080
CMD ["./server"]
