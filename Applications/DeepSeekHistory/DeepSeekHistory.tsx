import React, { useState } from 'react';

// Fragment Item Component for collapsible THINK blocks
const FragmentItem = ({ frag }: { frag: any }) => {
  const isThink = frag.type === 'THINK';
  const [isOpen, setIsOpen] = useState(!isThink);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(frag.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mb-2 last:mb-0 overflow-hidden">
      <div
        className={`inline-flex items-center ${isThink ? 'cursor-pointer hover:opacity-80' : ''}`}
        onClick={() => isThink && setIsOpen(!isOpen)}
      >
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase mr-2 text-white flex items-center gap-1 ${
            frag.type === 'THINK' ? 'bg-purple-500' : frag.type === 'REQUEST' ? 'bg-blue-500' : 'bg-green-600'
          }`}
        >
          {isThink && <span className="font-mono font-bold w-3 text-center">{isOpen ? '−' : '+'}</span>}
          {frag.type}
        </span>
      </div>
      {isOpen && (
        <div className="relative mt-1 group">
          <button
            onClick={handleCopy}
            title="Copy"
            className="absolute top-2 right-2 px-2 py-1 text-[10px] font-semibold bg-gray-100 text-gray-700 border border-gray-300 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-gray-200 z-10 shadow-sm"
          >
            {copied ? 'Copied!' : 'Copy'}
          </button>
          <pre className="whitespace-pre-wrap font-sans text-gray-700 bg-white border border-gray-200 p-3 pr-14 rounded text-sm overflow-x-auto">
            {frag.content}
          </pre>
        </div>
      )}
    </div>
  );
};

// Recursive Node Component
const TreeNode = ({ nodeId, mapping }: { nodeId: string; mapping: any }) => {
  const [isOpen, setIsOpen] = useState(false);
  const node = mapping[nodeId];

  if (!node) return null;

  const hasChildren = node.children && node.children.length > 0;
  const hasMessage = node.message && node.message.fragments;

  const totalDescendants = React.useMemo(() => {
    if (!hasChildren) return 0;
    const countDescendants = (id: string, map: any, visited = new Set<string>()): number => {
      if (visited.has(id)) return 0;
      visited.add(id);
      const n = map[id];
      if (!n || !n.children || n.children.length === 0) return 0;
      let count = n.children.length;
      for (const childId of n.children) {
        count += countDescendants(childId, map, visited);
      }
      return count;
    };
    return countDescendants(nodeId, mapping);
  }, [nodeId, mapping, hasChildren]);

  // Extract a preview for the summary line
  const getPreview = () => {
    if (!hasMessage) return `Node: ${nodeId}`;
    const nonThink = node.message.fragments.find((f: any) => f.type !== 'THINK' && f.content);
    if (nonThink) return nonThink.content;
    return node.message.fragments.find((f: any) => f.content)?.content || '';
  };

  return (
    <div className="border-l border-gray-200 ps-4 pt-4 pb-4 w-full overflow-hidden">
      <div
        className="flex items-center cursor-pointer hover:text-blue-600 transition-colors w-full overflow-hidden pe-4"
        onClick={() => setIsOpen(!isOpen)}
      >
        <span className="font-mono font-bold mr-2 w-4 flex-shrink-0">{isOpen ? '−' : '+'}</span>
        <span className="font-semibold text-sm truncate flex-1">{getPreview()}</span>
        {hasChildren && (
          <span className="ml-2 text-xs text-gray-400 font-medium whitespace-nowrap flex-shrink-0">
            ({totalDescendants} {totalDescendants === 1 ? 'node' : 'nodes'}, {node.children.length} {node.children.length === 1 ? 'child' : 'children'})
          </span>
        )}
      </div>

      {isOpen && (
        <div className="mt-2">
          {/* Render Message Fragments */}
          {hasMessage && (
            <div className="bg-gray-50 ps-3 pt-3 pb-3 rounded border border-gray-100 text-sm">
              {node.message.fragments.map((frag: any, idx: number) => (
                <FragmentItem key={idx} frag={frag} />
              ))}
            </div>
          )}

          {/* Render Children Recursively */}
          {hasChildren && (
            <div className="flex flex-col gap-2 border">
              {node.children.map((childId: string) => (
                <TreeNode key={childId} nodeId={childId} mapping={mapping} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// Main History Container
const DeepSeekHistory = () => {
  const [historyData, setHistoryData] = useState<any[] | null>(null);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const json = JSON.parse(event.target?.result as string);
        setHistoryData(Array.isArray(json) ? json : [json]);
      } catch (err: any) {
        alert('Failed to parse JSON: ' + err.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="w-full h-full overflow-auto bg-white p-6">
      <header className="mb-8 border-b pb-4">
        <h1 className="text-2xl font-bold text-gray-800">History Explorer</h1>
        <input
          type="file"
          accept=".json"
          onChange={handleFileUpload}
          className="mt-4 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
        />
      </header>

      {!historyData ? (
        <div className="text-center py-20 text-gray-400">Upload your history.json to begin.</div>
      ) : (
        historyData.map((convo) => (
          <div key={convo.id} className="mb-6 border border-gray-200 rounded-lg p-4">
            <h2 className="text-lg font-bold text-blue-800 mb-2 border-b pb-2">{convo.title || 'Untitled Conversation'}</h2>
            {/* Start recursion from the mapping's root node */}
            {convo.mapping?.root?.children?.map((childId: string) => (
              <TreeNode key={childId} nodeId={childId} mapping={convo.mapping} />
            ))}
          </div>
        ))
      )}
    </div>
  );
};

export default DeepSeekHistory;
