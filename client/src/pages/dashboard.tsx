import { useEffect } from "react";
import PortfolioOverview from "@/components/dashboard/portfolio-overview";
import TradingSignals from "@/components/dashboard/trading-signals";
import NewsFeed from "@/components/dashboard/news-feed";
import MarketChart from "@/components/dashboard/market-chart";
import RiskAnalysis from "@/components/dashboard/risk-analysis";
import PositionsTable from "@/components/dashboard/positions-table";
import TradeHistory from "@/components/dashboard/trade-history";
import Watchlist from "@/components/dashboard/watchlist";
import LiveMarketData from "@/components/dashboard/live-market-data";
import SignalAccuracyPanel from "@/components/dashboard/signal-accuracy-panel";
import RiskManagementPanel from "@/components/dashboard/risk-management-panel";
import { connectWebSocket } from "@/services/websocket";
import { NewPageLayout } from "@/components/ui/new-navigation";

export default function Dashboard() {
  useEffect(() => {
    const cleanup = connectWebSocket();
    return cleanup;
  }, []);

  return (
    <NewPageLayout>
      <div className="container mx-auto space-y-4 sm:space-y-6">
        <PortfolioOverview />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="lg:col-span-2">
            <TradingSignals />
          </div>
          <div className="lg:col-span-1 space-y-4">
            <NewsFeed />
            <Watchlist />
          </div>
        </div>

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4 sm:gap-6">
          <div className="xl:col-span-2">
            <MarketChart />
          </div>
          <div className="xl:col-span-1">
            <TradeHistory />
          </div>
        </div>

        {/* Live Market Data Section */}
        <LiveMarketData />
        
        {/* Signal Accuracy Panel */}
        <SignalAccuracyPanel />

        {/* Risk Management Panel */}
        <RiskManagementPanel />

        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-6">
          <RiskAnalysis />
          <PositionsTable />
        </div>
      </div>
    </NewPageLayout>
  );
}
