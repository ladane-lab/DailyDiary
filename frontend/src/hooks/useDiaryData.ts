import useSWR from 'swr';
import { API_URL } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

const fetcher = async (url: string, token: string) => {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error('An error occurred while fetching the data.');
  return res.json();
};

export function useDashboardData() {
  const { user } = useAuthStore();

  const { data, error, isLoading, mutate } = useSWR(
    user ? `${API_URL}/dashboard/init` : null,
    async (url) => {
      const token = await user!.getIdToken();
      return fetcher(url, token);
    },
    {
      revalidateOnFocus: false,
      dedupingInterval: 300000, // 5 minutes cache
    }
  );

  return {
    data,
    isLoading,
    isError: error,
    mutate
  };
}

export function useChallengesData() {
  const { user } = useAuthStore();

  const { data: allChallenges, error: err1, isLoading: load1 } = useSWR(
    user ? `${API_URL}/challenges` : null,
    async (url) => {
      const token = await user!.getIdToken();
      return fetcher(url, token);
    },
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  const { data: myChallenges, error: err2, isLoading: load2, mutate } = useSWR(
    user ? `${API_URL}/challenges/my` : null,
    async (url) => {
      const token = await user!.getIdToken();
      return fetcher(url, token);
    },
    { revalidateOnFocus: false, dedupingInterval: 60000 }
  );

  return {
    allChallenges: allChallenges || [],
    myChallenges: myChallenges || [],
    isLoading: load1 || load2,
    isError: err1 || err2,
    mutateMyChallenges: mutate
  };
}

export function useUserProfile() {
  const { user } = useAuthStore();

  const { data, error, isLoading, mutate } = useSWR(
    user ? `${API_URL}/users/me` : null,
    async (url) => {
      const token = await user!.getIdToken();
      return fetcher(url, token);
    },
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  return {
    profile: data,
    isLoading,
    isError: error,
    mutate
  };
}
