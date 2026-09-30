'use client';

import React, { useState } from 'react';
import { 
  MessageSquare, 
  Trash2, 
  Edit2, 
  Check, 
  X, 
  Search, 
  Plus, 
  Files, 
  FolderArchive,
  ChevronRight
} from 'lucide-react';
import { Conversation } from '@/lib/types';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string;
  onSelectConversation: (id: string) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onDeleteConversation: (id: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  isOpen,
  onClose,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Group conversations by Today, Yesterday, and Older
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;

  const today = filtered.filter((c) => now - c.updatedAt < oneDay);
  const yesterday = filtered.filter(
    (c) => now - c.updatedAt >= oneDay && now - c.updatedAt < 2 * oneDay
  );
  const older = filtered.filter((c) => now - c.updatedAt >= 2 * oneDay);

  const startRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const renderConvItem = (c: Conversation) => {
    const isActive = c.id === activeId;
    const isEditing = c.id === editingId;

    return (
      <div
        key={c.id}
        onClick={() => {
          onSelectConversation(c.id);
          if (window.innerWidth < 1024) onClose();
        }}
        className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer transition-all text-xs md:text-sm ${
          isActive
            ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/30 font-medium'
            : 'text-slate-400 hover:bg-slate-800/60 hover:text-slate-200 border border-transparent'
        }`}
      >
        <div className="flex items-center gap-2.5 truncate flex-1 min-w-0 mr-1">
          <MessageSquare
            size={15}
            className={`shrink-0 ${isActive ? 'text-indigo-400' : 'text-slate-500'}`}
          />
          {isEditing ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onClick={(e) => e.stopPropagation()}
              className="bg-slate-900 text-white px-2 py-0.5 rounded border border-indigo-500 focus:outline-none w-full text-xs"
              autoFocus
            />
          ) : (
            <span className="truncate">{c.title}</span>
          )}
        </div>

        {/* Action icons */}
        {isEditing ? (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={(e) => saveRename(c.id, e)}
              className="p-1 text-emerald-400 hover:bg-slate-800 rounded"
            >
              <Check size={13} />
            </button>
            <button onClick={cancelRename} className="p-1 text-slate-400 hover:bg-slate-800 rounded">
              <X size={13} />
            </button>
          </div>
        ) : (
          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 shrink-0 transition-opacity">
            <button
              onClick={(e) => startRename(c, e)}
              title="Rename chat"
              className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded"
            >
              <Edit2 size={12} />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onDeleteConversation(c.id);
              }}
              title="Delete chat"
              className="p-1 text-rose-400 hover:text-rose-300 hover:bg-slate-800 rounded"
            >
              <Trash2 size={12} />
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 w-72 md:w-80 bg-slate-950 border-r border-slate-800/80 flex flex-col z-50 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top: New Chat + Close for mobile */}
        <div className="p-4 border-b border-slate-800/80 flex items-center justify-between gap-2">
          <button
            onClick={() => {
              onNewConversation();
              if (window.innerWidth < 1024) onClose();
            }}
            className="flex-1 flex items-center justify-center gap-2 py-2 px-3 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white rounded-xl text-xs md:text-sm font-semibold shadow-md shadow-indigo-600/20 transition-all"
          >
            <Plus size={16} />
            <span>New Chat</span>
          </button>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg lg:hidden"
          >
            <X size={18} />
          </button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-slate-800/50">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-2.5 text-slate-500" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-slate-900/80 border border-slate-800 rounded-lg py-1.5 pl-8 pr-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500/80"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto p-3 space-y-4 select-none">
          {conversations.length === 0 ? (
            <div className="text-center py-10 px-4">
              <FolderArchive size={28} className="mx-auto text-slate-600 mb-2" />
              <p className="text-xs text-slate-400">No conversations yet.</p>
              <p className="text-[11px] text-slate-500 mt-1">
                Start a new chat to begin asking questions or uploading files.
              </p>
            </div>
          ) : (
            <>
              {today.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 px-3 uppercase tracking-wider">
                    Today
                  </span>
                  {today.map(renderConvItem)}
                </div>
              )}

              {yesterday.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 px-3 uppercase tracking-wider">
                    Yesterday
                  </span>
                  {yesterday.map(renderConvItem)}
                </div>
              )}

              {older.length > 0 && (
                <div className="space-y-1">
                  <span className="text-[11px] font-semibold text-slate-500 px-3 uppercase tracking-wider">
                    Previous
                  </span>
                  {older.map(renderConvItem)}
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800/80 bg-slate-900/40 text-[11px] text-slate-500 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Multimodal Agent Ready</span>
          </div>
          <span className="font-mono text-[10px]">v2.5 Pro</span>
        </div>
      </aside>
    </>
  );
};
