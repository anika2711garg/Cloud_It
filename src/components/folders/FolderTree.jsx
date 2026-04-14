function TreeNode({ node, selectedId, onSelect }) {
  return (
    <li className="space-y-1">
      <button
        type="button"
        onClick={() => onSelect(node.id)}
        className={`w-full rounded-md px-2 py-1 text-left text-sm transition ${
          selectedId === node.id
            ? "bg-cyan-100 text-cyan-800"
            : "text-slate-700 hover:bg-slate-100"
        }`}
      >
        {node.name}
      </button>
      {node.children.length > 0 && (
        <ul className="ml-3 border-l border-slate-200 pl-2">
          {node.children.map((child) => (
            <TreeNode key={child.id} node={child} selectedId={selectedId} onSelect={onSelect} />
          ))}
        </ul>
      )}
    </li>
  );
}

export default function FolderTree({ tree, selectedId, onSelect }) {
  if (tree.length === 0) {
    return <p className="text-sm text-slate-500">No folders yet.</p>;
  }

  return (
    <ul className="space-y-1">
      {tree.map((node) => (
        <TreeNode key={node.id} node={node} selectedId={selectedId} onSelect={onSelect} />
      ))}
    </ul>
  );
}
