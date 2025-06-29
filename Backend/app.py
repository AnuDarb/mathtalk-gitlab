from flask import Flask, request, session, jsonify
import sqlite3
import uuid
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', 'Database')))
from evaluate import get_similarity_score

app = Flask(__name__)
app.secret_key = 'your_secret_key'  # Replace with a secure key in production

BASEDIR = os.path.abspath(os.path.dirname(__file__))
DB_PATH = os.path.join(BASEDIR, '..', 'Database', 'mathtalk.db')

def get_db_connection():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

# Mapping von Frontend-Values auf DB-Category-Werte
CATEGORY_MAP = {
    'zahlen_terme': 'Zahlen & Terme',
    'funktionen_algebra': 'Funktionen & Algebra',
    'geometrie_raum': 'Geometrie & Raum',
    'stochastik': 'Stochastik'
}

def get_questions(category=None):
    conn = get_db_connection()
    if category:
        db_category = CATEGORY_MAP.get(category, category)
        questions = conn.execute('SELECT * FROM questions WHERE category = ?', (db_category,)).fetchall()
    else:
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
    category = request.args.get('category')
    questions = get_questions(category)
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
    category = request.args.get('category')
    questions = get_questions(category)
    if 0 <= q_idx < len(questions):
        q = questions[q_idx]
        return jsonify({
            "id": q['id'],
            "question": q['question'],
            "hint_text": q.get('hint_text', None)  # Hinweis mitliefern
        })
    return jsonify({"error": "Not found"}), 404

@app.route('/api/skip', methods=['POST'])
def api_skip():
    data = request.json
    q_idx = int(data['q_idx'])
    category = request.args.get('category')
    questions = get_questions(category)
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

def get_correct_answer(question_id):
    conn = sqlite3.connect(DB_PATH)
    cursor = conn.cursor()
    cursor.execute("SELECT answer FROM questions WHERE id = ?", (question_id,))
    result = cursor.fetchone()
    conn.close()
    return result[0] if result else None

@app.route('/api/evaluate', methods=['POST'])
def api_evaluate():
    data = request.json
    question_id = data.get('question_id')
    user_input = data.get('user_input')
    correct_answer = get_correct_answer(question_id)
    session_id = session['session_id']
    # Hole alle Fragen-IDs für die aktuelle Kategorie
    category = request.args.get('category')
    questions = get_questions(category)
    question_ids = [q['id'] for q in questions]
    try:
        q_idx = question_ids.index(question_id)
    except ValueError:
        return jsonify({'error': 'Frage nicht gefunden.'}), 404
    remaining_str, wrong_str = get_progress(session_id)
    remaining = [int(x) for x in remaining_str.split(',') if x] if remaining_str else question_ids.copy()
    wrong = [int(x) for x in wrong_str.split(',') if x] if wrong_str else []
    if correct_answer:
        score = get_similarity_score(user_input, correct_answer)
        # Fortschritt speichern wie bei /api/answer
        if q_idx in remaining:
            remaining.remove(q_idx)
        if score > 0.65:
            if q_idx in wrong:
                wrong.remove(q_idx)
        else:
            if q_idx not in wrong:
                wrong.append(q_idx)
        save_progress(session_id, remaining, wrong)
        session['remaining'] = remaining
        session['wrong'] = wrong
        return jsonify({
            'score': score,
            'is_correct': score > 0.65
        })
    else:
        return jsonify({'error': 'Frage nicht gefunden.'}), 404

if __name__ == '__main__':
    app.run(debug=True)
