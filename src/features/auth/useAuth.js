import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useDispatch } from 'react-redux';
import { authApi } from '../../services/api';
import { clearAuth, setAuthError, setAuthLoading, setUser } from '../../store/authSlice';
import { clearDemoSession } from '../../demo/demoData';
import { DEMO_MODE } from '../../utils/constants';

const pickUser = (res) => {
  if (!res) return null;
  const candidate = res?.data?.user ?? res?.user ?? res?.data;
  if (
    candidate &&
    typeof candidate === 'object' &&
    (candidate.email || candidate.role || candidate.name || candidate._id || candidate.id)
  ) {
    return candidate;
  }
  return null;
};

export function useMeQuery(enabled = true) {
  const dispatch = useDispatch();
  return useQuery({
    queryKey: ['auth', 'me'],
    enabled,
    retry: false,
    queryFn: async () => {
      dispatch(setAuthLoading());
      try {
        const res = await authApi.me();
        const user = pickUser(res);
        dispatch(setUser(user));
        return user;
      } catch (err) {
        // Unauthenticated is normal on login screen — don't leave UI stuck in error loops
        dispatch(setAuthError(err.response?.data?.message));
        return null;
      }
    },
  });
}

export function useLoginMutation() {
  const dispatch = useDispatch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.login,
    onSuccess: (res) => {
      const user = pickUser(res);
      dispatch(setUser(user));
      qc.setQueryData(['auth', 'me'], user);
    },
  });
}

export function useRegisterMutation() {
  const dispatch = useDispatch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.register,
    onSuccess: (res) => {
      const user = pickUser(res);
      dispatch(setUser(user));
      qc.setQueryData(['auth', 'me'], user);
    },
  });
}

export function useLogoutMutation() {
  const dispatch = useDispatch();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: authApi.logout,
    onSettled: () => {
      if (DEMO_MODE) clearDemoSession();
      dispatch(clearAuth());
      qc.clear();
    },
  });
}
