import { sql } from "drizzle-orm";
import { pgTable, text, varchar, decimal, timestamp, integer, boolean, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const portfolios = pgTable("portfolios", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  totalValue: decimal("total_value", { precision: 20, scale: 8 }).notNull().default("0"),
  todayChange: decimal("today_change", { precision: 20, scale: 8 }).notNull().default("0"),
  todayChangePercent: decimal("today_change_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  activePositions: integer("active_positions").notNull().default(0),
  winRate: decimal("win_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tradingSignals = pgTable("trading_signals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  action: varchar("action", { length: 10 }).notNull(), // BUY, SELL
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  targetPrice: decimal("target_price", { precision: 20, scale: 8 }),
  stopLoss: decimal("stop_loss", { precision: 20, scale: 8 }),
  confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
  reasoning: text("reasoning"),
  source: varchar("source", { length: 50 }).notNull().default("AI"),
  isActive: boolean("is_active").notNull().default(true),
  newsId: varchar("news_id").references(() => newsArticles.id),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const positions = pgTable("positions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  type: varchar("type", { length: 10 }).notNull(), // LONG, SHORT
  quantity: decimal("quantity", { precision: 20, scale: 8 }).notNull(),
  entryPrice: decimal("entry_price", { precision: 20, scale: 8 }).notNull(),
  currentPrice: decimal("current_price", { precision: 20, scale: 8 }).notNull(),
  pnl: decimal("pnl", { precision: 20, scale: 8 }).notNull().default("0"),
  pnlPercent: decimal("pnl_percent", { precision: 5, scale: 2 }).notNull().default("0"),
  status: varchar("status", { length: 20 }).notNull().default("OPEN"), // OPEN, CLOSED
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const newsArticles = pgTable("news_articles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  summary: text("summary"),
  content: text("content"),
  url: text("url").unique(),
  source: varchar("source", { length: 100 }).notNull(),
  publishedAt: timestamp("published_at").notNull(),
  sentiment: varchar("sentiment", { length: 20 }), // Bullish, Bearish, Neutral
  sentimentScore: decimal("sentiment_score", { precision: 3, scale: 2 }),
  relevanceScore: decimal("relevance_score", { precision: 3, scale: 2 }),
  aiAnalysis: jsonb("ai_analysis"),
  isDeepAnalyzed: boolean("is_deep_analyzed").notNull().default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const marketData = pgTable("market_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  symbol: varchar("symbol", { length: 20 }).notNull(),
  price: decimal("price", { precision: 20, scale: 8 }).notNull(),
  volume: decimal("volume", { precision: 20, scale: 8 }),
  change: decimal("change", { precision: 20, scale: 8 }),
  changePercent: decimal("change_percent", { precision: 5, scale: 2 }),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const riskMetrics = pgTable("risk_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  portfolioId: varchar("portfolio_id").references(() => portfolios.id),
  portfolioRisk: varchar("portfolio_risk", { length: 20 }).notNull(),
  portfolioRiskScore: decimal("portfolio_risk_score", { precision: 5, scale: 2 }).notNull(),
  diversification: varchar("diversification", { length: 20 }).notNull(),
  diversificationScore: decimal("diversification_score", { precision: 5, scale: 2 }).notNull(),
  volatility: varchar("volatility", { length: 20 }).notNull(),
  volatilityScore: decimal("volatility_score", { precision: 5, scale: 2 }).notNull(),
  recommendations: jsonb("recommendations"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertPortfolioSchema = createInsertSchema(portfolios).omit({ id: true, createdAt: true, updatedAt: true });
export const insertTradingSignalSchema = createInsertSchema(tradingSignals).omit({ id: true, createdAt: true });
export const insertPositionSchema = createInsertSchema(positions).omit({ id: true, openedAt: true });
export const insertNewsArticleSchema = createInsertSchema(newsArticles).omit({ id: true, createdAt: true });
export const insertMarketDataSchema = createInsertSchema(marketData).omit({ id: true, timestamp: true });
export const insertRiskMetricsSchema = createInsertSchema(riskMetrics).omit({ id: true, createdAt: true });

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Portfolio = typeof portfolios.$inferSelect;
export type InsertPortfolio = z.infer<typeof insertPortfolioSchema>;
export type TradingSignal = typeof tradingSignals.$inferSelect;
export type InsertTradingSignal = z.infer<typeof insertTradingSignalSchema>;
export type Position = typeof positions.$inferSelect;
export type InsertPosition = z.infer<typeof insertPositionSchema>;
export type NewsArticle = typeof newsArticles.$inferSelect;
export type InsertNewsArticle = z.infer<typeof insertNewsArticleSchema>;
export type MarketData = typeof marketData.$inferSelect;
export type InsertMarketData = z.infer<typeof insertMarketDataSchema>;
export type RiskMetrics = typeof riskMetrics.$inferSelect;
export type InsertRiskMetrics = z.infer<typeof insertRiskMetricsSchema>;
