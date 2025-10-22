'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Database, Calendar, TrendingUp, RefreshCw } from 'lucide-react';

interface Snapshot {
  id: string;
  snapshot_date: string;
  period_label: string;
  opening_stock_value: string;
  closing_stock_value: string;
  snapshot_type: 'all_time' | 'year_end' | 'monthly';
  calculated_at: string;
}

export default function OpeningStockSnapshotsPage() {
  const [loading, setLoading] = useState(false);
  const [year, setYear] = useState(new Date().getFullYear());
  const [message, setMessage] = useState('');
  const [snapshots, setSnapshots] = useState<Snapshot[]>([]);

  const calculateAllTime = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/opening-stock/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'calculate_all_time' })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ All Time snapshot saved! Opening Stock: ₹${data.data.openingStock.toLocaleString()}`);
        fetchSnapshots();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const generateYearly = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/opening-stock/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_yearly', year })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ Generated ${data.data?.length || 0} monthly snapshots for ${year}`);
        fetchSnapshots();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const generateFinancialYear = async () => {
    setLoading(true);
    setMessage('');
    try {
      const response = await fetch('/api/opening-stock/snapshots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'generate_financial_year', startYear: year })
      });
      
      const data = await response.json();
      if (data.success) {
        setMessage(`✅ Generated financial year snapshots for FY ${year}-${year + 1}`);
        fetchSnapshots();
      } else {
        setMessage(`❌ Error: ${data.error}`);
      }
    } catch (error) {
      setMessage(`❌ Error: ${error}`);
    }
    setLoading(false);
  };

  const fetchSnapshots = async () => {
    try {
      const response = await fetch('/api/opening-stock/snapshots');
      const data = await response.json();
      if (data.success) {
        setSnapshots(data.data || []);
      }
    } catch (error) {
      console.error('Error fetching snapshots:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <div className="bg-white/80 backdrop-blur-sm rounded-2xl border border-white/20 shadow-xl p-6">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Opening Stock Snapshots Management
          </h1>
          <p className="text-gray-600 mt-2">
            Calculate and store opening/closing stock values for faster dashboard performance
          </p>
        </div>

        {message && (
          <div className={`p-4 rounded-lg ${message.includes('✅') ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
            {message}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* All Time Snapshot */}
          <Card className="border-2 border-blue-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Database className="h-5 w-5 text-blue-600" />
                All Time Snapshot
              </CardTitle>
              <CardDescription>
                Calculate total opening stock value from all historical sales
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={calculateAllTime} 
                disabled={loading}
                className="w-full bg-blue-600 hover:bg-blue-700"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Calculate All Time
              </Button>
              <p className="text-xs text-gray-500 mt-2">
                Formula: Total Sales Cost + Current Closing Stock
              </p>
            </CardContent>
          </Card>

          {/* Calendar Year Snapshots */}
          <Card className="border-2 border-green-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-green-600" />
                Calendar Year (Jan-Dec)
              </CardTitle>
              <CardDescription>
                Generate monthly snapshots for a calendar year
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                placeholder="Enter year"
                min="2020"
                max={new Date().getFullYear() + 1}
              />
              <Button 
                onClick={generateYearly} 
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate {year} Snapshots
              </Button>
            </CardContent>
          </Card>

          {/* Financial Year Snapshots */}
          <Card className="border-2 border-purple-200">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-purple-600" />
                Financial Year (Apr-Mar)
              </CardTitle>
              <CardDescription>
                Generate snapshots for financial year
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Input 
                type="number" 
                value={year} 
                onChange={(e) => setYear(parseInt(e.target.value))}
                placeholder="Enter start year"
                min="2020"
                max={new Date().getFullYear() + 1}
              />
              <Button 
                onClick={generateFinancialYear} 
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700"
              >
                {loading ? <RefreshCw className="h-4 w-4 animate-spin mr-2" /> : null}
                Generate FY {year}-{year + 1}
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Snapshots List */}
        <Card>
          <CardHeader>
            <CardTitle>Saved Snapshots</CardTitle>
            <CardDescription>
              <div className="flex items-center justify-between">
                <span>View all calculated opening stock snapshots</span>
                <Button onClick={fetchSnapshots} variant="outline" size="sm">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Refresh
                </Button>
              </div>
            </CardDescription>
          </CardHeader>
          <CardContent>
            {snapshots.length === 0 ? (
              <p className="text-gray-500 text-center py-8">
                No snapshots found. Click the buttons above to generate snapshots.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2 px-4">Date</th>
                      <th className="text-left py-2 px-4">Period</th>
                      <th className="text-right py-2 px-4">Opening Stock</th>
                      <th className="text-right py-2 px-4">Closing Stock</th>
                      <th className="text-left py-2 px-4">Type</th>
                      <th className="text-left py-2 px-4">Calculated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {snapshots.map((snapshot) => (
                      <tr key={snapshot.id} className="border-b hover:bg-gray-50">
                        <td className="py-2 px-4">{new Date(snapshot.snapshot_date).toLocaleDateString()}</td>
                        <td className="py-2 px-4">{snapshot.period_label}</td>
                        <td className="py-2 px-4 text-right font-semibold text-blue-600">
                          ₹{parseFloat(snapshot.opening_stock_value).toLocaleString()}
                        </td>
                        <td className="py-2 px-4 text-right font-semibold text-green-600">
                          ₹{parseFloat(snapshot.closing_stock_value).toLocaleString()}
                        </td>
                        <td className="py-2 px-4">
                          <span className={`px-2 py-1 rounded text-xs ${
                            snapshot.snapshot_type === 'all_time' ? 'bg-blue-100 text-blue-800' :
                            snapshot.snapshot_type === 'year_end' ? 'bg-purple-100 text-purple-800' :
                            'bg-green-100 text-green-800'
                          }`}>
                            {snapshot.snapshot_type}
                          </span>
                        </td>
                        <td className="py-2 px-4 text-sm text-gray-500">
                          {new Date(snapshot.calculated_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
