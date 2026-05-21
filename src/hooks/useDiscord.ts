import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  DiscordSettings,
  DiscordSourceRequest,
  DiscordSourceResponse,
  DiscordGuildSummaryResponse,
  DiscordChannelSummaryResponse,
  SetDiscordBotTokenRequest,
  SetDiscordEnabledRequest,
} from '@/types/api'

const base = (companyId: string, projectId: string) =>
  `/api/v1/companies/${companyId}/projects/${projectId}/discord`

const discordKey = (companyId: string | null, projectId: string | null) =>
  ['discord', companyId, projectId] as const

export function useDiscordSettings(companyId: string | null, projectId: string | null) {
  return useQuery({
    queryKey: discordKey(companyId, projectId),
    queryFn: () => api.get<DiscordSettings>(base(companyId!, projectId!)),
    enabled: !!companyId && !!projectId,
  })
}

export function useSetDiscordBotToken(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SetDiscordBotTokenRequest) =>
      api.put<DiscordSettings>(`${base(companyId!, projectId!)}/bot-token`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discordKey(companyId, projectId) })
      queryClient.invalidateQueries({ queryKey: ['project', companyId, projectId] })
    },
  })
}

export function useSetDiscordEnabled(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: SetDiscordEnabledRequest) =>
      api.put<DiscordSettings>(`${base(companyId!, projectId!)}/enabled`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discordKey(companyId, projectId) })
      queryClient.invalidateQueries({ queryKey: ['project', companyId, projectId] })
    },
  })
}

export function useAddDiscordSource(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: DiscordSourceRequest) =>
      api.post<DiscordSourceResponse>(`${base(companyId!, projectId!)}/sources`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discordKey(companyId, projectId) })
    },
  })
}

export function useUpdateDiscordSource(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: DiscordSourceRequest }) =>
      api.put<DiscordSourceResponse>(`${base(companyId!, projectId!)}/sources/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discordKey(companyId, projectId) })
    },
  })
}

export function useDeleteDiscordSource(companyId: string | null, projectId: string | null) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) =>
      api.delete<void>(`${base(companyId!, projectId!)}/sources/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: discordKey(companyId, projectId) })
    },
  })
}

export function useTriggerDiscordSync(companyId: string | null, projectId: string | null) {
  return useMutation({
    mutationFn: () => api.post<{ triggered: boolean }>(`${base(companyId!, projectId!)}/sync-now`),
  })
}

const guildsKey = (companyId: string | null, projectId: string | null) =>
  ['discord', 'guilds', companyId, projectId] as const

/// List the servers the bot is in. Disabled until a token is saved, so the request
/// doesn't 400 on the empty-token path during initial setup.
export function useDiscordGuilds(
  companyId: string | null,
  projectId: string | null,
  options: { enabled?: boolean } = {},
) {
  return useQuery({
    queryKey: guildsKey(companyId, projectId),
    queryFn: () =>
      api.get<DiscordGuildSummaryResponse[]>(`${base(companyId!, projectId!)}/guilds`),
    enabled: !!companyId && !!projectId && (options.enabled ?? true),
    // Discord caches respond quickly; refresh whenever the token changes.
    staleTime: 30_000,
    retry: false,
  })
}

export function useDiscordChannels(
  companyId: string | null,
  projectId: string | null,
  guildId: string | null,
  options: { forumOnly?: boolean } = {},
) {
  const forumOnly = options.forumOnly ?? true
  return useQuery({
    queryKey: ['discord', 'channels', companyId, projectId, guildId, forumOnly] as const,
    queryFn: () =>
      api.get<DiscordChannelSummaryResponse[]>(
        `${base(companyId!, projectId!)}/guilds/${guildId}/channels?forumOnly=${forumOnly}`,
      ),
    enabled: !!companyId && !!projectId && !!guildId,
    staleTime: 30_000,
    retry: false,
  })
}
