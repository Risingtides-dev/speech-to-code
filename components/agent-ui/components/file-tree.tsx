'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';
import { ChevronRight, File, Folder, FolderOpen } from 'lucide-react';

interface FileNode {
  name: string;
  type: 'file' | 'directory';
  children?: FileNode[];
  icon?: string;
}

interface FileTreeProps {
  files: FileNode[];
  selectedPath?: string;
  onSelect?: (path: string) => void;
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  return (
    <div className="rounded-lg border bg-card overflow-hidden">
      <div className="p-2">
        {files.map((file, index) => (
          <FileTreeNode
            key={index}
            node={file}
            path={file.name}
            selectedPath={selectedPath}
            onSelect={onSelect}
            depth={0}
          />
        ))}
      </div>
    </div>
  );
}

interface FileTreeNodeProps {
  node: FileNode;
  path: string;
  selectedPath?: string;
  onSelect?: (path: string) => void;
  depth: number;
}

function FileTreeNode({ node, path, selectedPath, onSelect, depth }: FileTreeNodeProps) {
  const [isOpen, setIsOpen] = useState(depth < 2);
  const isSelected = path === selectedPath;
  const isDirectory = node.type === 'directory';
  const hasChildren = node.children && node.children.length > 0;

  const handleClick = () => {
    if (isDirectory && hasChildren) {
      setIsOpen(!isOpen);
    }
    onSelect?.(path);
  };

  return (
    <div>
      <button
        onClick={handleClick}
        className={cn(
          'w-full flex items-center gap-1.5 px-2 py-1 rounded text-sm hover:bg-muted/50 transition-colors',
          isSelected && 'bg-primary/10 text-primary'
        )}
        style={{ paddingLeft: `${depth * 16 + 8}px` }}
      >
        {/* Expand/collapse icon */}
        {isDirectory && hasChildren ? (
          <ChevronRight
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-90'
            )}
          />
        ) : (
          <span className="w-4" />
        )}

        {/* File/folder icon */}
        {isDirectory ? (
          isOpen ? (
            <FolderOpen className="h-4 w-4 text-amber-500" />
          ) : (
            <Folder className="h-4 w-4 text-amber-500" />
          )
        ) : (
          <File className="h-4 w-4 text-muted-foreground" />
        )}

        {/* Name */}
        <span className="truncate">{node.name}</span>
      </button>

      {/* Children */}
      {isDirectory && hasChildren && isOpen && (
        <div>
          {node.children!.map((child, index) => (
            <FileTreeNode
              key={index}
              node={child}
              path={`${path}/${child.name}`}
              selectedPath={selectedPath}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}
