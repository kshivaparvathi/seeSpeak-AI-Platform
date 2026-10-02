import sqlite3
import os
import json
import uuid
from datetime import datetime, timezone
from typing import Optional, List, Dict, Any
from backend.utils.logging import logger

DB_FILE = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "see_speak.db")

FEATURE_MAPPING = {
    "main": "main",
    "general": "main",
    "home": "main",
    "document": "document-analysis",
    "document-analysis": "document-analysis",
    "vision": "visual-intelligence",
    "visual-intelligence": "visual-intelligence",
    "interview": "ai-interview",
    "ai-interview": "ai-interview",
    "support": "customer-support",
    "customer-support": "customer-support",
    "meeting": "video-audio-review",
    "video-audio-review": "video-audio-review",
    "study": "data-study",
    "data-study": "data-study",
}

def normalize_feature_id(feature: Optional[str]) -> str:
    """Normalizes any feature string or alias to the canonical feature ID."""
    if not feature:
        return "document-analysis"
    f_clean = feature.lower().strip()
    return FEATURE_MAPPING.get(f_clean, f_clean)

class ConversationRepository:
    def __init__(self, db_path: str = DB_FILE):
        self.db_path = db_path
        self._init_db()

    def _get_connection(self) -> sqlite3.Connection:
        conn = sqlite3.connect(self.db_path)
        conn.row_factory = sqlite3.Row
        conn.execute("PRAGMA foreign_keys = ON;")
        return conn

    def _init_db(self):
        """Initializes and migrates SQLite tables for conversations, messages, and files."""
        os.makedirs(os.path.dirname(self.db_path), exist_ok=True)
        with self._get_connection() as conn:
            conn.executescript("""
                CREATE TABLE IF NOT EXISTS conversations (
                    id TEXT PRIMARY KEY,
                    title TEXT NOT NULL,
                    feature TEXT NOT NULL,
                    mode TEXT DEFAULT 'general',
                    language TEXT DEFAULT 'en',
                    is_favorite INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );

                CREATE TABLE IF NOT EXISTS messages (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    role TEXT NOT NULL,
                    content TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );

                CREATE TABLE IF NOT EXISTS conversation_files (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT NOT NULL,
                    feature_id TEXT DEFAULT '',
                    filename TEXT NOT NULL,
                    file_path TEXT NOT NULL,
                    mime_type TEXT NOT NULL,
                    size_bytes INTEGER DEFAULT 0,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(conversation_id) REFERENCES conversations(id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_messages_conv ON messages(conversation_id);
                CREATE INDEX IF NOT EXISTS idx_files_conv ON conversation_files(conversation_id);
                CREATE INDEX IF NOT EXISTS idx_conv_feature ON conversations(feature);

                CREATE TABLE IF NOT EXISTS interview_sessions (
                    id TEXT PRIMARY KEY,
                    conversation_id TEXT UNIQUE,
                    candidate_name TEXT DEFAULT '',
                    target TEXT DEFAULT '',
                    company_exam TEXT DEFAULT '',
                    branch TEXT DEFAULT '',
                    role TEXT DEFAULT '',
                    interview_type TEXT DEFAULT 'Technical',
                    topics TEXT DEFAULT '',
                    difficulty TEXT DEFAULT 'Intermediate',
                    status TEXT DEFAULT 'setup',
                    start_time TEXT,
                    end_time TEXT,
                    current_question_index INTEGER DEFAULT 0,
                    total_questions INTEGER DEFAULT 0,
                    setup_data_json TEXT DEFAULT '{}',
                    qa_records_json TEXT DEFAULT '[]',
                    metrics_json TEXT DEFAULT '{}',
                    strengths_json TEXT DEFAULT '[]',
                    improvements_json TEXT DEFAULT '[]',
                    concepts_to_revise_json TEXT DEFAULT '[]',
                    next_step_recommendation TEXT DEFAULT '',
                    created_at TEXT NOT NULL,
                    updated_at TEXT NOT NULL
                );
                CREATE INDEX IF NOT EXISTS idx_interview_conv ON interview_sessions(conversation_id);
            """)

            # Schema migration check: ensure conversation_files has feature_id column
            cursor = conn.cursor()
            cursor.execute("PRAGMA table_info(conversation_files)")
            file_columns = [row["name"] for row in cursor.fetchall()]
            if "feature_id" not in file_columns:
                cursor.execute("ALTER TABLE conversation_files ADD COLUMN feature_id TEXT DEFAULT ''")
                logger.info("Migrated conversation_files: added feature_id column")

            # Schema migration check: ensure conversations has is_favorite column
            cursor.execute("PRAGMA table_info(conversations)")
            conv_columns = [row["name"] for row in cursor.fetchall()]
            if "is_favorite" not in conv_columns:
                cursor.execute("ALTER TABLE conversations ADD COLUMN is_favorite INTEGER DEFAULT 0")
                logger.info("Migrated conversations: added is_favorite column")

        logger.info(f"Initialized SQLite database at {self.db_path}")

    def create_conversation(
        self,
        feature: str = "document-analysis",
        mode: str = "general",
        language: str = "en",
        title: Optional[str] = None
    ) -> Dict[str, Any]:
        conv_id = f"conv_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        canonical_feature = normalize_feature_id(feature)
        initial_title = title or "New Conversation"

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO conversations (id, title, feature, mode, language, is_favorite, created_at, updated_at)
                VALUES (?, ?, ?, ?, ?, 0, ?, ?)
                """,
                (conv_id, initial_title, canonical_feature, mode, language, now, now)
            )

        return {
            "id": conv_id,
            "feature_id": canonical_feature,
            "feature": canonical_feature,
            "title": initial_title,
            "mode": mode,
            "language": language,
            "is_favorite": False,
            "created_at": now,
            "updated_at": now,
            "messages": [],
            "files": []
        }

    def get_conversation(self, conv_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM conversations WHERE id = ?", (conv_id,))
            row = cursor.fetchone()
            if not row:
                return None
            
            conv = dict(row)
            canonical_feature = normalize_feature_id(conv.get("feature"))
            conv["feature"] = canonical_feature
            conv["feature_id"] = canonical_feature
            conv["is_favorite"] = bool(conv.get("is_favorite", 0))

            # Fetch messages
            cursor.execute(
                "SELECT * FROM messages WHERE conversation_id = ? ORDER BY created_at ASC",
                (conv_id,)
            )
            conv["messages"] = [dict(r) for r in cursor.fetchall()]

            # Fetch files strictly for this conversation
            cursor.execute(
                "SELECT * FROM conversation_files WHERE conversation_id = ? ORDER BY created_at ASC",
                (conv_id,)
            )
            conv["files"] = [dict(r) for r in cursor.fetchall()]
            return conv

    def list_conversations(
        self,
        feature: Optional[str] = None,
        query: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """
        Lists conversations. When feature is provided, strictly limits results
        to conversations belonging to that specific feature.
        """
        canonical_feature = normalize_feature_id(feature) if feature else None

        with self._get_connection() as conn:
            cursor = conn.cursor()
            conditions = []
            params = []

            if canonical_feature and canonical_feature != "all":
                # Find matching feature or legacy alias
                aliases = [canonical_feature]
                for k, v in FEATURE_MAPPING.items():
                    if v == canonical_feature and k not in aliases:
                        aliases.append(k)
                placeholders = ",".join("?" for _ in aliases)
                conditions.append(f"c.feature IN ({placeholders})")
                params.extend(aliases)

            if query and query.strip():
                term = f"%{query.strip()}%"
                conditions.append("(c.title LIKE ? OR m.content LIKE ?)")
                params.extend([term, term])

            where_clause = f"WHERE {' AND '.join(conditions)}" if conditions else ""

            sql = f"""
                SELECT DISTINCT c.* FROM conversations c
                LEFT JOIN messages m ON c.id = m.conversation_id
                {where_clause}
                ORDER BY c.updated_at DESC
                LIMIT 60
            """
            cursor.execute(sql, params)
            rows = cursor.fetchall()
            result = []
            for r in rows:
                c = dict(r)
                c["feature"] = normalize_feature_id(c.get("feature"))
                c["feature_id"] = c["feature"]
                c["is_favorite"] = bool(c.get("is_favorite", 0))
                # Count files
                cur2 = conn.cursor()
                cur2.execute("SELECT COUNT(*) as count FROM conversation_files WHERE conversation_id = ?", (c["id"],))
                c["file_count"] = cur2.fetchone()["count"]
                result.append(c)
            return result

    def toggle_favorite(self, conv_id: str, is_favorite: Optional[bool] = None) -> Optional[Dict[str, Any]]:
        """Toggles or sets the is_favorite state of a conversation and returns the updated state."""
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT is_favorite FROM conversations WHERE id = ?", (conv_id,))
            row = cursor.fetchone()
            if not row:
                return None
            
            current_val = bool(row["is_favorite"])
            new_val = not current_val if is_favorite is None else bool(is_favorite)
            new_int = 1 if new_val else 0

            cursor.execute(
                "UPDATE conversations SET is_favorite = ?, updated_at = ? WHERE id = ?",
                (new_int, now, conv_id)
            )
            return {
                "id": conv_id,
                "is_favorite": new_val,
                "updated_at": now
            }

    def update_title(self, conv_id: str, new_title: str) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "UPDATE conversations SET title = ?, updated_at = ? WHERE id = ?",
                (new_title.strip()[:80], now, conv_id)
            )
            return cursor.rowcount > 0

    def delete_conversation(self, conv_id: str) -> bool:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM conversations WHERE id = ?", (conv_id,))
            return cursor.rowcount > 0

    def add_message(self, conv_id: str, role: str, content: str) -> Dict[str, Any]:
        msg_id = f"msg_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO messages (id, conversation_id, role, content, created_at)
                VALUES (?, ?, ?, ?, ?)
                """,
                (msg_id, conv_id, role, content, now)
            )
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, conv_id)
            )
        return {
            "id": msg_id,
            "conversation_id": conv_id,
            "role": role,
            "content": content,
            "created_at": now
        }

    def add_file(
        self,
        conv_id: str,
        filename: str,
        file_path: str,
        mime_type: str,
        size_bytes: int = 0,
        feature: Optional[str] = None
    ) -> Dict[str, Any]:
        file_id = f"file_{uuid.uuid4().hex[:12]}"
        now = datetime.now(timezone.utc).isoformat()
        canonical_feature = normalize_feature_id(feature)

        with self._get_connection() as conn:
            conn.execute(
                """
                INSERT INTO conversation_files (id, conversation_id, feature_id, filename, file_path, mime_type, size_bytes, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
                """,
                (file_id, conv_id, canonical_feature, filename, file_path, mime_type, size_bytes, now)
            )
            conn.execute(
                "UPDATE conversations SET updated_at = ? WHERE id = ?",
                (now, conv_id)
            )
        return {
            "id": file_id,
            "conversation_id": conv_id,
            "feature_id": canonical_feature,
            "filename": filename,
            "file_path": file_path,
            "mime_type": mime_type,
            "size_bytes": size_bytes,
            "created_at": now
        }

    def generate_smart_title(
        self,
        conv_id: str,
        first_message: Optional[str] = None,
        filename: Optional[str] = None
    ) -> str:
        """Generates a concise title based on file name or user query."""
        if filename:
            clean_name = os.path.splitext(filename)[0].replace("_", " ").replace("-", " ")
            title = f"{clean_name.title()} Analysis"[:50]
        elif first_message:
            words = first_message.strip().split()
            if len(words) <= 6:
                title = first_message.strip().capitalize()
            else:
                title = " ".join(words[:6]).capitalize() + "..."
            title = title[:50]
        else:
            title = "Conversation"

        self.update_title(conv_id, title)
        return title

    def create_or_get_interview_session(
        self,
        conversation_id: str,
        candidate_name: str = "",
        target: str = "",
        company_exam: str = "",
        branch: str = "",
        role: str = "",
        interview_type: str = "Technical",
        topics: str = "",
        difficulty: str = "Intermediate"
    ) -> Dict[str, Any]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM interview_sessions WHERE conversation_id = ?", (conversation_id,))
            row = cursor.fetchone()
            if row:
                res = dict(row)
                res["setup_data"] = json.loads(res.get("setup_data_json") or "{}")
                res["qa_records"] = json.loads(res.get("qa_records_json") or "[]")
                res["metrics"] = json.loads(res.get("metrics_json") or "{}")
                res["strengths"] = json.loads(res.get("strengths_json") or "[]")
                res["improvements"] = json.loads(res.get("improvements_json") or "[]")
                res["concepts_to_revise"] = json.loads(res.get("concepts_to_revise_json") or "[]")
                return res

            session_id = f"intv_{uuid.uuid4().hex[:12]}"
            now = datetime.now(timezone.utc).isoformat()
            setup_dict = {
                "candidate_name": candidate_name,
                "target": target,
                "company_exam": company_exam,
                "branch": branch,
                "role": role,
                "interview_type": interview_type,
                "topics": topics,
                "difficulty": difficulty
            }
            conn.execute(
                """
                INSERT INTO interview_sessions (
                    id, conversation_id, candidate_name, target, company_exam,
                    branch, role, interview_type, topics, difficulty, status,
                    start_time, end_time, current_question_index, total_questions,
                    setup_data_json, qa_records_json, metrics_json, strengths_json,
                    improvements_json, concepts_to_revise_json, next_step_recommendation,
                    created_at, updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'setup', ?, NULL, 0, 0, ?, '[]', '{}', '[]', '[]', '[]', '', ?, ?)
                """,
                (
                    session_id, conversation_id, candidate_name, target, company_exam,
                    branch, role, interview_type, topics, difficulty, now,
                    json.dumps(setup_dict), now, now
                )
            )

            return {
                "id": session_id,
                "conversation_id": conversation_id,
                "candidate_name": candidate_name,
                "target": target,
                "company_exam": company_exam,
                "branch": branch,
                "role": role,
                "interview_type": interview_type,
                "topics": topics,
                "difficulty": difficulty,
                "status": "setup",
                "start_time": now,
                "end_time": None,
                "current_question_index": 0,
                "total_questions": 0,
                "setup_data": setup_dict,
                "qa_records": [],
                "metrics": {},
                "strengths": [],
                "improvements": [],
                "concepts_to_revise": [],
                "next_step_recommendation": "",
                "created_at": now,
                "updated_at": now
            }

    def get_interview_session(self, conv_or_session_id: str) -> Optional[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM interview_sessions WHERE id = ? OR conversation_id = ?",
                (conv_or_session_id, conv_or_session_id)
            )
            row = cursor.fetchone()
            if not row:
                return None
            res = dict(row)
            res["setup_data"] = json.loads(res.get("setup_data_json") or "{}")
            res["qa_records"] = json.loads(res.get("qa_records_json") or "[]")
            res["metrics"] = json.loads(res.get("metrics_json") or "{}")
            res["strengths"] = json.loads(res.get("strengths_json") or "[]")
            res["improvements"] = json.loads(res.get("improvements_json") or "[]")
            res["concepts_to_revise"] = json.loads(res.get("concepts_to_revise_json") or "[]")
            return res

    def update_interview_session(self, conv_or_session_id: str, updates: Dict[str, Any]) -> bool:
        now = datetime.now(timezone.utc).isoformat()
        current = self.get_interview_session(conv_or_session_id)
        if not current:
            return False

        fields = []
        params = []
        for k, v in updates.items():
            if k in ["setup_data", "qa_records", "metrics", "strengths", "improvements", "concepts_to_revise"]:
                fields.append(f"{k}_json = ?")
                params.append(json.dumps(v))
            elif k in [
                "candidate_name", "target", "company_exam", "branch", "role",
                "interview_type", "topics", "difficulty", "status", "start_time",
                "end_time", "current_question_index", "total_questions", "next_step_recommendation"
            ]:
                fields.append(f"{k} = ?")
                params.append(v)

        if not fields:
            return False

        fields.append("updated_at = ?")
        params.append(now)
        params.append(current["id"])

        with self._get_connection() as conn:
            conn.execute(
                f"UPDATE interview_sessions SET {', '.join(fields)} WHERE id = ?",
                tuple(params)
            )
        return True

    def record_interview_qa(
        self,
        conv_or_session_id: str,
        question: str,
        answer: str,
        evaluation: Optional[Dict[str, Any]] = None,
        better_answer: str = "",
        communication_feedback: str = ""
    ) -> Dict[str, Any]:
        session = self.get_interview_session(conv_or_session_id)
        if not session:
            return {}

        qa_records = session.get("qa_records", [])
        q_idx = len(qa_records) + 1
        record = {
            "index": q_idx,
            "question": question,
            "answer": answer,
            "evaluation": evaluation or {},
            "better_answer": better_answer,
            "communication_feedback": communication_feedback,
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        qa_records.append(record)

        self.update_interview_session(
            session["id"],
            {
                "qa_records": qa_records,
                "current_question_index": q_idx,
                "total_questions": len(qa_records)
            }
        )
        return record

    def list_interview_sessions(self, limit: int = 30) -> List[Dict[str, Any]]:
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute(
                "SELECT * FROM interview_sessions ORDER BY updated_at DESC LIMIT ?",
                (limit,)
            )
            rows = cursor.fetchall()
            results = []
            for r in rows:
                item = dict(r)
                item["setup_data"] = json.loads(item.get("setup_data_json") or "{}")
                item["metrics"] = json.loads(item.get("metrics_json") or "{}")
                results.append(item)
            return results

conversation_repository = ConversationRepository()
