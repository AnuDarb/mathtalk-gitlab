import sqlite3

def init_db():
    conn = sqlite3.connect('mathtalk.db')
    c = conn.cursor()
    # Questions table
    c.execute('''CREATE TABLE IF NOT EXISTS questions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        question TEXT NOT NULL,
        choice0 TEXT NOT NULL,
        choice1 TEXT NOT NULL,
        choice2 TEXT NOT NULL,
        choice3 TEXT NOT NULL,
        answer INTEGER NOT NULL
    )''')
    # Progress table
    c.execute('''CREATE TABLE IF NOT EXISTS progress (
        session_id TEXT PRIMARY KEY,
        remaining TEXT,
        wrong TEXT
    )''')
    conn.commit()
    conn.close()

def add_sample_questions():
    conn = sqlite3.connect('mathtalk.db')
    c = conn.cursor()
    c.execute('SELECT COUNT(*) FROM questions')
    if c.fetchone()[0] == 0:
        questions = [
            ('Was ist die Ableitung von x^2?', '2x', 'x', 'x^2', '2', 0),
            ('Löse nach x auf: 2x + 3 = 7', '1', '2', '3', '4', 1),
            ('Wie groß ist der Wert von sin(90°)?', '0', '1', '0,5', '-1', 1),
            ('Was ist die Lösung von x^2 = 16?', '2', '4', '-4', '4 und -4', 3),
            ('Wie lautet die binomische Formel (a+b)^2?', 'a^2 + 2ab + b^2', 'a^2 - 2ab + b^2', 'a^2 + b^2', '2a^2 + b^2', 0),
        ]
        c.executemany('INSERT INTO questions (question, choice0, choice1, choice2, choice3, answer) VALUES (?, ?, ?, ?, ?, ?)', questions)
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    add_sample_questions()
    print('Database initialized.')
