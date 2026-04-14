export const MOCK_SUBJECTS = [
  { id: "mock-sub-1", name: "Data Structures", emoji: "🧩" },
  { id: "mock-sub-2", name: "Operating Systems", emoji: "🖥️" },
  { id: "mock-sub-3", name: "DBMS", emoji: "🗃️" },
  { id: "mock-sub-4", name: "Machine Learning", emoji: "🤖" },
];

export const MOCK_FILES = [
  {
    id: "mock-file-1",
    name: "LinkedList Notes.pdf",
    file_url: "#",
    created_at: new Date().toISOString(),
    folder_id: null,
    subject_id: "mock-sub-1",
  },
  {
    id: "mock-file-2",
    name: "OS Scheduling.pdf",
    file_url: "#",
    created_at: new Date(Date.now() - 86400000).toISOString(),
    folder_id: null,
    subject_id: "mock-sub-2",
  },
  {
    id: "mock-file-3",
    name: "Normalization Guide.pdf",
    file_url: "#",
    created_at: new Date(Date.now() - 172800000).toISOString(),
    folder_id: null,
    subject_id: "mock-sub-3",
  },
];

export const MOCK_QUIZ = {
  id: "mock-quiz-1",
  title: "DBMS Basics",
  subject_id: "mock-sub-3",
  user_id: "mock-teacher",
  is_published: true,
  questions: [
    {
      id: "mock-q-1",
      quiz_id: "mock-quiz-1",
      question: "What is normalization in DBMS?",
      option_a: "A process to reduce redundancy",
      option_b: "A backup strategy",
      option_c: "An indexing technique",
      option_d: "A query optimization rule",
      correct_answer: "A",
    },
    {
      id: "mock-q-2",
      quiz_id: "mock-quiz-1",
      question: "What is a primary key?",
      option_a: "A key with duplicate values",
      option_b: "A nullable attribute",
      option_c: "A unique identifier for a row",
      option_d: "A foreign relation pointer",
      correct_answer: "C",
    },
    {
      id: "mock-q-3",
      quiz_id: "mock-quiz-1",
      question: "Which SQL clause filters grouped results?",
      option_a: "WHERE",
      option_b: "GROUP BY",
      option_c: "HAVING",
      option_d: "ORDER BY",
      correct_answer: "C",
    },
  ],
};

export const MOCK_ATTEMPTS = [
  {
    id: "mock-attempt-1",
    quiz_id: "mock-quiz-1",
    quiz_title: "DBMS Basics",
    score: 2,
    created_at: new Date(Date.now() - 3600000).toISOString(),
  },
];

export const MOCK_FOLDERS = [
  { id: "mock-folder-1", name: "Semester 4", parent_id: null },
  { id: "mock-folder-2", name: "DBMS", parent_id: "mock-folder-1" },
  { id: "mock-folder-3", name: "OS", parent_id: "mock-folder-1" },
];

export function fallbackIfEmpty(list, fallback) {
  if (!Array.isArray(list) || list.length === 0) {
    return fallback;
  }

  return list;
}
