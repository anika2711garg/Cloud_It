import { AnimatePresence, motion } from "framer-motion";
import { Folder, Grid3X3, List, UploadCloud } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import FileCard from "../components/files/FileCard";
import FolderTree from "../components/folders/FolderTree";
import AnimatedButton from "../components/shared/AnimatedButton";
import GlassCard from "../components/shared/GlassCard";
import { ErrorState, LoadingState } from "../components/shared/StatusMessage";
import { useAuth } from "../context/AuthContext";
import { MOCK_FILES, MOCK_FOLDERS, MOCK_SUBJECTS, fallbackIfEmpty } from "../lib/mockData";
import {
  buildFolderTree,
  createFolder,
  listFiles,
  listFolders,
  listSubjects,
  uploadStudyFile,
} from "../services/studyHubApi";

const FILES_CACHE_KEY = "ai-study-hub-files-cache";
const FILES_TIMEOUT_MS = 1500;

function loadFilesCache(userId) {
  if (!userId) return null;

  try {
    const raw = localStorage.getItem(FILES_CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.userId !== userId) return null;
    return parsed;
  } catch {
    return null;
  }
}

function saveFilesCache(userId, payload) {
  if (!userId) return;

  try {
    localStorage.setItem(
      FILES_CACHE_KEY,
      JSON.stringify({ userId, ...payload, cachedAt: Date.now() })
    );
  } catch {
    // Ignore cache write errors.
  }
}

function withTimeout(promise, fallbackValue, timeoutMs = FILES_TIMEOUT_MS) {
  return Promise.race([
    promise,
    new Promise((resolve) => {
      setTimeout(() => resolve(fallbackValue), timeoutMs);
    }),
  ]);
}

function isUuid(value = "") {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export default function FilesPage() {
  const { user, role, activeMode } = useAuth();
  const canManageFiles = role === "teacher" && activeMode === "teacher";

  const [folders, setFolders] = useState([]);
  const [files, setFiles] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [selectedFolderId, setSelectedFolderId] = useState("");
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderParent, setNewFolderParent] = useState("");

  const [uploadFile, setUploadFile] = useState(null);
  const [uploadSubjectId, setUploadSubjectId] = useState("");
  const [uploadFolderId, setUploadFolderId] = useState("");
  const [uploadProgress, setUploadProgress] = useState(0);

  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);

  const uploadIntervalRef = useRef(null);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const loadData = async () => {
    if (!user?.id) {
      setLoading(false);
      return;
    }

    const cached = loadFilesCache(user.id);
    const hasCachedPayload = Boolean(cached);
    if (cached) {
      if (Array.isArray(cached.folders)) setFolders(cached.folders);
      if (Array.isArray(cached.subjects)) setSubjects(cached.subjects);
      if (Array.isArray(cached.files)) setFiles(cached.files);
      setLoading(false);
    }

    setLoading(!hasCachedPayload);
    setError("");
    try {
      const safeSelectedFolderId = isUuid(selectedFolderId) ? selectedFolderId : undefined;

      const [foldersData, filesData, subjectsData] = await Promise.all([
        withTimeout(listFolders(user.id), []),
        withTimeout(listFiles(user.id, safeSelectedFolderId), []),
        withTimeout(listSubjects(user.id), []),
      ]);

      const resolvedFolders = fallbackIfEmpty(foldersData, MOCK_FOLDERS);
      const resolvedFiles = fallbackIfEmpty(filesData, MOCK_FILES);
      const resolvedSubjects = fallbackIfEmpty(subjectsData, MOCK_SUBJECTS);

      setFolders(resolvedFolders);
      setFiles(resolvedFiles);
      setSubjects(resolvedSubjects);
      saveFilesCache(user.id, {
        folders: resolvedFolders,
        files: resolvedFiles,
        subjects: resolvedSubjects,
      });
    } catch (loadError) {
      setError(loadError.message);
      setFolders(MOCK_FOLDERS);
      setFiles(MOCK_FILES);
      setSubjects(MOCK_SUBJECTS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, selectedFolderId]);

  useEffect(() => {
    return () => {
      if (uploadIntervalRef.current) {
        clearInterval(uploadIntervalRef.current);
      }
    };
  }, []);

  const handleCreateFolder = async (event) => {
    event.preventDefault();
    if (!newFolderName.trim()) return;

    setSavingFolder(true);
    setError("");
    try {
      const safeParentId = isUuid(newFolderParent) ? newFolderParent : null;
      const created = await createFolder({
        name: newFolderName.trim(),
        parentId: safeParentId,
        userId: user.id,
      });
      setFolders((prev) => [...prev, created]);
      setNewFolderName("");
      setNewFolderParent("");
    } catch (folderError) {
      setError(folderError.message);
    } finally {
      setSavingFolder(false);
    }
  };

  const startProgressAnimation = () => {
    setUploadProgress(5);
    uploadIntervalRef.current = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) return prev;
        return prev + 7;
      });
    }, 180);
  };

  const stopProgressAnimation = () => {
    if (uploadIntervalRef.current) {
      clearInterval(uploadIntervalRef.current);
      uploadIntervalRef.current = null;
    }
    setUploadProgress(100);
    setTimeout(() => setUploadProgress(0), 900);
  };

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setError("");
    startProgressAnimation();
    try {
      const safeUploadFolderId = isUuid(uploadFolderId)
        ? uploadFolderId
        : isUuid(selectedFolderId)
          ? selectedFolderId
          : null;

      const createdFile = await uploadStudyFile({
        file: uploadFile,
        userId: user.id,
        folderId: safeUploadFolderId,
        subjectId: uploadSubjectId || null,
      });

      setFiles((prev) => [createdFile, ...prev]);
      setUploadFile(null);
      setUploadSubjectId("");
      setUploadFolderId("");
      event.target.reset();
      stopProgressAnimation();
    } catch (uploadError) {
      setError(uploadError.message);
      setUploadProgress(0);
      if (uploadIntervalRef.current) clearInterval(uploadIntervalRef.current);
    } finally {
      setUploading(false);
    }
  };

  const onDropFile = (event) => {
    event.preventDefault();
    const dropped = event.dataTransfer.files?.[0];
    if (dropped) {
      setUploadFile(dropped);
    }
  };

  if (loading) {
    return <LoadingState label="Preparing your cloud drive..." />;
  }

  return (
    <section className="space-y-5">
      <header>
        <h1 className="text-3xl font-black text-slate-900 dark:text-slate-100">Files & Folders</h1>
        <p className="text-sm text-slate-600 dark:text-slate-300">Google Drive-like workspace with animated interactions.</p>
      </header>

      <ErrorState message={error} />

      <div className="grid gap-4 xl:grid-cols-[320px_1fr]">
        <div className="space-y-4">
          <GlassCard hover={false}>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Folder Tree</h2>
              <button type="button" onClick={() => setSelectedFolderId("")} className="text-xs text-cyan-600">
                Show all
              </button>
            </div>
            <FolderTree tree={folderTree} selectedId={selectedFolderId} onSelect={setSelectedFolderId} />
          </GlassCard>

          <GlassCard hover={false}>
            <h3 className="mb-3 text-sm font-semibold text-slate-900 dark:text-slate-100">Folders</h3>
            <div className="grid grid-cols-2 gap-2">
              {folders.slice(0, 6).map((folder) => (
                <motion.button
                  key={folder.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setSelectedFolderId(folder.id)}
                  className="rounded-xl border border-slate-200 bg-white/70 p-3 text-left text-xs dark:border-slate-700 dark:bg-slate-800/60"
                >
                  <Folder size={14} className="mb-1 text-cyan-600" />
                  <p className="line-clamp-1 font-semibold text-slate-800 dark:text-slate-100">{folder.name}</p>
                </motion.button>
              ))}
            </div>
          </GlassCard>

          {canManageFiles && (
            <GlassCard hover={false}>
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Create Folder</h3>
              <form onSubmit={handleCreateFolder} className="mt-3 space-y-2">
                <input
                  className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  required
                />
                <select
                  className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  value={newFolderParent}
                  onChange={(event) => setNewFolderParent(event.target.value)}
                >
                  <option value="">No parent</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
                <AnimatedButton type="submit" disabled={savingFolder} className="w-full">
                  {savingFolder ? "Creating..." : "Create Folder"}
                </AnimatedButton>
              </form>
            </GlassCard>
          )}
        </div>

        <div className="space-y-4">
          {canManageFiles && (
            <GlassCard hover={false}>
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Upload Zone</h2>
              <form onSubmit={handleUpload} className="mt-3 space-y-3">
                <div
                  onDragOver={(event) => event.preventDefault()}
                  onDrop={onDropFile}
                  className="rounded-2xl border border-dashed border-cyan-300 bg-cyan-50/60 p-6 text-center dark:border-cyan-700 dark:bg-cyan-950/20"
                >
                  <UploadCloud className="mx-auto mb-2 text-cyan-600" />
                  <p className="text-sm text-slate-700 dark:text-slate-200">Drag and drop PDF/image here</p>
                  <p className="text-xs text-slate-500">or use the picker below</p>
                </div>

                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="w-full rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  required
                />

                {uploadFile && (
                  <p className="text-xs text-slate-600 dark:text-slate-300">Selected: {uploadFile.name}</p>
                )}

                <div className="grid gap-2 md:grid-cols-2">
                  <select
                    className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                    value={uploadSubjectId}
                    onChange={(event) => setUploadSubjectId(event.target.value)}
                  >
                    <option value="">Optional subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>{subject.name}</option>
                    ))}
                  </select>

                  <select
                    className="rounded-xl border border-slate-300 bg-white/80 px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800"
                    value={uploadFolderId}
                    onChange={(event) => setUploadFolderId(event.target.value)}
                  >
                    <option value="">Optional folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>{folder.name}</option>
                    ))}
                  </select>
                </div>

                {uploadProgress > 0 && (
                  <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: `${uploadProgress}%` }}
                      className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-emerald-500"
                    />
                  </div>
                )}

                <AnimatedButton type="submit" disabled={uploading} className="w-full">
                  {uploading ? "Uploading..." : "Upload File"}
                </AnimatedButton>
              </form>
            </GlassCard>
          )}

          <GlassCard hover={false}>
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Files</h2>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setViewMode("grid")}
                  className={`rounded-lg p-2 ${viewMode === "grid" ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}
                >
                  <Grid3X3 size={14} />
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode("list")}
                  className={`rounded-lg p-2 ${viewMode === "list" ? "bg-cyan-100 text-cyan-700" : "bg-slate-100 text-slate-500 dark:bg-slate-800"}`}
                >
                  <List size={14} />
                </button>
              </div>
            </div>

            <AnimatePresence mode="wait">
              {viewMode === "grid" ? (
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3"
                >
                  {files.map((file) => (
                    <FileCard key={file.id} file={file} />
                  ))}
                </motion.div>
              ) : (
                <motion.div
                  key="list"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="space-y-2"
                >
                  {files.map((file) => (
                    <div key={file.id} className="flex items-center justify-between rounded-xl border border-slate-200 bg-white/70 p-3 dark:border-slate-700 dark:bg-slate-800/60">
                      <div>
                        <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">{file.name}</p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(file.created_at).toLocaleString()}</p>
                      </div>
                      <a href={file.file_url} target="_blank" rel="noreferrer" className="text-xs font-semibold text-cyan-600">
                        View
                      </a>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </GlassCard>
        </div>
      </div>
    </section>
  );
}
