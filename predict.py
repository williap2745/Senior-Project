# predict.py
import sys
import time
print(sys.executable, file = sys.stderr)
import joblib
import pandas as pd

start_time= time.time()
# Load model
pipeline = joblib.load("task_time_predictor.pkl")
print(f"Model loaded in {time.time() - start_time:.2f} seconds", file=sys.stderr)
# Example: Read JSON input from Node
import json
input_data = json.loads(sys.stdin.read())

# Convert to DataFrame
df = pd.DataFrame([input_data])

# df2 = pd.DataFrame([{
#     "Subject": "Math",  # Change subject as needed
#     "Skill_Level": 8,   # Adjust based on user skill
#     "Task_Difficulty": 7,  # Difficulty of the task
#     "Score": 100        # Desired Grade (in hours)
# }])

# Predict
start_prediction = time.time()
prediction = pipeline.predict(df)
print(f"Prediction made in {time.time() - start_prediction:.2f} seconds", file=sys.stderr)
print(f"{prediction[0]:.2f}")
