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

// ============= RELATIONS =============
export const usersRelations = relations(users, ({ many }) => ({
  dashboards: many(dashboards),
  calendarEvents: many(calendarEvents),
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

// ============= TYPES =============
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
