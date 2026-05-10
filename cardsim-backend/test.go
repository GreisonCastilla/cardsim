package main

import (
	"encoding/json"
	"fmt"
)

func main() {
	raw := json.RawMessage(`{"a":1}`)
	m := map[string]interface{}{"payload": raw}
	out, _ := json.Marshal(m)
	fmt.Println(string(out))
}
