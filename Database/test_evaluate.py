from evaluate import is_answer_correct
print("⚙️ Test gestartet")

# Beispielantworten
user_answer = "Die Parabel geht nach unten auf"
correct_answer = "Die Parabel öffnet sich nach unten"

# Test durchführen
is_correct, score = is_answer_correct(user_answer, correct_answer)

# Ausgabe
print(f"Ähnlichkeit: {score:.2f}")
print("✅ Antwort ist korrekt" if is_correct else "❌ Antwort ist falsch")
