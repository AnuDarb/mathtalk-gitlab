from flask import Flask, request, session, jsonify
import sqlite3
import uuid
import os

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Replace with a secure key in production

BASEDIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASEDIR, '..', 'Database', 'mathtalk.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def get_questions():
    conn = get_db_connection()
    questions = conn.execute('SELECT * FROM questions').fetchall()
    conn.close()
    return [dict(q) for q in questions]

def get_progress(session_id):
    conn = get_db_connection()
    row = conn.execute('SELECT remaining, wrong FROM progress WHERE session_id = ?', (session_id,)).fetchone()
    conn.close()
    if row:
        return row['remaining'], row['wrong']
    return None, None

def save_progress(session_id, remaining, wrong):
    conn = get_db_connection()
    conn.execute('REPLACE INTO progress (session_id, remaining, wrong) VALUES (?, ?, ?)', (
        session_id,
        ','.join(map(str, remaining)),
        ','.join(map(str, wrong))
    ))
    conn.commit()
    conn.close()

@app.before_request
def ensure_session_id():
    if 'session_id' not in session:
        session['session_id'] = str(uuid.uuid4())

@app.route('/api/questions', methods=['GET'])
def api_questions():
    return jsonify(get_questions())

@app.route('/api/progress', methods=['GET'])
def api_progress():
    session_id = session['session_id']
    questions = get_questions()
    total_questions = len(questions)
    remaining_str, wrong_str = get_progress(session_id)
    remaining = [int(x) for x in remaining_str.split(',') if x] if remaining_str else list(range(total_questions))
    wrong = [int(x) for x in wrong_str.split(',') if x] if wrong_str else []
    answered = total_questions - len(remaining)
    return jsonify({
        "total_questions": total_questions,
        "answered": answered,
        "remaining": len(remaining),
        "wrong": len(wrong)
    })

@app.route('/api/question/<int:q_idx>', methods=['GET'])
def api_question(q_idx):
    questions = get_questions()
    if 0 <= q_idx < len(questions):
        q = questions[q_idx]
        return jsonify({
            "id": q['id'],
            "question": q['question'],
            "choices": [q['choice0'], q['choice1'], q['choice2'], q['choice3']],
            "answer": q['answer']
        })
    return jsonify({"error": "Not found"}), 404

@app.route('/api/answer', methods=['POST'])
def api_answer():
    data = request.json
    q_idx = int(data['q_idx'])
    choice = int(data['choice'])
    questions = get_questions()
    correct = questions[q_idx]['answer']
    session_id = session['session_id']
    remaining_str, wrong_str = get_progress(session_id)
    remaining = [int(x) for x in remaining_str.split(',') if x] if remaining_str else []
    wrong = [int(x) for x in wrong_str.split(',') if x] if wrong_str else []
    feedback = ""
    if q_idx in remaining:
        remaining.remove(q_idx)
    if choice != correct:
        feedback = f"Falsche Antwort! Die richtige Antwort ist: {questions[q_idx]['choice'+str(correct)]}"
        if q_idx not in wrong:
            wrong.append(q_idx)
    else:
        feedback = "Richtig!"
        if q_idx in wrong:
            wrong.remove(q_idx)
    save_progress(session_id, remaining, wrong)
    session['remaining'] = remaining
    session['wrong'] = wrong
    return jsonify({"feedback": feedback, "correct": correct})

@app.route('/api/skip', methods=['POST'])
def api_skip():
    data = request.json
    q_idx = int(data['q_idx'])
    session_id = session['session_id']
    remaining_str, wrong_str = get_progress(session_id)
    remaining = [int(x) for x in remaining_str.split(',') if x] if remaining_str else []
    wrong = [int(x) for x in wrong_str.split(',') if x] if wrong_str else []
    if q_idx in remaining:
        remaining.remove(q_idx)
        remaining.append(q_idx)
    save_progress(session_id, remaining, wrong)
    session['remaining'] = remaining
    session['wrong'] = wrong
    return jsonify({"feedback": "Frage übersprungen!"})

@app.route('/api/reset', methods=['POST'])
def api_reset():
    session.clear()
    return jsonify({"status": "ok"})

if __name__ == '__main__':
    app.run(debug=True)
