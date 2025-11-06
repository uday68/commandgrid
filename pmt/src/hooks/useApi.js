import { useCallback, useState } from 'react';
import apiService from '../utils/api';

/**
 * Custom hook for API operations with loading and error states
 */
const useApi = (apiMethod, options = {}) => {
  const [data, setData] = useState(options.initialData || null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // The execute function will call the API method with the provided arguments
  const execute = useCallback(async (...args) => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await apiMethod(...args);
      
      setData(result);
      
      if (options.onSuccess) {
        options.onSuccess(result);
      }
      
      return result;
    } catch (err) {
      setError(err);
      
      if (options.onError) {
        options.onError(err);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  }, [apiMethod, options]);

  return {
    data,
    loading,
    error,
    execute,
    setData, // Expose setData to allow manual updates
    reset: useCallback(() => {
      setData(options.initialData || null);
      setError(null);
      setLoading(false);
    }, [options.initialData])
  };
};

// Pre-configured hooks for common API operations
export const useProjects = (options = {}) => useApi(apiService.projects.getAll, options);
export const useProject = (projectId, options = {}) => useApi(() => apiService.projects.getById(projectId), options);
export const useCreateProject = (options = {}) => useApi(apiService.projects.create, options);
export const useUpdateProject = (options = {}) => useApi(apiService.projects.update, options);
export const useDeleteProject = (options = {}) => useApi(apiService.projects.delete, options);

export const useTasks = (projectId, options = {}) => useApi(() => apiService.tasks.getByProject(projectId), options);
export const useCreateTask = (options = {}) => useApi(apiService.tasks.create, options);
export const useUpdateTask = (options = {}) => useApi(apiService.tasks.update, options);
export const useDeleteTask = (options = {}) => useApi(apiService.tasks.delete, options);

export const useTeams = (options = {}) => useApi(apiService.teams.getAll, options);
export const useTeam = (teamId, options = {}) => useApi(() => apiService.teams.getById(teamId), options);
export const useCreateTeam = (options = {}) => useApi(apiService.teams.create, options);
export const useDeleteTeam = (options = {}) => useApi(apiService.teams.delete, options);

export const useMeetings = (options = {}) => useApi(apiService.meetings.getAll, options);
export const useCreateMeeting = (options = {}) => useApi(apiService.meetings.create, options);

export const useReports = (options = {}) => useApi(apiService.reports.getAll, options);
export const useCreateReport = (options = {}) => useApi(apiService.reports.create, options);
export const useUpdateReport = (options = {}) => useApi(apiService.reports.update, options);

export const useTimeEntries = (filters = {}, options = {}) => useApi(() => apiService.timeEntries.getAll(filters), options);
export const useCreateTimeEntry = (options = {}) => useApi(apiService.timeEntries.create, options);

export const useUsers = (options = {}) => useApi(apiService.users.getAll, options);
export const useCreateUser = (options = {}) => useApi(apiService.users.create, options);
export const useUpdateUser = (options = {}) => useApi(apiService.users.update, options);
export const useDeleteUser = (options = {}) => useApi(apiService.users.delete, options);
export const useProfile = (options = {}) => useApi(apiService.users.getProfile, options);

export const useCalendarEvents = (filters = {}, options = {}) => useApi(() => apiService.calendar.getEvents(filters), options);
export const useCreateCalendarEvent = (options = {}) => useApi(apiService.calendar.createEvent, options);

export const useAdminStats = (options = {}) => useApi(apiService.admin.getStats, options);
export const useAdminNotifications = (options = {}) => useApi(apiService.admin.getNotifications, options);

// Default export for general API operations
export default useApi;
