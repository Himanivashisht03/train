
from flask import Flask, jsonify
from flask_cors import CORS
import random

app = Flask(__name__)
CORS(app)

# Mock trains data
def generate_trains(n=10):
    types = ["Express", "Passenger", "Freight"]
    origins = ["SBC", "MAS", "NDLS", "BPL", "KGP"]
    destinations = ["BLR", "CHN", "MUM", "LKO", "HYD"]

    trains = []
    for i in range(n):
        t = {
            "id": str(1000+i),
            "type": types[i % 3],
            "pos": round(random.random() * 100, 2),
            "speed": round(0.5 + random.random() * 1.5, 2),
            "origin": random.choice(origins),
            "dest": random.choice(destinations),
            "priority": (i % 3) + 1,
            "delay": random.randint(0, 15)
        }
        trains.append(t)
    return trains

@app.route("/api/trains")
def api_trains():
    return jsonify(generate_trains(10))

if __name__ == "__main__":
    app.run(debug=True)

