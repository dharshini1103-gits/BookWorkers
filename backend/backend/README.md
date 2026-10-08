# Backend (FastAPI + SQLite)

    python -m venv venv
    source venv/bin/activate        # Windows: venv\Scripts\activate
    pip install -r requirements.txt
    python seed.py                  # optional demo data
    uvicorn app.main:app --reload

Open http://127.0.0.1:8000/docs
