import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import {
  createProject as apiCreateProject,
  deleteProject as apiDeleteProject,
  listProjects,
  type ProjectSummary,
} from '../api/projects';
import { ApiError } from '../api/client';

interface ProjectContextValue {
  projects: ProjectSummary[];
  currentProjectId: string | null;
  loading: boolean;
  error: string | null;
  apiAvailable: boolean;
  selectProject: (id: string | null) => void;
  createProject: (input: { name: string; description?: string | null }) => Promise<ProjectSummary>;
  deleteProject: (id: string) => Promise<void>;
  refreshProjects: () => Promise<void>;
}

const ProjectContext = createContext<ProjectContextValue | null>(null);

const STORAGE_KEY_CURRENT = 'cl-current-project-id';

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [projects, setProjects] = useState<ProjectSummary[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY_CURRENT);
    } catch {
      return null;
    }
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [apiAvailable, setApiAvailable] = useState<boolean>(true);

  const refreshProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const list = await listProjects();
      setProjects(list);
      setApiAvailable(true);
    } catch (err) {
      const message =
        err instanceof ApiError
          ? `API error (${err.status}): ${err.message}`
          : err instanceof Error
            ? `Cannot reach API: ${err.message}`
            : 'Cannot reach API.';
      setError(message);
      setApiAvailable(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshProjects();
  }, [refreshProjects]);

  const selectProject = useCallback((id: string | null) => {
    setCurrentProjectId(id);
    try {
      if (id) localStorage.setItem(STORAGE_KEY_CURRENT, id);
      else localStorage.removeItem(STORAGE_KEY_CURRENT);
    } catch {
      // localStorage unavailable — non-fatal.
    }
  }, []);

  const createProject = useCallback(
    async (input: { name: string; description?: string | null }) => {
      const created = await apiCreateProject(input);
      setProjects((prev) => [created, ...prev]);
      selectProject(created.id);
      setApiAvailable(true);
      return created;
    },
    [selectProject]
  );

  const deleteProject = useCallback(
    async (id: string) => {
      await apiDeleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
      if (currentProjectId === id) selectProject(null);
    },
    [currentProjectId, selectProject]
  );

  return (
    <ProjectContext.Provider
      value={{
        projects,
        currentProjectId,
        loading,
        error,
        apiAvailable,
        selectProject,
        createProject,
        deleteProject,
        refreshProjects,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
};

export function useProjectContext(): ProjectContextValue {
  const ctx = useContext(ProjectContext);
  if (!ctx) {
    throw new Error('useProjectContext must be used within a ProjectProvider');
  }
  return ctx;
}
