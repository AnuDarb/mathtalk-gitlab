from evaluate import get_similarity_score

user_input = "Die Parabel geht nooch unten auf"
correct = "Die Parabel öffnet sich nach unten"

score = get_similarity_score(user_input, correct)
print(f"🔍 Score: {score:.2f}")

if score > 0.85:
    print("✅ Richtig!")
elif score > 0.65:
    print("🟡 Fast richtig – achte auf deine Formulierung.")
else:
    print("❌ Leider falsch.")

