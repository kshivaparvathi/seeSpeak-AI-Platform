import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { HomePage } from './pages/HomePage';
import { InterviewSession } from './pages/InterviewSession';
import { SupportSession } from './pages/SupportSession';
import { FeatureWorkspace } from './pages/FeatureWorkspace';
import { ConversationSidebar } from './components/ConversationSidebar';
import { AIIntro } from './components/AIIntro';
import { Conversation, SupportedLanguage } from './types';
import { getFeatureConfig } from './config/features';
import { Menu } from 'lucide-react';

export const App: React.FC = () => {
  // Show intro screen ONLY on explicit /intro route; root / directly opens Main Dashboard
  const [showIntro, setShowIntro] = useState<boolean>(() => {
    return window.location.pathname === '/intro';
  });

  // Current route
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  // Feature-isolated conversation IDs map: { [featureId]: conversationId }
  const [activeConversationByFeature, setActiveConversationByFeature] = useState<Record<string, string | undefined>>({});

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterByActiveFeature, setFilterByActiveFeature] = useState(true);
  const [selectedLanguage, setSelectedLanguage] = useState<SupportedLanguage>('en');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [initialPrompt, setInitialPrompt] = useState<string | undefined>(undefined);

  // Sync route with browser history
  useEffect(() => {
    const handlePopState = () => {
      setCurrentRoute(window.location.pathname);
      if (window.location.pathname === '/intro') {
        setShowIntro(true);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const navigate = (route: string) => {
    window.history.pushState({}, '', route);
    setCurrentRoute(route);
    setIsSidebarOpen(false);
    if (route === '/intro') {
      setShowIntro(true);
    }
  };

  const handleEnterApp = () => {
    sessionStorage.setItem('seespeak_intro_seen', 'true');
    setShowIntro(false);
    if (currentRoute === '/intro') {
      navigate('/');
    }
  };

  // Parse active feature & conversation ID from the URL
  const { currentFeatureId, routeConversationId } = useMemo(() => {
    const clean = currentRoute.replace(/^\//, '');
    if (!clean) return { currentFeatureId: undefined, routeConversationId: undefined };

    // Format: /:featureId/c/:conversationId
    if (clean.includes('/c/')) {
      const parts = clean.split('/c/');
      const featConfig = getFeatureConfig(parts[0]);
      return {
        currentFeatureId: featConfig.id,
        routeConversationId: parts[1] || undefined,
      };
    }

    // Direct feature route (e.g. /document-analysis or /ai-interview)
    const featConfig = getFeatureConfig(clean);
    return {
      currentFeatureId: featConfig.id,
      routeConversationId: undefined,
    };
  }, [currentRoute]);

  // Determine active conversation for the active feature
  const activeConversationId = useMemo(() => {
    if (routeConversationId) return routeConversationId;
    if (currentFeatureId) {
      return activeConversationByFeature[currentFeatureId];
    }
    return undefined;
  }, [routeConversationId, currentFeatureId, activeConversationByFeature]);

  // Fetch conversation history (scoped by feature if inside a feature workspace)
  const fetchConversations = useCallback(
    async (query: string = '', featureFilter?: string) => {
      try {
        const params = new URLSearchParams();
        if (query.trim()) params.append('q', query.trim());
        if (featureFilter && featureFilter !== 'all') {
          params.append('feature', featureFilter);
        }

        const qs = params.toString();
        const url = qs ? `/api/conversations?${qs}` : '/api/conversations';
        const res = await fetch(url);
        if (res.ok) {
          const data: Conversation[] = await res.json();
          setConversations(data);
        }
      } catch (e) {
        console.error('Failed to fetch conversations:', e);
      }
    },
    []
  );

  // Re-fetch conversations when feature, search query, or filter toggle changes
  useEffect(() => {
    const targetFeature = filterByActiveFeature ? currentFeatureId : undefined;
    fetchConversations(searchQuery, targetFeature);
  }, [fetchConversations, searchQuery, currentFeatureId, filterByActiveFeature]);

  // Rename Conversation
  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (res.ok) {
        const targetFeature = filterByActiveFeature ? currentFeatureId : undefined;
        await fetchConversations(searchQuery, targetFeature);
      }
    } catch (e) {
      console.error('Failed to rename conversation:', e);
    }
  };

  // Delete Conversation
  const handleDeleteConversation = async (id: string) => {
    try {
      const res = await fetch(`/api/conversations/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        if (activeConversationId === id) {
          if (currentFeatureId) {
            setActiveConversationByFeature((prev) => ({
              ...prev,
              [currentFeatureId]: undefined,
            }));
            navigate(`/${currentFeatureId}`);
          } else {
            navigate('/');
          }
        }
        const targetFeature = filterByActiveFeature ? currentFeatureId : undefined;
        await fetchConversations(searchQuery, targetFeature);
      }
    } catch (e) {
      console.error('Failed to delete conversation:', e);
    }
  };

  // Toggle Favorite Status (Optimistic UI update + Backend persistence)
  const handleToggleFavorite = async (id: string) => {
    // 1. Optimistic update
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, is_favorite: !c.is_favorite } : c))
    );

    // 2. Persist to SQLite
    try {
      const res = await fetch(`/api/conversations/${id}/favorite`, {
        method: 'POST',
      });
      if (res.ok) {
        const data = await res.json();
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, is_favorite: data.is_favorite } : c))
        );
      } else {
        const targetFeature = filterByActiveFeature ? currentFeatureId : undefined;
        await fetchConversations(searchQuery, targetFeature);
      }
    } catch (e) {
      console.error('Failed to toggle favorite:', e);
      const targetFeature = filterByActiveFeature ? currentFeatureId : undefined;
      await fetchConversations(searchQuery, targetFeature);
    }
  };

  // Select a Conversation from History -> Restore in its own dedicated workspace
  const handleSelectConversation = async (conv: Conversation) => {
    const featConfig = getFeatureConfig(conv.feature);
    const targetFeatureId = featConfig.id;

    // Set feature-scoped active ID
    setActiveConversationByFeature((prev) => ({
      ...prev,
      [targetFeatureId]: conv.id,
    }));

    if (conv.language) {
      setSelectedLanguage(conv.language);
    }

    // Navigate to feature-scoped conversation route
    navigate(`/${targetFeatureId}/c/${conv.id}`);
  };

  // Start New Conversation strictly inside the current workspace
  const handleNewConversation = () => {
    if (currentFeatureId && currentFeatureId !== 'main') {
      setActiveConversationByFeature((prev) => ({
        ...prev,
        [currentFeatureId]: undefined,
      }));
      setInitialPrompt(undefined);
      navigate(`/${currentFeatureId}`);
    } else {
      setActiveConversationByFeature((prev) => ({
        ...prev,
        main: undefined,
      }));
      setInitialPrompt(undefined);
      navigate('/');
    }
  };

  // Select Quick Prompt from Home
  const handleSelectPrompt = (prompt: string, featureId: string) => {
    const featConfig = getFeatureConfig(featureId);
    setActiveConversationByFeature((prev) => ({
      ...prev,
      [featConfig.id]: undefined,
    }));
    setInitialPrompt(prompt);
    navigate(`/${featConfig.id}`);
  };

  // Render Page Content based on Route
  const renderContent = () => {
    if (currentFeatureId === 'ai-interview') {
      return (
        <InterviewSession
          key={activeConversationId || 'new_interview'}
          onBack={() => navigate('/')}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          onSelectFeature={(r) => navigate(r)}
          onNewConversation={handleNewConversation}
          conversationId={activeConversationId}
          onConversationCreated={(newConv) => {
            setActiveConversationByFeature((prev) => ({
              ...prev,
              'ai-interview': newConv.id,
            }));
            const targetFeature = filterByActiveFeature ? 'ai-interview' : undefined;
            fetchConversations(searchQuery, targetFeature);
          }}
          initialPrompt={initialPrompt}
        />
      );
    }

    if (currentFeatureId === 'customer-support') {
      return (
        <SupportSession
          key={activeConversationId || 'new_support'}
          onBack={() => navigate('/')}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          onSelectFeature={(r) => navigate(r)}
          onNewConversation={handleNewConversation}
          conversationId={activeConversationId}
          onConversationCreated={(newConv) => {
            setActiveConversationByFeature((prev) => ({
              ...prev,
              'customer-support': newConv.id,
            }));
            const targetFeature = filterByActiveFeature ? 'customer-support' : undefined;
            fetchConversations(searchQuery, targetFeature);
          }}
          initialPrompt={initialPrompt}
        />
      );
    }

    if (currentFeatureId && currentFeatureId !== 'main') {
      return (
        <FeatureWorkspace
          key={currentFeatureId} // Key ensures complete remount and state isolation
          featureId={currentFeatureId}
          conversationId={activeConversationId}
          selectedLanguage={selectedLanguage}
          onSelectLanguage={setSelectedLanguage}
          onBack={() => navigate('/')}
          onNewConversation={handleNewConversation}
          onSelectFeature={(r) => navigate(r)}
          onOpenVoice={() => navigate('/ai-interview')}
          onConversationCreated={(newConv) => {
            setActiveConversationByFeature((prev) => ({
              ...prev,
              [currentFeatureId]: newConv.id,
            }));
            const targetFeature = filterByActiveFeature ? currentFeatureId : undefined;
            fetchConversations(searchQuery, targetFeature);
          }}
          initialPrompt={initialPrompt}
        />
      );
    }

    // Default: Chatbot-First Home Assistant
    return (
      <HomePage
        key={activeConversationByFeature['main'] || routeConversationId || 'home_main'}
        onNavigate={navigate}
        selectedLanguage={selectedLanguage}
        onSelectLanguage={setSelectedLanguage}
        onSelectPrompt={handleSelectPrompt}
        onShowIntro={() => setShowIntro(true)}
        conversationId={routeConversationId || activeConversationByFeature['main']}
        onConversationCreated={(newConv) => {
          setActiveConversationByFeature((prev) => ({
            ...prev,
            main: newConv.id,
          }));
          const targetFeature = filterByActiveFeature ? 'main' : undefined;
          fetchConversations(searchQuery, targetFeature);
        }}
        initialPrompt={initialPrompt}
      />
    );
  };

  // Render Landing Page if first visit or requested
  if (showIntro) {
    return (
      <AIIntro
        onEnter={handleEnterApp}
        onSelectFeature={(route) => {
          sessionStorage.setItem('seespeak_intro_seen', 'true');
          setShowIntro(false);
          navigate(route);
        }}
      />
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans">
      {/* Mobile Menu Button */}
      <button
        onClick={() => setIsSidebarOpen(true)}
        className="fixed top-3 left-3 z-40 p-2 rounded-xl bg-slate-900/90 border border-slate-800 text-slate-300 md:hidden shadow-md cursor-pointer"
        aria-label="Toggle history menu"
      >
        <Menu size={18} />
      </button>

      {/* Feature-Scoped Conversation Sidebar */}
      <ConversationSidebar
        conversations={conversations}
        activeConversationId={activeConversationId}
        activeFeatureId={currentFeatureId}
        onSelectConversation={handleSelectConversation}
        onNewConversation={handleNewConversation}
        onRenameConversation={handleRenameConversation}
        onDeleteConversation={handleDeleteConversation}
        onToggleFavorite={handleToggleFavorite}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        filterByActiveFeature={filterByActiveFeature}
        onToggleFilterFeature={() => setFilterByActiveFeature(!filterByActiveFeature)}
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      {/* Main Workspace Stage */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {renderContent()}
      </main>
    </div>
  );
};

export default App;
