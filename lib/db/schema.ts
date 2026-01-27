import {
  mysqlTable,
  varchar,
  text,
  timestamp,
  int,
  boolean,
  mysqlEnum,
  json,
  primaryKey,
  index,
} from 'drizzle-orm/mysql-core';
import { relations } from 'drizzle-orm';

// ============= ENUMS =============
export const userRoleEnum = mysqlEnum('role', ['USER', 'VIP', 'ADMIN']);
export const userStatusEnum = mysqlEnum('status', ['PENDING', 'ACTIVE', 'BANNED']);
export const announcementTypeEnum = mysqlEnum('announcement_type', ['info', 'update', 'alert']);
export const integrationTypeEnum = mysqlEnum('integration_type', [
  'overseerr',
  'torrent-client',
  'monitoring',
  'jellyfin',
]);
export const mediaTypeEnum = mysqlEnum('media_type', ['movie', 'series', 'music']);

// ============= USERS TABLE =============
export const users = mysqlTable('users', {
  id: varchar('id', { length: 255 }).primaryKey(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  emailVerified: timestamp('email_verified'),
  name: varchar('name', { length: 255 }),
  image: text('image'),
  password: varchar('password', { length: 255 }),
  role: userRoleEnum.default('USER').notNull(),
  status: userStatusEnum.default('PENDING').notNull(),
  isOwner: boolean('is_owner').default(false).notNull(), // Super admin intouchable
  hasSeenGuide: boolean('has_seen_guide').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  emailIdx: index('email_idx').on(table.email),
  statusIdx: index('status_idx').on(table.status),
}));

// ============= ACCOUNTS TABLE (NextAuth) =============
export const accounts = mysqlTable('accounts', {
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  provider: varchar('provider', { length: 255 }).notNull(),
  providerAccountId: varchar('provider_account_id', { length: 255 }).notNull(),
  refresh_token: text('refresh_token'),
  access_token: text('access_token'),
  expires_at: int('expires_at'),
  token_type: varchar('token_type', { length: 255 }),
  scope: varchar('scope', { length: 255 }),
  id_token: text('id_token'),
  session_state: varchar('session_state', { length: 255 }),
}, (table) => ({
  pk: primaryKey({ columns: [table.provider, table.providerAccountId] }),
}));

// ============= SESSIONS TABLE (NextAuth) =============
export const sessions = mysqlTable('sessions', {
  sessionToken: varchar('session_token', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  expires: timestamp('expires').notNull(),
});

// ============= NOTIFICATION PREFERENCES =============
export const notificationPreferences = mysqlTable('notification_preferences', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  prefs: json('prefs').$type<Record<string, any>>().default({}),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdx: index('notification_prefs_user_idx').on(table.userId),
}));

// ============= SHARED DASHBOARDS TABLE =============
export const sharePermissionEnum = mysqlEnum('share_permission', ['read', 'edit']);
export const shareStatusEnum = mysqlEnum('share_status', ['pending', 'accepted']);

export const sharedDashboards = mysqlTable('shared_dashboards', {
  id: varchar('id', { length: 255 }).primaryKey(),
  dashboardId: varchar('dashboard_id', { length: 255 }).notNull(),
  ownerId: varchar('owner_id', { length: 255 }).notNull(),
  targetUserId: varchar('target_user_id', { length: 255 }).notNull(),
  permission: sharePermissionEnum.notNull(),
  status: shareStatusEnum.default('pending').notNull(),
  integrationIds: json('integration_ids').$type<string[]>().default([]),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  dashboardIdIdx: index('shared_dashboard_dashboard_id_idx').on(table.dashboardId),
  targetUserIdx: index('shared_dashboard_target_user_idx').on(table.targetUserId),
}));

// ============= VERIFICATION TOKENS TABLE (NextAuth) =============
export const verificationTokens = mysqlTable('verification_tokens', {
  identifier: varchar('identifier', { length: 255 }).notNull(),
  token: varchar('token', { length: 255 }).notNull(),
  expires: timestamp('expires').notNull(),
}, (table) => ({
  pk: primaryKey({ columns: [table.identifier, table.token] }),
}));

// ============= DASHBOARDS TABLE =============
export const dashboards = mysqlTable('dashboards', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  slug: varchar('slug', { length: 255 }).notNull(),
  isPublic: boolean('is_public').default(false).notNull(),
  format: mysqlEnum('dashboard_format', ['desktop', 'mobile']).default('desktop').notNull(),
  themeConfig: json('theme_config').$type<ThemeConfig>(),
  customCss: text('custom_css'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  slugIdx: index('slug_idx').on(table.slug),
}));

// ============= WIDGETS TABLE =============
export const widgets = mysqlTable('widgets', {
  id: varchar('id', { length: 255 }).primaryKey(),
  dashboardId: varchar('dashboard_id', { length: 255 }).notNull(),
  categoryId: varchar('category_id', { length: 255 }), // Nouvelle: catégorie optionnelle
  type: varchar('type', { length: 50 }).notNull(), // 'link', 'ping', 'iframe', 'datetime', 'docker'
  x: int('x').notNull(),
  y: int('y').notNull(),
  w: int('w').notNull(),
  h: int('h').notNull(),
  // Position dans la grille de la catégorie (si dans une catégorie)
  categoryX: int('category_x').default(0),
  categoryY: int('category_y').default(0),
  options: json('options').$type<WidgetOptions>().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dashboardIdIdx: index('dashboard_id_idx').on(table.dashboardId),
  categoryIdIdx: index('category_id_idx').on(table.categoryId),
}));

// ============= CATEGORIES TABLE =============
export const categories = mysqlTable('categories', {
  id: varchar('id', { length: 255 }).primaryKey(),
  dashboardId: varchar('dashboard_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  icon: varchar('icon', { length: 50 }),
  color: varchar('color', { length: 50 }),
  // Position et dimensions sur la grille (comme les widgets)
  x: int('x').default(0).notNull(),
  y: int('y').default(0).notNull(),
  w: int('w').default(4).notNull(), // Largeur par défaut: 4 colonnes
  h: int('h').default(4).notNull(), // Hauteur par défaut: 4 rangées
  order: int('order').default(0).notNull(),
  isCollapsed: boolean('is_collapsed').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  dashboardIdIdx: index('dashboard_id_idx').on(table.dashboardId),
}));

// ============= CALENDAR EVENTS TABLE =============
export const calendarEvents = mysqlTable('calendar_events', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),
  startDate: timestamp('start_date').notNull(),
  endDate: timestamp('end_date'),
  allDay: boolean('all_day').default(false).notNull(),
  type: mysqlEnum('type', ['personal', 'anime', 'manga', 'movie', 'tv', 'reminder']).notNull(),
  color: varchar('color', { length: 50 }),
  location: varchar('location', { length: 255 }),
  url: text('url'),
  metadata: json('metadata').$type<EventMetadata>(), // Pour stocker des infos spécifiques (ID TMDb, AniList, etc.)
  recurring: mysqlEnum('recurring', ['none', 'daily', 'weekly', 'monthly', 'yearly']).default('none'),
  notifyBefore: int('notify_before'), // Minutes avant l'événement
  completed: boolean('completed').default(false),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('user_id_idx').on(table.userId),
  startDateIdx: index('start_date_idx').on(table.startDate),
  typeIdx: index('type_idx').on(table.type),
}));

// ============= MEDIA ITEMS TABLE =============
export const mediaItems = mysqlTable('media_items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  type: mediaTypeEnum.notNull(),
  tmdbId: int('tmdb_id'),
  year: varchar('year', { length: 10 }),
  posterUrl: text('poster_url'),
  backdropUrl: text('backdrop_url'),
  streamUrl: text('stream_url'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('media_items_user_id_idx').on(table.userId),
  typeIdx: index('media_items_type_idx').on(table.type),
  tmdbIdx: index('media_items_tmdb_id_idx').on(table.tmdbId),
}));

// ============= INTEGRATIONS TABLE =============
export const integrations = mysqlTable('integrations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  type: integrationTypeEnum.notNull(),
  baseUrl: varchar('base_url', { length: 512 }),
  apiKey: varchar('api_key', { length: 512 }),
  username: varchar('username', { length: 255 }),
  password: varchar('password', { length: 255 }),
  config: json('config').$type<Record<string, any>>(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('integrations_user_id_idx').on(table.userId),
  typeIdx: index('integrations_type_idx').on(table.type),
}));

// ============= GAME SCORES TABLE =============
// Table pour stocker les scores des jeux (Snake, 2048, etc.)
export const gameScores = mysqlTable('game_scores', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  gameId: varchar('game_id', { length: 100 }).notNull(), // 'snake', '2048', etc.
  score: int('score').notNull(),
  metadata: json('metadata').$type<Record<string, any>>(), // Extra info: level, time, etc.
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('game_scores_user_id_idx').on(table.userId),
  gameIdIdx: index('game_scores_game_id_idx').on(table.gameId),
  scoreIdx: index('game_scores_score_idx').on(table.score),
}));

// ============= DEPRECATED: GAMES TABLE (no longer needed) =============
// export const games = mysqlTable('games', {
//   id: varchar('id', { length: 255 }).primaryKey(),
//   userId: varchar('user_id', { length: 255 }).notNull(),
//   title: varchar('title', { length: 255 }).notNull(),
//   description: text('description'),
//   icon: text('icon'),
//   gameUrl: text('game_url'),
//   gameType: varchar('game_type', { length: 100 }),
//   config: json('config').$type<Record<string, any>>(),
//   isActive: boolean('is_active').default(true).notNull(),
//   order: int('order').default(0).notNull(),
//   createdAt: timestamp('created_at').defaultNow().notNull(),
//   updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
// }, (table) => ({
//   userIdIdx: index('games_user_id_idx').on(table.userId),
//   orderIdx: index('games_order_idx').on(table.order),
// }));

// ============= RELATIONS =============
export const usersRelations = relations(users, ({ many }) => ({
  dashboards: many(dashboards),
  calendarEvents: many(calendarEvents),
  integrations: many(integrations),
  mediaItems: many(mediaItems),
  gameScores: many(gameScores),
}));

export const dashboardsRelations = relations(dashboards, ({ one, many }) => ({
  user: one(users, {
    fields: [dashboards.userId],
    references: [users.id],
  }),
  widgets: many(widgets),
}));

export const widgetsRelations = relations(widgets, ({ one }) => ({
  dashboard: one(dashboards, {
    fields: [widgets.dashboardId],
    references: [dashboards.id],
  }),
}));

export const integrationsRelations = relations(integrations, ({ one }) => ({
  user: one(users, {
    fields: [integrations.userId],
    references: [users.id],
  }),
}));

export const gameScoresRelations = relations(gameScores, ({ one }) => ({
  user: one(users, {
    fields: [gameScores.userId],
    references: [users.id],
  }),
}));

// ============= IFRAME REQUESTS & ALLOWLIST =============
export const iframeRequestStatusEnum = mysqlEnum('iframe_request_status', ['PENDING', 'APPROVED', 'REJECTED']);

export const iframeRequests = mysqlTable('iframe_requests', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  url: text('url').notNull(),
  reason: text('reason'),
  status: iframeRequestStatusEnum.default('PENDING').notNull(),
  adminId: varchar('admin_id', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index('iframe_request_user_id_idx').on(table.userId),
  statusIdx: index('iframe_request_status_idx').on(table.status),
}));

export const iframeAllowlist = mysqlTable('iframe_allowlist', {
  id: varchar('id', { length: 255 }).primaryKey(),
  origin: varchar('origin', { length: 512 }).notNull(),
  addedBy: varchar('added_by', { length: 255 }).notNull(),
  addedAt: timestamp('added_at').defaultNow().notNull(),
  approvedAt: timestamp('approved_at'),
  removed: boolean('removed').default(false).notNull(),
}, (table) => ({
  originIdx: index('iframe_allowlist_origin_idx').on(table.origin),
}));

// ============= NOTIFICATIONS TABLE =============
export const notifications = mysqlTable('notifications', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  type: varchar('type', { length: 255 }).notNull(),
  title: varchar('title', { length: 255 }).notNull(),
  message: text('message'),
  payload: json('payload').$type<Record<string, any>>(),
  link: varchar('link', { length: 1024 }),
  read: boolean('read').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdx: index('notifications_user_idx').on(table.userId),
  readIdx: index('notifications_read_idx').on(table.read),
}));

export const mediaItemsRelations = relations(mediaItems, ({ one }) => ({
  user: one(users, {
    fields: [mediaItems.userId],
    references: [users.id],
  }),
}));

// ============ LIBRARY ITEMS TABLE =============

export const libraryItems = mysqlTable('library_items', {
  id: varchar('id', { length: 255 }).primaryKey(),
  userId: varchar('user_id', { length: 255 }).notNull().references(() => users.id, { onDelete: 'cascade' }),

  title: varchar('title', { length: 255 }).notNull(),
  type: varchar('type', { length: 50 }).notNull().default('manga'),
  status: varchar('status', { length: 50 }).notNull().default('reading'),

  // Progression
  currentProgress: int('current_progress').default(0),
  totalProgress: int('total_progress'),

  // Customisation
  coverUrl: text('cover_url'),
  linkUrl: text('link_url'),
  additionalUrl: text('additional_url'),

  // Calendrier Manuel
  // ex: "weekly-monday" ou juste une date "2024-05-20"
  releaseSchedule: text('release_schedule'),

  rating: int('rating').default(0),
  notes: text('notes'),

  createdAt: timestamp('created_at').defaultNow(),
  updatedAt: timestamp('updated_at').defaultNow(),

  // Pour les séries/mangas avec sorties récurrentes
  scheduleType: text("schedule_type"), // 'weekly', 'biweekly', 'monthly'
  scheduleDay: text("schedule_day"),   // 'monday', 'tuesday', etc.
  lastReadAt: timestamp("last_read_at"), // Pour le "Lu il y a..."
  
  // IDs externes pour synchronisation auto des horaires
  anilistId: int('anilist_id'),
  tmdbId: int('tmdb_id'),
  
}, (table) => ({
  userIdIdx: index('library_items_user_id_idx').on(table.userId),
}));

// ============= TYPES =============
// ============= MESSAGING TABLES =============
export const conversationStatusEnum = mysqlEnum('conversation_status', ['OPEN', 'CLOSED']);
export const conversationTypeEnum = mysqlEnum('conversation_type', ['DIRECT', 'REPORT', 'SUPPORT']);

export const conversations = mysqlTable('conversations', {
  id: varchar('id', { length: 255 }).primaryKey(),
  type: conversationTypeEnum.default('DIRECT').notNull(),
  title: varchar('title', { length: 255 }),
  lastMessageId: varchar('last_message_id', { length: 255 }),
  assigneeId: varchar('assignee_id', { length: 255 }),
  status: conversationStatusEnum.default('OPEN').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  lastMessageIdx: index('conversations_last_message_idx').on(table.lastMessageId),
  assigneeIdx: index('conversations_assignee_idx').on(table.assigneeId),
}));

export const messages = mysqlTable('messages', {
  id: varchar('id', { length: 255 }).primaryKey(),
  conversationId: varchar('conversation_id', { length: 255 }).notNull(),
  senderId: varchar('sender_id', { length: 255 }).notNull(),
  content: text('content').notNull(),
  isEdited: boolean('is_edited').default(false).notNull(),
  deleted: boolean('deleted').default(false).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  convIdx: index('messages_conversation_idx').on(table.conversationId),
  senderIdx: index('messages_sender_idx').on(table.senderId),
}));

export const participants = mysqlTable('participants', {
  id: varchar('id', { length: 255 }).primaryKey(),
  conversationId: varchar('conversation_id', { length: 255 }).notNull(),
  userId: varchar('user_id', { length: 255 }).notNull(),
  role: mysqlEnum('participant_role', ['USER', 'ADMIN']).default('USER').notNull(),
  lastReadAt: timestamp('last_read_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  convUserIdx: index('participants_conv_user_idx').on(table.conversationId, table.userId),
}));
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Dashboard = typeof dashboards.$inferSelect;
export type NewDashboard = typeof dashboards.$inferInsert;

export type Widget = typeof widgets.$inferSelect;
export type NewWidget = typeof widgets.$inferInsert;

export type Category = typeof categories.$inferSelect;
export type NewCategory = typeof categories.$inferInsert;

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type NewCalendarEvent = typeof calendarEvents.$inferInsert;

export type Integration = typeof integrations.$inferSelect;
export type NewIntegration = typeof integrations.$inferInsert;

export type MediaItem = typeof mediaItems.$inferSelect;
export type NewMediaItem = typeof mediaItems.$inferInsert;

export type SharedDashboard = typeof sharedDashboards.$inferSelect;
export type NewSharedDashboard = typeof sharedDashboards.$inferInsert;

export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;

export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;

export type Participant = typeof participants.$inferSelect;
export type NewParticipant = typeof participants.$inferInsert;

export type Announcement = typeof announcements.$inferSelect;
export type NewAnnouncement = typeof announcements.$inferInsert;

// Theme Configuration Type
export interface ThemeConfig {
  primaryColor?: string;
  backgroundColor?: string;
  borderRadius?: number;
  mode?: 'light' | 'dark' | 'oled';
  backgroundImage?: string;
}

// Widget Options Types
export interface WidgetOptions {
  // Common
  title?: string;
  icon?: string;
  
  // Link Widget
  url?: string;
  openInNewTab?: boolean;
  
  // Ping Widget
  host?: string;
  port?: number;
  
  // Iframe Widget
  iframeUrl?: string;
  
  // DateTime Widget
  format?: string;
  timezone?: string;
  
  // Docker Widget
  containerId?: string;
  socketPath?: string;
  
  // Anime Calendar Widget
  showManga?: boolean;
  defaultTab?: 'anime' | 'manga';
  daysToShow?: number;
  autoRefresh?: boolean;
  refreshInterval?: number; // minutes
  
  // Todo List Widget
  todos?: Array<{
    id: string;
    text: string;
    completed: boolean;
    priority: 'low' | 'medium' | 'high';
    createdAt: number;
  }>;
  
  // Watchlist Widget
  watchlist?: Array<{
    id: string;
    title: string;
    type: 'movie' | 'series' | 'anime';
    status: 'to-watch' | 'watching' | 'watched';
    rating?: number;
    cover?: string;
    year?: string;
    addedAt: number;
  }>;
  
  // Bookmarks Widget
  bookmarks?: Array<{
    id: string;
    title: string;
    url: string;
    icon?: string;
    category?: string;
    favorite?: boolean;
    addedAt: number;
  }>;
  
  // Countdown Widget
  countdownTitle?: string;
  countdownDate?: string;
  countdownEmoji?: string;
  
  // Universal Calendar Widget
  calendarView?: 'month' | 'week' | 'list' | 'agenda';
  enabledSources?: {
    anime?: boolean;
    manga?: boolean;
    movies?: boolean;
    tv?: boolean;
    personal?: boolean;
  };
  sourceColors?: {
    anime?: string;
    manga?: string;
    movies?: string;
    tv?: string;
    personal?: string;
  };
  defaultView?: 'month' | 'week' | 'list';
  showWeekends?: boolean;
  firstDayOfWeek?: 0 | 1; // 0 = dimanche, 1 = lundi
  hourFormat?: '12h' | '24h';
  compactMode?: boolean;
}

// ============= ANNOUNCEMENTS TABLE =============
export const announcements = mysqlTable('announcements', {
  id: varchar('id', { length: 255 }).primaryKey(),
  title: varchar('title', { length: 255 }).notNull(),
  content: text('content').notNull(),
  type: announcementTypeEnum.default('info').notNull(),
  isPublished: boolean('is_published').default(false).notNull(),
  createdBy: varchar('created_by', { length: 255 }).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  createdByIdx: index('announcement_created_by_idx').on(table.createdBy),
  isPublishedIdx: index('announcement_is_published_idx').on(table.isPublished),
  createdAtIdx: index('announcement_created_at_idx').on(table.createdAt),
}));

// ============= ROLE PERMISSIONS TABLE =============
export const rolePermissions = mysqlTable('role_permissions', {
  id: varchar('id', { length: 255 }).primaryKey(),
  role: userRoleEnum.notNull(),
  permission: varchar('permission', { length: 100 }).notNull(),
  enabled: boolean('enabled').default(true).notNull(),
  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  roleIdx: index('role_permissions_role_idx').on(table.role),
  permissionIdx: index('role_permissions_permission_idx').on(table.permission),
  uniqueRolePermission: index('unique_role_permission').on(table.role, table.permission),
}));

// Metadata pour les événements du calendrier
export interface EventMetadata {
  // Identifiants API externes
  anilistId?: number;
  tmdbId?: number;
  
  // Infos spécifiques anime/manga
  episodeNumber?: number;
  seasonNumber?: number;
  chapterNumber?: number;
  
  // Infos films/séries
  runtime?: number;
  genres?: string[];
  rating?: number;
  
  // Infos génériques
  posterUrl?: string;
  coverUrl?: string;
  externalUrl?: string;
}
