import React, { useState } from 'react';
import { 
  Plus, 
  Search, 
  MessageSquare, 
  FileText, 
  Image as ImageIcon,
  Mic, 
  Headphones,
  Video,
  BarChart3,
  MoreVertical, 
  Edit2, 
  Trash2, 
  Check, 
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
  Star,
  Award,
  Monitor,
  Presentation,
  Settings,
  LogOut,
  Home,
  PlusCircle,
  Clock,
  Folder,
  Wand2,
  Target
} from 'lucide-react';
import { Conversation } from '../types';
import { getFeatureConfig } from '../config/features';
import { useAuth } from '../context/AuthContext';
import { ProfileSettingsModal } from './ProfileSettingsModal';

interface ConversationSidebarProps {
  conversations: Conversation[];
  activeConversationId?: string;
  activeFeatureId?: string;
  onSelectConversation: (conv: Conversation) => void;
  onNewConversation: () => void;
  onRenameConversation: (id: string, newTitle: string) => Promise<void>;
  onDeleteConversation: (id: string) => Promise<void>;
  onToggleFavorite: (id: string) => Promise<void>;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  filterByActiveFeature: boolean;
  onToggleFilterFeature: () => void;
  isOpen: boolean;
  onClose: () => void;
  onNavigate?: (route: string) => void;
}

export const ConversationSidebar: React.FC<ConversationSidebarProps> = ({
  conversations,
  activeConversationId,
  activeFeatureId,
  onSelectConversation,
  onNewConversation,
  onRenameConversation,
  onDeleteConversation,
  onToggleFavorite,
  searchQuery,
  onSearchChange,
  filterByActiveFeature,
  onToggleFilterFeature,
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Sidebar navigation view state: 'default' | 'conversations' | 'favorites' | 'history'
  const [sidebarView, setSidebarView] = useState<'default' | 'conversations' | 'favorites' | 'history'>('default');
  const [expandedToolCategory, setExpandedToolCategory] = useState<'understand' | 'create' | 'practice' | null>(null);

  const { user, logout } = useAuth();
  const activeFeatureConfig = activeFeatureId ? getFeatureConfig(activeFeatureId) : null;

  const displayName = React.useMemo(() => {
    const raw = user?.full_name?.trim() || user?.username?.trim();
    if (!raw) return 'K. Shivaparvathi';
    return raw
      .split(/\s+/)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
      .join(' ');
  }, [user]);

  const userInitial = displayName.charAt(0).toUpperCase() || 'K';

  const startEditing = (conv: Conversation) => {
    setEditingId(conv.id);
    setEditTitle(conv.title);
    setMenuOpenId(null);
  };

  const handleSaveRename = async (id: string) => {
    if (editTitle.trim()) {
      await onRenameConversation(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const handleConfirmDelete = async (id: string) => {
    await onDeleteConversation(id);
    setDeleteConfirmId(null);
    setMenuOpenId(null);
  };

  // Group conversations by date & favorites
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
  const yesterdayStart = todayStart - 24 * 60 * 60 * 1000;

  const favoriteConvs: Conversation[] = [];
  const todayConvs: Conversation[] = [];
  const yesterdayConvs: Conversation[] = [];
  const olderConvs: Conversation[] = [];

  conversations.forEach((conv) => {
    if (conv.is_favorite) {
      favoriteConvs.push(conv);
    }
    const time = new Date(conv.updated_at || conv.created_at).getTime();
    if (time >= todayStart) {
      todayConvs.push(conv);
    } else if (time >= yesterdayStart) {
      yesterdayConvs.push(conv);
    } else {
      olderConvs.push(conv);
    }
  });

  const getFeatureIcon = (feature: string) => {
    switch (feature) {
      case 'document-analysis':
      case 'document':
        return <FileText size={14} className="text-blue-400 shrink-0" />;
      case 'visual-intelligence':
      case 'vision':
        return <ImageIcon size={14} className="text-emerald-400 shrink-0" />;
      case 'ai-interview':
      case 'interview':
        return <Mic size={14} className="text-rose-400 shrink-0" />;
      case 'customer-support':
      case 'support':
        return <Headphones size={14} className="text-emerald-400 shrink-0" />;
      case 'video-audio-review':
      case 'meeting':
        return <Video size={14} className="text-pink-400 shrink-0" />;
      case 'data-study':
      case 'study':
        return <BarChart3 size={14} className="text-indigo-400 shrink-0" />;
      case 'ai-resume-builder':
      case 'resume':
        return <Award size={14} className="text-teal-400 shrink-0" />;
      case 'ai-screen-assistant':
      case 'screen':
        return <Monitor size={14} className="text-cyan-400 shrink-0" />;
      case 'ai-presentation-maker':
      case 'presentation':
        return <Presentation size={14} className="text-violet-400 shrink-0" />;
      default:
        return <MessageSquare size={14} className="text-indigo-400 shrink-0" />;
    }
  };

  const renderSection = (title: string, list: Conversation[], isFavoriteSection = false) => {
    if (list.length === 0) return null;

    return (
      <div className="mb-3">
        <div className={`px-3 py-1 text-[10px] font-semibold uppercase tracking-wider font-mono flex items-center justify-between ${
          isFavoriteSection ? 'text-amber-400' : 'text-slate-500'
        }`}>
          <span className="flex items-center gap-1.5">
            {isFavoriteSection && <Star size={11} className="fill-amber-400 text-amber-400" />}
            <span>{title}</span>
          </span>
          <span className="text-[9px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-400 font-mono">
            {list.length}
          </span>
        </div>
        <div className="space-y-1 mt-1">
          {list.map((conv) => {
            const isActive = conv.id === activeConversationId;
            const isEditing = editingId === conv.id;
            const isConfirmingDelete = deleteConfirmId === conv.id;

            return (
              <div
                key={`${isFavoriteSection ? 'fav_' : ''}${conv.id}`}
                className={`group relative flex items-center justify-between px-3 py-2 rounded-xl text-xs transition-all duration-150 ${
                  isActive
                    ? 'bg-blue-600/20 text-white border border-blue-500/40 shadow-sm font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white border border-transparent'
                }`}
              >
                {/* Editing Inline Form */}
                {isEditing ? (
                  <div className="flex items-center gap-1.5 w-full">
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveRename(conv.id);
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="w-full bg-slate-800 text-white px-2 py-1 rounded border border-blue-500 text-xs focus:outline-none"
                    />
                    <button
                      onClick={() => handleSaveRename(conv.id)}
                      className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded cursor-pointer"
                    >
                      <Check size={14} />
                    </button>
                    <button
                      onClick={() => setEditingId(null)}
                      className="p-1 text-slate-400 hover:bg-slate-800 rounded cursor-pointer"
                    >
                      <X size={14} />
                    </button>
                  </div>
                ) : isConfirmingDelete ? (
                  /* Delete Confirmation Modal / Row */
                  <div className="flex items-center justify-between w-full py-0.5">
                    <span className="text-[11px] text-rose-400 font-medium">Delete chat?</span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleConfirmDelete(conv.id)}
                        className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => setDeleteConfirmId(null)}
                        className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                      >
                        No
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Standard Conversation Row */
                  <>
                    <button
                      onClick={() => {
                        onSelectConversation(conv);
                        onClose();
                      }}
                      className="flex items-center gap-2.5 min-w-0 text-left flex-1 cursor-pointer"
                    >
                      {getFeatureIcon(conv.feature)}
                      <span className="truncate font-medium">{conv.title}</span>
                    </button>

                    {/* Star Favorite Toggle Button */}
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleFavorite(conv.id);
                      }}
                      title={conv.is_favorite ? 'Remove from Favorites' : 'Add to Favorites'}
                      className="p-1 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-slate-800 transition-all cursor-pointer shrink-0"
                    >
                      {conv.is_favorite ? (
                        <Star size={13} className="fill-amber-400 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                      ) : (
                        <Star size={13} className="hover:fill-amber-400/20" />
                      )}
                    </button>

                    {/* Actions Menu Trigger */}
                    <div className="relative">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setMenuOpenId(menuOpenId === conv.id ? null : conv.id);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 transition-opacity cursor-pointer"
                        title="Options"
                      >
                        <MoreVertical size={13} />
                      </button>

                      {/* Dropdown Options */}
                      {menuOpenId === conv.id && (
                        <div
                          className="absolute right-0 top-full mt-1 w-28 bg-slate-900 border border-slate-700 rounded-xl shadow-xl py-1 z-50 text-xs"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => startEditing(conv)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-slate-300 hover:bg-slate-800 hover:text-white cursor-pointer"
                          >
                            <Edit2 size={12} /> Rename
                          </button>
                          <button
                            onClick={() => {
                              setDeleteConfirmId(conv.id);
                              setMenuOpenId(null);
                            }}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-rose-400 hover:bg-rose-500/10 cursor-pointer"
                          >
                            <Trash2 size={12} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // Determine whether to display the conversations drawer or the default view
  const isShowingConversations = sidebarView !== 'default' || (activeFeatureId && activeFeatureId !== 'main');

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-40 md:hidden"
        />
      )}

      {/* Sidebar Panel matching Reference Image 2 deep midnight style */}
      <aside
        className={`fixed top-0 bottom-0 left-0 w-64 bg-[#0a0f1d] border-r border-[#151f38] z-50 transform transition-transform duration-200 ease-in-out md:relative md:translate-x-0 flex flex-col shadow-2xl md:shadow-none select-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* ========================================================
            TOP HEADER: LOGO + TAGLINE (EXACT REFERENCE IMAGE 2)
           ======================================================== */}
        <div className="p-4 pt-5 pb-3 border-b border-[#141e36] flex items-center justify-between shrink-0">
          <button
            onClick={() => {
              onNavigate?.('/');
              setSidebarView('default');
              onClose();
            }}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            {/* Cyan/Blue Soundwave AI Icon */}
            <div className="flex items-center gap-0.5 h-7 px-1.5 py-1 rounded-xl bg-gradient-to-tr from-sky-400 via-blue-500 to-indigo-600 text-white shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform">
              <span className="w-0.5 h-3 bg-white rounded-full" />
              <span className="w-0.5 h-4.5 bg-white rounded-full" />
              <span className="w-0.5 h-2.5 bg-white rounded-full" />
              <span className="w-0.5 h-4 bg-white rounded-full" />
            </div>
            <div>
              <span className="font-extrabold text-white text-[17px] tracking-tight block leading-tight">
                seeSpeak AI
              </span>
              <span className="block text-[11px] text-slate-400 font-medium tracking-wide">
                Think • Create • Achieve
              </span>
            </div>
          </button>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white md:hidden cursor-pointer"
          >
            <ChevronLeft size={19} />
          </button>
        </div>

        {/* Scrollable Center Nav */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden scrollbar-thin scrollbar-thumb-slate-800">
          {/* ========================================================
              PRIMARY NAVIGATION (Home, New Session, Conversations, Favorites, History)
             ======================================================== */}
          <div className="px-3 pt-3 pb-2 space-y-1">
            {/* Home */}
            <button
              onClick={() => {
                onNavigate?.('/');
                setSidebarView('default');
                onClose();
              }}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-semibold transition-all cursor-pointer ${
                (!activeFeatureId || activeFeatureId === 'main') && sidebarView === 'default'
                  ? 'bg-[#2563eb] text-white shadow-md shadow-blue-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
              }`}
            >
              <Home size={16} />
              <span>Home</span>
            </button>

            {/* New Session */}
            <button
              onClick={() => {
                onNewConversation();
                setSidebarView('default');
                onClose();
              }}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-2xl text-[13px] font-medium text-slate-400 hover:text-white hover:bg-slate-850/60 transition-all cursor-pointer"
            >
              <PlusCircle size={16} />
              <span>New Session</span>
            </button>

            {/* Conversations Toggle */}
            <button
              onClick={() => setSidebarView(sidebarView === 'conversations' ? 'default' : 'conversations')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all cursor-pointer ${
                sidebarView === 'conversations'
                  ? 'bg-slate-800/80 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <MessageSquare size={16} />
                <span>Conversations</span>
              </div>
              {conversations.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-800 text-slate-400 font-mono">
                  {conversations.length}
                </span>
              )}
            </button>

            {/* Favorites Toggle */}
            <button
              onClick={() => setSidebarView(sidebarView === 'favorites' ? 'default' : 'favorites')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all cursor-pointer ${
                sidebarView === 'favorites'
                  ? 'bg-slate-800/80 text-amber-300 font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Star size={16} className={favoriteConvs.length > 0 ? 'text-amber-400 fill-amber-400/20' : ''} />
                <span>Favorites</span>
              </div>
              {favoriteConvs.length > 0 && (
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono">
                  {favoriteConvs.length}
                </span>
              )}
            </button>

            {/* History Toggle */}
            <button
              onClick={() => setSidebarView(sidebarView === 'history' ? 'default' : 'history')}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-[13px] font-medium transition-all cursor-pointer ${
                sidebarView === 'history'
                  ? 'bg-slate-800/80 text-white font-semibold'
                  : 'text-slate-400 hover:text-white hover:bg-slate-850/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Clock size={16} />
                <span>History</span>
              </div>
            </button>
          </div>

          {/* ========================================================
              CONVERSATIONS DRAWER (When active)
             ======================================================== */}
          {isShowingConversations && (
            <div className="px-3 pt-1 pb-3 border-t border-[#141e36]">
              {/* Search Bar */}
              <div className="pt-2 pb-2">
                <div className="relative">
                  <Search size={13} className="absolute left-2.5 top-2.5 text-slate-500" />
                  <input
                    type="text"
                    placeholder="Search history..."
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                    className="w-full bg-[#12192e] border border-[#1b2644] text-slate-200 placeholder-slate-500 text-xs rounded-xl pl-7 pr-3 py-1.5 focus:outline-none focus:border-blue-500/70"
                  />
                </div>
              </div>

              {activeFeatureConfig && (
                <div className="flex items-center justify-between px-2 py-1 mb-2 text-[10px] text-slate-400">
                  <span className="truncate font-semibold text-blue-400">
                    {filterByActiveFeature ? activeFeatureConfig.title : 'All History'}
                  </span>
                  <button
                    onClick={onToggleFilterFeature}
                    className="text-slate-500 hover:text-slate-300 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <Filter size={10} />
                    <span>{filterByActiveFeature ? 'All' : 'Filter'}</span>
                  </button>
                </div>
              )}

              {/* List */}
              {sidebarView === 'favorites' ? (
                favoriteConvs.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-4">No favorites saved yet</div>
                ) : (
                  renderSection('Favorites', favoriteConvs, true)
                )
              ) : (
                conversations.length === 0 ? (
                  <div className="text-center text-slate-500 text-xs py-4">No conversations found</div>
                ) : (
                  <>
                    {favoriteConvs.length > 0 && renderSection('Favorites', favoriteConvs, true)}
                    {renderSection('Today', todayConvs)}
                    {renderSection('Yesterday', yesterdayConvs)}
                    {renderSection('Older', olderConvs)}
                  </>
                )
              )}
            </div>
          )}

          {/* ========================================================
              AI TOOLS SECTION (Understand, Create, Practice)
             ======================================================== */}
          <div className="px-3 pt-2 pb-2">
            <div className="px-3.5 py-1 text-[10px] font-bold text-slate-500 uppercase tracking-widest font-mono">
              AI TOOLS
            </div>

            <div className="space-y-0.5 mt-1">
              {/* Understand */}
              <div>
                <button
                  onClick={() => setExpandedToolCategory(expandedToolCategory === 'understand' ? null : 'understand')}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    ['document-analysis', 'visual-intelligence', 'video-audio-review', 'data-study'].includes(activeFeatureId || '')
                      ? 'text-blue-400 bg-blue-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Folder size={15} />
                    <span>Understand</span>
                  </div>
                  <ChevronRight size={13} className={`transition-transform duration-200 ${expandedToolCategory === 'understand' ? 'rotate-90 text-white' : ''}`} />
                </button>

                {expandedToolCategory === 'understand' && (
                  <div className="pl-7 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => { onNavigate?.('/document-analysis'); onClose(); }}
                      className="w-full text-left py-1.5 px-2 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-blue-400" />
                      <span className="truncate">Document Analysis</span>
                    </button>
                    <button
                      onClick={() => { onNavigate?.('/visual-intelligence'); onClose(); }}
                      className="w-full text-left py-1.5 px-2 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="truncate">Visual Intelligence</span>
                    </button>
                    <button
                      onClick={() => { onNavigate?.('/video-audio-review'); onClose(); }}
                      className="w-full text-left py-1.5 px-2 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-pink-400" />
                      <span className="truncate">Video & Audio Review</span>
                    </button>
                    <button
                      onClick={() => { onNavigate?.('/data-study'); onClose(); }}
                      className="w-full text-left py-1.5 px-2 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                      <span className="truncate">Data & Study Assistant</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Create */}
              <div>
                <button
                  onClick={() => setExpandedToolCategory(expandedToolCategory === 'create' ? null : 'create')}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    ['customer-support', 'ai-resume-builder', 'ai-presentation-maker'].includes(activeFeatureId || '')
                      ? 'text-blue-400 bg-blue-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Wand2 size={15} />
                    <span>Create</span>
                  </div>
                  <ChevronRight size={13} className={`transition-transform duration-200 ${expandedToolCategory === 'create' ? 'rotate-90 text-white' : ''}`} />
                </button>

                {expandedToolCategory === 'create' && (
                  <div className="pl-7 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => { onNavigate?.('/customer-support'); onClose(); }}
                      className="w-full text-left py-1.5 px-2 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                      <span className="truncate">Customer Support Agent</span>
                    </button>
                    <button
                      onClick={() => { onNavigate?.('/ai-resume-builder'); onClose(); }}
                      className="w-full text-left py-1.5 px-2 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-teal-400" />
                      <span className="truncate">AI Resume Builder</span>
                    </button>
                    <button
                      onClick={() => { onNavigate?.('/ai-presentation-maker'); onClose(); }}
                      className="w-full text-left py-1.5 px-2 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-violet-400" />
                      <span className="truncate">AI Presentation Maker</span>
                    </button>
                  </div>
                )}
              </div>

              {/* Practice */}
              <div>
                <button
                  onClick={() => setExpandedToolCategory(expandedToolCategory === 'practice' ? null : 'practice')}
                  className={`w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                    ['ai-interview', 'ai-screen-assistant'].includes(activeFeatureId || '')
                      ? 'text-blue-400 bg-blue-950/40'
                      : 'text-slate-400 hover:text-white hover:bg-slate-850/50'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Target size={15} />
                    <span>Practice</span>
                  </div>
                  <ChevronRight size={13} className={`transition-transform duration-200 ${expandedToolCategory === 'practice' ? 'rotate-90 text-white' : ''}`} />
                </button>

                {expandedToolCategory === 'practice' && (
                  <div className="pl-7 pr-2 py-1 space-y-1">
                    <button
                      onClick={() => { onNavigate?.('/ai-interview'); onClose(); }}
                      className="w-full text-left py-1.5 px-2 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                      <span className="truncate">AI Interview Practice</span>
                    </button>
                    <button
                      onClick={() => { onNavigate?.('/ai-screen-assistant'); onClose(); }}
                      className="w-full text-left py-1.5 px-2 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-slate-800/60 flex items-center gap-2 cursor-pointer"
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                      <span className="truncate">AI Screen Assistant</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* ========================================================
              PROMO CARD WIDGET (EXACT IMAGE 2)
             ======================================================== */}
          {!isShowingConversations && (
            <div className="px-3 py-3">
              <div className="w-full rounded-2xl overflow-hidden border border-[#172545] shadow-lg relative bg-gradient-to-br from-[#0c162d] via-[#101c38] to-[#17254b] p-3 text-white">
                <img 
                  src="/sidebar_promo.png" 
                  alt="Your Ideas Our AI Power - Explore. Create. Grow." 
                  className="w-full h-auto rounded-xl object-contain drop-shadow" 
                />
              </div>
            </div>
          )}
        </div>

        {/* ========================================================
            FOOTER: SETTINGS + REAL USER PROFILE (EXACT IMAGE 2)
           ======================================================== */}
        <div className="p-3 border-t border-[#141e36] bg-[#090e1b] relative shrink-0">
          {/* User Popup Dropdown Menu */}
          {isUserMenuOpen && (
            <>
              <div 
                className="fixed inset-0 z-40" 
                onClick={() => setIsUserMenuOpen(false)} 
              />
              <div className="absolute bottom-full left-2 right-2 mb-2 p-1.5 bg-[#0f172a] border border-[#1e293b] rounded-2xl shadow-2xl z-50 animate-fadeIn">
                <div className="px-3 py-2 border-b border-slate-800">
                  <p className="text-xs font-bold text-white truncate">
                    {displayName}
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono truncate">
                    {user?.email || 'shivaparvathi@gmail.com'}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setIsUserMenuOpen(false);
                    setIsProfileModalOpen(true);
                  }}
                  className="w-full mt-1 px-3 py-2 rounded-xl text-xs font-medium text-slate-300 hover:bg-slate-800 hover:text-white flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <Settings size={14} className="text-slate-400" />
                  <span>Account & Settings</span>
                </button>
                <button
                  onClick={async () => {
                    setIsUserMenuOpen(false);
                    await logout();
                  }}
                  className="w-full px-3 py-2 rounded-xl text-xs font-medium text-rose-400 hover:bg-rose-950/40 flex items-center gap-2 transition-colors cursor-pointer"
                >
                  <LogOut size={14} />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          )}

          {/* Settings Link */}
          <button
            onClick={() => setIsProfileModalOpen(true)}
            className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-850/60 transition-colors cursor-pointer mb-1"
          >
            <Settings size={15} />
            <span>Settings</span>
          </button>

          {/* User Profile Card */}
          <div className="pt-1.5 border-t border-[#141e36]">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="w-full flex items-center justify-between p-1.5 rounded-xl hover:bg-slate-850/60 transition-colors cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 via-indigo-600 to-purple-600 text-white font-bold flex items-center justify-center text-xs shrink-0 shadow-md">
                  {userInitial}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold text-white truncate leading-tight group-hover:text-blue-300 transition-colors">
                    {displayName}
                  </p>
                  <p className="text-[10px] text-slate-400 font-mono truncate">
                    {user?.email || (user?.username ? `@${user.username}` : 'shivaparvathi@gmail.com')}
                  </p>
                </div>
              </div>
              <ChevronRight size={14} className="text-slate-500 group-hover:text-slate-300 shrink-0 ml-1" />
            </button>
          </div>
        </div>
      </aside>

      <ProfileSettingsModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </>
  );
};

export default ConversationSidebar;
