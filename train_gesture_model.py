#!/usr/bin/env python3
"""
train_gesture_model.py — Train a lightweight MLP classifier for hand gestures.

Reads keypoint.csv (4787 samples, 42 features from 21 MediaPipe hand landmarks),
trains a high-accuracy lightweight Multi-Layer Perceptron (MLP) neural network,
evaluates performance metrics, and exports the model weights to JSON for web inference.

Classes:
  0: Open Palm (Pan canvas)
  1: Fist (Hold / Stop)
  2: Point (Cursor navigation / Wire drawing)
  3: Pinch / Pick (Grab / Select / Move component)
"""

import json
import os
import numpy as np
import pandas as pd
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, confusion_matrix, accuracy_score

# ──────────────────────────────────────────────────────────────────────────────
# 1. Configuration & Label Mapping
# ──────────────────────────────────────────────────────────────────────────────
CSV_PATH = "keypoint.csv"
OUTPUT_DIR_PUBLIC = os.path.join("client", "public", "gesture_model")
OUTPUT_JSON_LIB = os.path.join("client", "src", "lib", "gestureModelWeights.json")
OUTPUT_JSON_PUBLIC = os.path.join(OUTPUT_DIR_PUBLIC, "gesture_model.json")

# Ground truth mapping determined from geometric analysis of keypoints:
# 0 -> all fingers extended (Open Palm)
# 1 -> all fingers curled (Fist)
# 2 -> index extended, other fingers curled (Point)
# 3 -> thumb & index tips pinched together (Pinch/Pick)
LABEL_MAP = {
    0: {"id": "pan", "name": "Open Palm", "action": "Pan canvas"},
    1: {"id": "fist", "name": "Fist", "action": "Hold / Stop"},
    2: {"id": "point", "name": "Point", "action": "Cursor navigation"},
    3: {"id": "pinch", "name": "Pinch", "action": "Pick / Place / Connect"},
}

TARGET_NAMES = [LABEL_MAP[i]["name"] for i in range(len(LABEL_MAP))]
GESTURE_IDS = [LABEL_MAP[i]["id"] for i in range(len(LABEL_MAP))]

print("=" * 70)
print("  TRAINING LIGHTWEIGHT HAND GESTURE MLP CLASSIFIER")
print("=" * 70)

# ──────────────────────────────────────────────────────────────────────────────
# 2. Load & Split Dataset
# ──────────────────────────────────────────────────────────────────────────────
print(f"\n[1/5] Loading dataset from '{CSV_PATH}'...")
df = pd.read_csv(CSV_PATH, header=None)
y = df.iloc[:, 0].values.astype(np.int32)
X = df.iloc[:, 1:].values.astype(np.float32)

print(f"      Total samples : {len(X)}")
print(f"      Input features: {X.shape[1]} (21 landmarks x 2 coordinates)")
for label_idx, info in LABEL_MAP.items():
    count = np.sum(y == label_idx)
    print(f"        Class {label_idx} [{info['name']:<10}]: {count:>4} samples ({count/len(y)*100:.1f}%)")

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.20, random_state=42, stratify=y
)
print(f"      Train set: {len(X_train)} samples | Test set: {len(X_test)} samples")

# ──────────────────────────────────────────────────────────────────────────────
# 3. Train MLP Neural Network
# ──────────────────────────────────────────────────────────────────────────────
print("\n[2/5] Training MLP Classifier (Architecture: 42 -> 64 -> 32 -> 4)...")
mlp = MLPClassifier(
    hidden_layer_sizes=(64, 32),
    activation="relu",
    solver="adam",
    alpha=1e-4,              # L2 regularization penalty
    batch_size=64,
    learning_rate_init=1e-3,
    max_iter=300,
    random_state=42,
    early_stopping=True,
    validation_fraction=0.15,
    n_iter_no_change=15,
    verbose=False,
)

mlp.fit(X_train, y_train)
print(f"      Training converged in {mlp.n_iter_} iterations.")

# ──────────────────────────────────────────────────────────────────────────────
# 4. Evaluation & Metrics
# ──────────────────────────────────────────────────────────────────────────────
print("\n[3/5] Evaluating model on unseen test set...")
y_pred = mlp.predict(X_test)
y_prob = mlp.predict_proba(X_test)
acc = accuracy_score(y_test, y_pred)
print(f"\n      >>> Test Accuracy: {acc * 100:.2f}% <<<\n")

print("Classification Report:")
print(classification_report(y_test, y_pred, target_names=TARGET_NAMES, digits=4))

print("Confusion Matrix:")
cm = confusion_matrix(y_test, y_pred)
print(f"          {' '.join([f'{name[:6]:>7}' for name in TARGET_NAMES])}")
for i, row in enumerate(cm):
    print(f"  {TARGET_NAMES[i][:6]:>6}  {' '.join([f'{val:>7}' for val in row])}")

# ──────────────────────────────────────────────────────────────────────────────
# 5. Export Model for the Web
# ──────────────────────────────────────────────────────────────────────────────
print("\n[4/5] Exporting model weights and metadata for web deployment...")

# Extract weights and biases:
# mlp.coefs_ is list of weight matrices: [(42, 64), (64, 32), (32, 4)]
# mlp.intercepts_ is list of bias vectors: [(64,), (32,), (4,)]
layers = []
for i, (w, b) in enumerate(zip(mlp.coefs_, mlp.intercepts_)):
    layers.append({
        "layer_index": i,
        "input_dim": int(w.shape[0]),
        "output_dim": int(w.shape[1]),
        "activation": "relu" if i < len(mlp.coefs_) - 1 else "softmax",
        "weights": w.tolist(),  # shape [in_dim][out_dim]
        "biases": b.tolist(),   # shape [out_dim]
    })

web_model = {
    "model_type": "MLPClassifier",
    "framework": "scikit-learn / pure-js runtime",
    "architecture": [42, 64, 32, 4],
    "input_features": 42,
    "num_classes": 4,
    "accuracy": float(acc),
    "classes": [
        {"index": i, "id": LABEL_MAP[i]["id"], "name": LABEL_MAP[i]["name"], "action": LABEL_MAP[i]["action"]}
        for i in range(len(LABEL_MAP))
    ],
    "normalization": {
        "description": "Subtract wrist (landmark 0), then divide all coordinates by max absolute coordinate value",
        "range": [-1.0, 1.0]
    },
    "layers": layers,
}

# Ensure destination folders exist
os.makedirs(OUTPUT_DIR_PUBLIC, exist_ok=True)
os.makedirs(os.path.dirname(OUTPUT_JSON_LIB), exist_ok=True)

# 1. Save to public directory for HTTP fetch
with open(OUTPUT_JSON_PUBLIC, "w", encoding="utf-8") as f:
    json.dump(web_model, f, indent=2)
print(f"      [OK] Exported to '{OUTPUT_JSON_PUBLIC}' ({os.path.getsize(OUTPUT_JSON_PUBLIC)/1024:.1f} KB)")

# 2. Save to client/src/lib for direct zero-latency compile-time import
with open(OUTPUT_JSON_LIB, "w", encoding="utf-8") as f:
    json.dump(web_model, f, indent=2)
print(f"      [OK] Exported to '{OUTPUT_JSON_LIB}' ({os.path.getsize(OUTPUT_JSON_LIB)/1024:.1f} KB)")

print("\n[5/5] Verification of forward pass consistency:")
# Test first test sample on Python side
sample_idx = 0
sample_x = X_test[sample_idx]
expected_class = int(mlp.predict([sample_x])[0])
expected_prob = mlp.predict_proba([sample_x])[0].tolist()

# Simulate pure JavaScript forward pass in Python to ensure 100% mathematical parity
def js_forward(x_in, model_dict):
    curr = list(x_in)
    for layer in model_dict["layers"]:
        w = layer["weights"]
        b = layer["biases"]
        out_dim = layer["output_dim"]
        nxt = [0.0] * out_dim
        for j in range(out_dim):
            s = b[j]
            for k in range(len(curr)):
                s += curr[k] * w[k][j]
            nxt[j] = s
        if layer["activation"] == "relu":
            curr = [max(0.0, v) for v in nxt]
        elif layer["activation"] == "softmax":
            m = max(nxt)
            exps = [np.exp(v - m) for v in nxt]
            sm = sum(exps)
            curr = [e / sm for e in exps]
    return curr

js_probs = js_forward(sample_x, web_model)
js_class = int(np.argmax(js_probs))

print(f"      Sample true label : {y_test[sample_idx]} ({LABEL_MAP[y_test[sample_idx]]['name']})")
print(f"      Sklearn prediction: Class {expected_class} (prob: {expected_prob[expected_class]:.4f})")
print(f"      JS sim prediction : Class {js_class} (prob: {js_probs[js_class]:.4f})")
parity = np.allclose(expected_prob, js_probs, atol=1e-5)
print(f"      Parity match      : {'PERFECT (EXACT MATCH)' if parity else 'MISMATCH'}")

print("\n" + "=" * 70)
print(f"  SUCCESS! Model trained with {acc * 100:.2f}% accuracy and ready for web client.")
print("=" * 70)
