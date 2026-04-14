import { supabase } from "../lib/supabaseClient";

const FILE_BUCKET = "study-files";
const ROLE_OPTIONS = ["teacher", "student"];

const DEMO_QUIZZES = [
  {
    title: "JavaScript Basics",
    questions: [
      {
        question: "Which keyword declares a block-scoped variable?",
        option_a: "var",
        option_b: "let",
        option_c: "const",
        option_d: "function",
        correct_answer: "B",
      },
      {
        question: "Which method converts JSON text into an object?",
        option_a: "JSON.stringify",
        option_b: "JSON.encode",
        option_c: "JSON.parse",
        option_d: "JSON.decode",
        correct_answer: "C",
      },
      {
        question: "What is the output type of typeof []?",
        option_a: "array",
        option_b: "list",
        option_c: "object",
        option_d: "undefined",
        correct_answer: "C",
      },
    ],
  },
  {
    title: "Data Structures Intro",
    questions: [
      {
        question: "Which data structure follows FIFO order?",
        option_a: "Stack",
        option_b: "Queue",
        option_c: "Tree",
        option_d: "Graph",
        correct_answer: "B",
      },
      {
        question: "What is the average lookup complexity in a hash table?",
        option_a: "O(1)",
        option_b: "O(log n)",
        option_c: "O(n)",
        option_d: "O(n log n)",
        correct_answer: "A",
      },
      {
        question: "Which traversal uses a queue in binary trees?",
        option_a: "Inorder",
        option_b: "Preorder",
        option_c: "Postorder",
        option_d: "Level order",
        correct_answer: "D",
      },
    ],
  },
];

const sortByName = (items) => [...items].sort((a, b) => a.name.localeCompare(b.name));

function normalizeRole(role) {
  if (ROLE_OPTIONS.includes(role)) {
    return role;
  }

  return "student";
}

export async function getUserProfile(userId) {
  const { data, error } = await supabase
    .from("users")
    .select("id, email, role")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function upsertUserProfile({ userId, email, role }) {
  const safeRole = normalizeRole(role);
  const payload = {
    id: userId,
    email,
    role: safeRole,
  };

  const { data, error } = await supabase
    .from("users")
    .upsert(payload, { onConflict: "id" })
    .select("id, email, role")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateUserRole({ userId, role }) {
  const safeRole = normalizeRole(role);
  const { data, error } = await supabase
    .from("users")
    .update({ role: safeRole })
    .eq("id", userId)
    .select("id, email, role")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getDashboardStats(userId) {
  const [filesRes, attemptsRes, subjectsRes] = await Promise.all([
    supabase
      .from("files")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("attempts")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
    supabase
      .from("subjects")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId),
  ]);

  const errors = [filesRes.error, attemptsRes.error, subjectsRes.error].filter(Boolean);
  if (errors.length > 0) {
    throw new Error(errors[0].message);
  }

  return {
    totalFiles: filesRes.count ?? 0,
    totalAttempts: attemptsRes.count ?? 0,
    totalSubjects: subjectsRes.count ?? 0,
  };
}

export async function listSubjects(userId) {
  const { data, error } = await supabase
    .from("subjects")
    .select("id, name")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createSubject({ name, userId }) {
  const { data, error } = await supabase
    .from("subjects")
    .insert({ name, user_id: userId })
    .select("id, name")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listFolders(userId) {
  const { data, error } = await supabase
    .from("folders")
    .select("id, name, parent_id")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function createFolder({ name, parentId, userId }) {
  const { data, error } = await supabase
    .from("folders")
    .insert({ name, parent_id: parentId || null, user_id: userId })
    .select("id, name, parent_id")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listFiles(userId, folderId = undefined) {
  let query = supabase
    .from("files")
    .select("id, name, file_url, folder_id, subject_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (folderId) {
    query = query.eq("folder_id", folderId);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function uploadStudyFile({ file, userId, folderId, subjectId }) {
  const safeName = `${Date.now()}-${file.name}`;
  const path = `${userId}/${safeName}`;

  const { error: uploadError } = await supabase.storage
    .from(FILE_BUCKET)
    .upload(path, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const {
    data: { publicUrl },
  } = supabase.storage.from(FILE_BUCKET).getPublicUrl(path);

  const { data, error } = await supabase
    .from("files")
    .insert({
      name: file.name,
      file_url: publicUrl,
      folder_id: folderId || null,
      subject_id: subjectId || null,
      user_id: userId,
    })
    .select("id, name, file_url, folder_id, subject_id, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listTeacherQuizzes(userId) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("id, title, subject_id, user_id, is_published")
    .eq("user_id", userId)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listAvailableQuizzes(userId) {
  const { data, error } = await supabase
    .from("quizzes")
    .select("id, title, subject_id, user_id, is_published")
    .or(`user_id.eq.${userId},is_published.eq.true`)
    .order("title", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listQuizzes(userId) {
  return listTeacherQuizzes(userId);
}

export async function createQuiz({ title, subjectId, userId, isPublished = false }) {
  const { data, error } = await supabase
    .from("quizzes")
    .insert({
      title,
      subject_id: subjectId || null,
      user_id: userId,
      is_published: Boolean(isPublished),
    })
    .select("id, title, subject_id, user_id, is_published")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function setQuizPublished({ quizId, userId, isPublished }) {
  const { data, error } = await supabase
    .from("quizzes")
    .update({ is_published: Boolean(isPublished) })
    .eq("id", quizId)
    .eq("user_id", userId)
    .select("id, title, subject_id, user_id, is_published")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function addQuestion(questionPayload) {
  const { data, error } = await supabase
    .from("questions")
    .insert(questionPayload)
    .select("id, quiz_id, question, option_a, option_b, option_c, option_d, correct_answer")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getQuizWithQuestions(quizId, userId) {
  const { data: quiz, error: quizError } = await supabase
    .from("quizzes")
    .select("id, title, subject_id, user_id, is_published")
    .eq("id", quizId)
    .or(`user_id.eq.${userId},is_published.eq.true`)
    .single();

  if (quizError) {
    throw new Error(quizError.message);
  }

  const { data: questions, error: questionsError } = await supabase
    .from("questions")
    .select("id, quiz_id, question, option_a, option_b, option_c, option_d, correct_answer")
    .eq("quiz_id", quizId)
    .order("id", { ascending: true });

  if (questionsError) {
    throw new Error(questionsError.message);
  }

  return {
    ...quiz,
    questions: questions ?? [],
  };
}

export async function createAttempt({ quizId, userId, score }) {
  const { data, error } = await supabase
    .from("attempts")
    .insert({ quiz_id: quizId, user_id: userId, score })
    .select("id, quiz_id, user_id, score, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function listAttempts(userId) {
  const { data: attempts, error } = await supabase
    .from("attempts")
    .select("id, quiz_id, score, created_at, quizzes(title)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (attempts ?? []).map((attempt) => ({
    ...attempt,
    quiz_title: attempt.quizzes?.title ?? "Unknown Quiz",
  }));
}

export async function seedDemoQuizzes({ userId, subjectId = null }) {
  const targetTitles = DEMO_QUIZZES.map((quiz) => quiz.title);
  const { data: existingData, error: existingError } = await supabase
    .from("quizzes")
    .select("title")
    .eq("user_id", userId)
    .in("title", targetTitles);

  if (existingError) {
    throw new Error(existingError.message);
  }

  const existingTitles = new Set((existingData ?? []).map((item) => item.title));
  let createdCount = 0;

  for (const template of DEMO_QUIZZES) {
    if (existingTitles.has(template.title)) {
      continue;
    }

    const createdQuiz = await createQuiz({
      title: template.title,
      userId,
      subjectId,
      isPublished: true,
    });

    for (const question of template.questions) {
      await addQuestion({
        quiz_id: createdQuiz.id,
        ...question,
      });
    }

    createdCount += 1;
  }

  return { createdCount };
}

export async function listRecentFiles(userId, limit = 8) {
  const { data, error } = await supabase
    .from("files")
    .select("id, name, file_url, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export function buildFolderTree(folders) {
  const byParent = folders.reduce((acc, folder) => {
    const parentKey = folder.parent_id ?? "root";
    if (!acc[parentKey]) {
      acc[parentKey] = [];
    }
    acc[parentKey].push(folder);
    return acc;
  }, {});

  const attachChildren = (parentKey) =>
    sortByName(byParent[parentKey] ?? []).map((folder) => ({
      ...folder,
      children: attachChildren(folder.id),
    }));

  return attachChildren("root");
}
