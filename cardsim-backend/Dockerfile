FROM golang:1.24-alpine AS builder

WORKDIR /app
COPY cardsim-backend/go.mod cardsim-backend/go.sum ./cardsim-backend/
WORKDIR /app/cardsim-backend
ENV GOTOOLCHAIN=auto
RUN go mod download

WORKDIR /app
COPY cardsim-backend/ ./cardsim-backend/
WORKDIR /app/cardsim-backend
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o cardsim-server .

FROM alpine:latest
WORKDIR /app/cardsim-backend
COPY --from=builder /app/cardsim-backend/cardsim-server .
# Set permissions and create data volume mount point
RUN chmod +x ./cardsim-server

EXPOSE 8080
CMD ["./cardsim-server"]
