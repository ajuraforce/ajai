import { useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Chart from "chart.js/auto";

export default function MarketChart() {
  const chartRef = useRef<HTMLCanvasElement>(null);
  const chartInstanceRef = useRef<Chart | null>(null);
  
  const { data: portfolio } = useQuery({
    queryKey: ["/api/portfolio"],
    refetchInterval: 30000,
  });

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.getContext("2d");
    if (!ctx) return;

    // Destroy existing chart
    if (chartInstanceRef.current) {
      chartInstanceRef.current.destroy();
    }

    // Generate sample data for portfolio performance
    const generatePortfolioData = () => {
      const baseValue = parseFloat(portfolio?.totalValue || "127543");
      const labels = [];
      const data = [];
      
      for (let i = 12; i >= 0; i--) {
        const time = new Date();
        time.setHours(time.getHours() - i);
        labels.push(time.toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }));
        
        const variation = (Math.random() - 0.5) * 0.02; // ±2% variation
        data.push(baseValue * (1 + variation));
      }
      
      return { labels, data };
    };

    const { labels, data } = generatePortfolioData();

    chartInstanceRef.current = new Chart(ctx, {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Portfolio Value',
          data,
          borderColor: 'hsl(173, 58%, 39%)',
          backgroundColor: 'hsla(173, 58%, 39%, 0.1)',
          tension: 0.4,
          fill: true,
          pointRadius: 3,
          pointHoverRadius: 6,
          pointBackgroundColor: 'hsl(173, 58%, 39%)',
          pointBorderColor: 'hsl(222, 84%, 5%)',
          pointBorderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          x: {
            grid: {
              color: 'hsl(217, 19%, 27%)',
              drawBorder: false
            },
            ticks: {
              color: 'hsl(215, 20%, 65%)',
              font: {
                size: 11
              }
            }
          },
          y: {
            grid: {
              color: 'hsl(217, 19%, 27%)',
              drawBorder: false
            },
            ticks: {
              color: 'hsl(215, 20%, 65%)',
              font: {
                size: 11
              },
              callback: function(value: any) {
                return '$' + value.toLocaleString();
              }
            }
          }
        }
      }
    });

    // Simulate real-time updates
    const interval = setInterval(() => {
      if (chartInstanceRef.current) {
        const chart = chartInstanceRef.current;
        const lastValue = chart.data.datasets[0].data[chart.data.datasets[0].data.length - 1] as number;
        const change = (Math.random() - 0.5) * 1000;
        const newValue = lastValue + change;
        
        chart.data.datasets[0].data.push(newValue);
        chart.data.labels?.push(new Date().toLocaleTimeString('en-US', { 
          hour: '2-digit', 
          minute: '2-digit',
          hour12: false 
        }));
        
        if (chart.data.datasets[0].data.length > 20) {
          chart.data.datasets[0].data.shift();
          chart.data.labels?.shift();
        }
        
        chart.update('none');
      }
    }, 10000);

    return () => {
      clearInterval(interval);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.destroy();
      }
    };
  }, [portfolio]);

  return (
    <Card className="border border-border">
      <div className="p-6 border-b border-border">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold">Portfolio Performance</h3>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" className="bg-primary/10 text-primary border-primary/20" data-testid="chart-period-1d">
              1D
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="chart-period-1w">
              1W
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="chart-period-1m">
              1M
            </Button>
            <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground" data-testid="chart-period-1y">
              1Y
            </Button>
          </div>
        </div>
      </div>
      
      <div className="p-6">
        <div className="h-64">
          <canvas ref={chartRef} data-testid="portfolio-chart"></canvas>
        </div>
      </div>
    </Card>
  );
}
