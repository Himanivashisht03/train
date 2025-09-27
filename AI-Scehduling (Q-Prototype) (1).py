import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import random

# -----------------------------
# Train Definitions
# -----------------------------
trains_data = [
    {"id": 1, "name": "Rajdhani Express", "type": "Express", "origin": "Delhi", "destination": "Mumbai"},
    {"id": 2, "name": "Shatabdi Express", "type": "Express", "origin": "Delhi", "destination": "Bhopal"},
    {"id": 3, "name": "Duronto Express", "type": "Express", "origin": "Mumbai", "destination": "Kolkata"},
    {"id": 4, "name": "Garib Rath", "type": "Passenger", "origin": "Lucknow", "destination": "Delhi"},
    {"id": 5, "name": "Humsafar Express", "type": "Express", "origin": "Patna", "destination": "Delhi"},
    {"id": 6, "name": "Tejas Express", "type": "Express", "origin": "Delhi", "destination": "Lucknow"},
    {"id": 7, "name": "Sampark Kranti", "type": "Passenger", "origin": "Chandigarh", "destination": "Delhi"},
    {"id": 8, "name": "Maharaja Express", "type": "Luxury", "origin": "Delhi", "destination": "Agra"},
    {"id": 9, "name": "Goods Freight", "type": "Freight", "origin": "Kanpur", "destination": "Delhi"},
    {"id": 10, "name": "Container Freight", "type": "Freight", "origin": "Jaipur", "destination": "Delhi"}
]

# Train type priorities
priority_map = {"Express": 3, "Passenger": 2, "Luxury": 2, "Freight": 1}

# -----------------------------
# RL Q-learning Setup
# -----------------------------
num_trains = len(trains_data)
num_tracks = 2
q_table = np.zeros((num_trains, num_tracks))  # Q-values [train, track]

alpha = 0.1     # learning rate
gamma = 0.9     # discount factor
epsilon = 0.2   # exploration rate
episodes = 200  # training runs

# -----------------------------
# Environment Simulation
# -----------------------------
def simulate_environment(train_idx, track_choice):
    """
    Reward logic:
    - High priority trains on free track = high reward
    - Delay or congestion = penalty
    """
    train = trains_data[train_idx]
    priority = priority_map[train["type"]]
    
    # Random delay factor (weather, accidents)
    delay = random.choice([0, 5, 10, 20])
    
    if delay == 0:
        reward = priority * 10
    elif delay <= 10:
        reward = priority * 5
    else:
        reward = -priority * 10  # penalty for large delay
    
    return reward, delay

# -----------------------------
# Training the Q-table
# -----------------------------
for episode in range(episodes):
    for train_idx in range(num_trains):
        if random.uniform(0, 1) < epsilon:
            action = random.randint(0, num_tracks-1)  # explore
        else:
            action = np.argmax(q_table[train_idx])    # exploit
        
        reward, delay = simulate_environment(train_idx, action)
        best_next = np.max(q_table[train_idx])
        q_table[train_idx, action] += alpha * (reward + gamma * best_next - q_table[train_idx, action])

# -----------------------------
# Final Scheduling Decision
# -----------------------------
schedule = []
for train_idx, train in enumerate(trains_data):
    best_track = np.argmax(q_table[train_idx])
    _, delay = simulate_environment(train_idx, best_track)
    schedule.append({
        "Train ID": train["id"],
        "Train Name": train["name"],
        "Origin": train["origin"],
        "Destination": train["destination"],
        "Track Assigned": best_track+1,
        "Planned Start": f"{8+train_idx}:00",
        "Planned End": f"{9+train_idx}:00",
        "Delay (mins)": delay,
        "Final Start": f"{8+train_idx}:{delay:02d}",
        "Final End": f"{9+train_idx}:{delay:02d}",
        "Status": "On-Time" if delay == 0 else ("Minor Delay" if delay <= 10 else "Major Delay")
    })

df = pd.DataFrame(schedule)

# -----------------------------
# Output: Tables
# -----------------------------
print("\n===== Train Schedule with AI Scheduling =====\n")
print(df[["Train ID", "Train Name", "Origin", "Destination", "Track Assigned",
          "Planned Start", "Final Start", "Planned End", "Final End", "Status"]])

# -----------------------------
# Output: Visualization
# -----------------------------
colors = {"On-Time": "green", "Minor Delay": "yellow", "Major Delay": "red"}

plt.figure(figsize=(12,6))
for idx, row in df.iterrows():
    plt.scatter(row["Track Assigned"], idx, 
                color=colors[row["Status"]], s=200, label=row["Status"] if idx==0 else "")
    plt.text(row["Track Assigned"]+0.05, idx, f'{row["Train ID"]}-{row["Train Name"]}', fontsize=9, va='center')

plt.yticks(range(len(df)), [f'Train {i+1}' for i in range(len(df))])
plt.xticks([1,2], ["Track 1", "Track 2"])
plt.title("AI-Powered Train Scheduling (Q-Learning Prototype)")
plt.xlabel("Tracks")
plt.ylabel("Trains")
plt.legend(loc="upper right")
plt.grid(True, linestyle="--", alpha=0.6)
plt.show()
