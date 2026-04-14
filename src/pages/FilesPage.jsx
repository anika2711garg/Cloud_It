import { useEffect, useMemo, useState } from "react";
import FolderTree from "../components/folders/FolderTree";
import { useAuth } from "../context/AuthContext";
import {
  buildFolderTree,
  createFolder,
  listFiles,
  listFolders,
  listSubjects,
  uploadStudyFile,
} from "../services/studyHubApi";
import { ErrorState, LoadingState } from "../components/shared/StatusMessage";

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

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [savingFolder, setSavingFolder] = useState(false);
  const [uploading, setUploading] = useState(false);

  const folderTree = useMemo(() => buildFolderTree(folders), [folders]);

  const loadData = async () => {
    if (!user?.id) return;

    setLoading(true);
    setError("");
    try {
      const [foldersData, filesData, subjectsData] = await Promise.all([
        listFolders(user.id),
        listFiles(user.id, selectedFolderId || undefined),
        listSubjects(user.id),
      ]);
      setFolders(foldersData);
      setFiles(filesData);
      setSubjects(subjectsData);
    } catch (loadError) {
      setError(loadError.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.id, selectedFolderId]);

  const handleCreateFolder = async (event) => {
    event.preventDefault();
    if (!newFolderName.trim()) return;

    setSavingFolder(true);
    setError("");
    try {
      const created = await createFolder({
        name: newFolderName.trim(),
        parentId: newFolderParent || null,
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

  const handleUpload = async (event) => {
    event.preventDefault();
    if (!uploadFile) return;

    setUploading(true);
    setError("");
    try {
      const createdFile = await uploadStudyFile({
        file: uploadFile,
        userId: user.id,
        folderId: uploadFolderId || selectedFolderId || null,
        subjectId: uploadSubjectId || null,
      });
      setFiles((prev) => [createdFile, ...prev]);
      setUploadFile(null);
      setUploadSubjectId("");
      setUploadFolderId("");
      event.target.reset();
    } catch (uploadError) {
      setError(uploadError.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <section className="space-y-5">
      <header>
        <h1 className="font-serif text-3xl text-slate-900">Files & Folders</h1>
        <p className="text-sm text-slate-600">Upload PDFs/images and organize them like cloud storage.</p>
      </header>

      <ErrorState message={error} />

      {loading ? (
        <LoadingState label="Loading folders and files..." />
      ) : (
        <div className="grid gap-4 xl:grid-cols-[360px_1fr]">
          <aside className="space-y-4">
            <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="font-semibold text-slate-900">Folder Tree</h2>
                <button
                  type="button"
                  onClick={() => setSelectedFolderId("")}
                  className="text-xs text-cyan-700"
                >
                  Show all files
                </button>
              </div>
              <FolderTree tree={folderTree} selectedId={selectedFolderId} onSelect={setSelectedFolderId} />
            </div>

            {canManageFiles ? (
              <form
                onSubmit={handleCreateFolder}
                className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <h3 className="font-semibold text-slate-900">Create Folder</h3>
                <input
                  className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Folder name"
                  value={newFolderName}
                  onChange={(event) => setNewFolderName(event.target.value)}
                  required
                />
                <select
                  className="mt-2 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  value={newFolderParent}
                  onChange={(event) => setNewFolderParent(event.target.value)}
                >
                  <option value="">No parent (root)</option>
                  {folders.map((folder) => (
                    <option key={folder.id} value={folder.id}>
                      {folder.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  disabled={savingFolder}
                  className="mt-3 w-full rounded-md bg-cyan-700 px-4 py-2 text-sm font-semibold text-white hover:bg-cyan-600"
                >
                  {savingFolder ? "Creating..." : "Create folder"}
                </button>
              </form>
            ) : (
              <div className="rounded-xl border border-slate-200 bg-white p-4 text-sm text-slate-600 shadow-sm">
                Student mode can view and download files. Switch to Teacher mode to create folders.
              </div>
            )}
          </aside>

          <div className="space-y-4">
            {canManageFiles && (
              <form onSubmit={handleUpload} className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
                <h2 className="font-semibold text-slate-900">Upload Study File</h2>
                <p className="text-xs text-slate-500">Supported: PDF and image files</p>
                <input
                  type="file"
                  accept="application/pdf,image/*"
                  className="mt-3 w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                  onChange={(event) => setUploadFile(event.target.files?.[0] ?? null)}
                  required
                />
                <div className="mt-2 grid gap-2 md:grid-cols-2">
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={uploadSubjectId}
                    onChange={(event) => setUploadSubjectId(event.target.value)}
                  >
                    <option value="">Optional subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                  <select
                    className="rounded-md border border-slate-300 px-3 py-2 text-sm"
                    value={uploadFolderId}
                    onChange={(event) => setUploadFolderId(event.target.value)}
                  >
                    <option value="">Optional folder</option>
                    {folders.map((folder) => (
                      <option key={folder.id} value={folder.id}>
                        {folder.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="submit"
                  disabled={uploading}
                  className="mt-3 rounded-md bg-slate-900 px-4 py-2 text-sm font-semibold text-white hover:bg-slate-700"
                >
                  {uploading ? "Uploading..." : "Upload file"}
                </button>
              </form>
            )}

            <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="font-semibold text-slate-900">Uploaded Files</h2>
              <div className="mt-3 overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500">
                      <th className="px-2 py-2 font-medium">File</th>
                      <th className="px-2 py-2 font-medium">Uploaded</th>
                      <th className="px-2 py-2 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {files.length === 0 ? (
                      <tr>
                        <td colSpan={3} className="px-2 py-4 text-slate-500">
                          No files found for this view.
                        </td>
                      </tr>
                    ) : (
                      files.map((file) => (
                        <tr key={file.id} className="border-b border-slate-100">
                          <td className="px-2 py-2 text-slate-900">{file.name}</td>
                          <td className="px-2 py-2 text-slate-500">
                            {new Date(file.created_at).toLocaleString()}
                          </td>
                          <td className="px-2 py-2">
                            <a
                              className="text-cyan-700 hover:text-cyan-600"
                              href={file.file_url}
                              target="_blank"
                              rel="noreferrer"
                            >
                              View / Download
                            </a>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
      )}
    </section>
  );
}
