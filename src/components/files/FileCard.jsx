import { motion } from "framer-motion";
import { Download, FileText, ImageIcon } from "lucide-react";

function isImageFile(name = "") {
  return /\.(png|jpg|jpeg|gif|webp|svg)$/i.test(name);
}

export default function FileCard({ file }) {
  const Icon = isImageFile(file.name) ? ImageIcon : FileText;

  return (
    <motion.article
      whileHover={{ y: -3 }}
      className="rounded-2xl border border-white/30 bg-white/70 p-4 shadow-lg shadow-slate-900/5 backdrop-blur-xl dark:border-slate-700 dark:bg-slate-900/70"
    >
      <div className="mb-3 flex items-center gap-3">
        <div className="rounded-xl bg-cyan-100 p-2 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300">
          <Icon size={18} />
        </div>
        <div>
          <p className="line-clamp-1 text-sm font-semibold text-slate-900 dark:text-slate-100">{file.name}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400">{new Date(file.created_at).toLocaleString()}</p>
        </div>
      </div>

      <a
        href={file.file_url}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
      >
        <Download size={14} />
        Open
      </a>
    </motion.article>
  );
}
