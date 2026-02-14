'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell
} from 'recharts';

// Types
interface Bond {
  bond_id: string;
  name: string;
  capacity_kw: number;
  threshold: number;
  lat: number;
  lon: number;
  contract_address: string;
}

interface DailyResult {
  date: string;
  actual_energy_kwh: number;
  ghi: number;
  performance_ratio: number;
  theoretical_max_kwh: number;
  verdict: string;
  flag?: string;
}

interface BatchAuditResult {
  bond_id: string;
  bond_name: string;
  period: string;
  start_date: string;
  end_date: string;
  total_days: number;
  compliant_days: number;
  penalty_days: number;
  threshold: number;
  audit_log: DailyResult[];
}

const API_BASE = 'http://localhost:8000/oracle';
const COLORS = {
  compliant: '#10B981',
  penalty: '#EF4444',
  ignored: '#64748B',
  primary: '#059669',
  secondary: '#6366F1',
  accent: '#14B8A6',
  chartLine: '#34D399',
  grid: '#E5E7EB',
  text: '#0F172A',
  textSecondary: '#475569',
  background: '#F9FAFB',
  cardBg: '#FFFFFF'
};

export default function SolarBondOracle() {
  const [bonds, setBonds] = useState<Bond[]>([]);
  const [selectedBond, setSelectedBond] = useState<string>('');
  const [batchData, setBatchData] = useState<BatchAuditResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [txLink, setTxLink] = useState<string>('');

  // Bond creation form
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBond, setNewBond] = useState({
    bond_id: '',
    name: '',
    capacity_kw: 50,
    threshold: 75,
    lat: 12.97,
    lon: 77.59,
    contract_address: '0x78efd50b1607a9b0a350849202111e6ac7255d50'
  });

  // Initialize with default bond
  useEffect(() => {
    const defaultBond: Bond = {
      bond_id: 'BOND_1',
      name: 'Green Solar Farm Alpha',
      capacity_kw: 50.0,
      threshold: 75,
      lat: 12.97,
      lon: 77.59,
      contract_address: '0x78efd50b1607a9b0a350849202111e6ac7255d50'
    };
    setBonds([defaultBond]);
    setSelectedBond('BOND_1');
  }, []);

  // Fetch batch audit data
  const fetchBatchAudit = async (bondId: string) => {
    if (!bondId) return;

    setLoading(true);
    setBatchData(null);

    try {
      const response = await fetch(`${API_BASE}/audit/${bondId}`);

      if (!response.ok) {
        if (response.status === 404) {
          alert(`No production data found for bond: ${bondId}\n\nThis bond exists but has no historical data yet. You need to add production data to your backend's MOCK_PRODUCTION_DATA.`);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      setBatchData(data);
    } catch (error) {
      console.error('Error fetching batch audit:', error);
      alert(`Failed to fetch audit data. Make sure your backend is running at ${API_BASE}\n\nError: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Publish to blockchain
  const publishToBlockchain = async (date: string) => {
    if (!selectedBond) return;

    setLoading(true);
    setTxLink('');

    try {
      const response = await fetch(`${API_BASE}/publish/${selectedBond}/${date}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      const txResult = data.blockchain_tx;

      if (txResult && txResult.startsWith('https://')) {
        setTxLink(txResult);
        alert(`Audit published to blockchain\n\nPR: ${data.oracle_result.performance_ratio}%\nStatus: ${data.oracle_result.verdict}\n\nTransaction: ${txResult}`);
      } else {
        alert(`Oracle calculated successfully but blockchain publishing failed:\n\n${txResult}\n\nOracle Result:\nPR: ${data.oracle_result.performance_ratio}%\nStatus: ${data.oracle_result.verdict}`);
      }

    } catch (error) {
      console.error('Error publishing to blockchain:', error);
      alert(`Failed to publish to blockchain.\n\nMake sure:\n1. Your backend is running\n2. PRIVATE_KEY is set in .env\n3. You have Sepolia ETH in your wallet\n\nError: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  // Create new bond
  const handleCreateBond = () => {
    const bond: Bond = { ...newBond };
    setBonds([...bonds, bond]);
    setSelectedBond(bond.bond_id);
    setShowCreateForm(false);

    setNewBond({
      bond_id: '',
      name: '',
      capacity_kw: 50,
      threshold: 75,
      lat: 12.97,
      lon: 77.59,
      contract_address: '0x78efd50b1607a9b0a350849202111e6ac7255d50'
    });
  };

  // Load batch data when bond changes
  useEffect(() => {
    if (selectedBond) {
      fetchBatchAudit(selectedBond);
    }
  }, [selectedBond]);

  // Chart data transformations
  const prTimeSeriesData = (batchData?.audit_log || []).map(log => ({
    date: log.date.substring(5),
    pr: log.performance_ratio,
    threshold: batchData?.threshold || 75,
    verdict: log.verdict
  }));

  const energyComparisonData = (batchData?.audit_log || []).map(log => ({
    date: log.date.substring(5),
    actual: log.actual_energy_kwh,
    theoretical: log.theoretical_max_kwh
  }));

  const compliancePieData = batchData && batchData.compliant_days !== undefined ? [
    { name: 'Compliant', value: batchData.compliant_days, color: COLORS.compliant },
    { name: 'Penalty', value: batchData.penalty_days, color: COLORS.penalty }
  ] : [];

  const selectedBondData = bonds.find(b => b.bond_id === selectedBond);

  return (
    <div className="min-h-screen" style={{ backgroundColor: COLORS.background }}>
      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Header */}
        <header className="mb-12">
          <div className="flex items-baseline gap-3 mb-3">
            <h1 className="text-5xl font-semibold tracking-tight" style={{ color: COLORS.primary }}>
              Oracle
            </h1>
            <span className="text-2xl font-light" style={{ color: COLORS.textSecondary }}>
              Performance Monitor
            </span>
          </div>
          <p className="text-lg font-light" style={{ color: COLORS.textSecondary }}>
            Real-time solar bond performance monitoring with blockchain verification
          </p>
        </header>

        {/* Bond Management */}
        <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold" style={{ color: COLORS.text }}>Bonds</h2>
            <button
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-5 py-2.5 rounded-xl transition-all duration-200 font-medium text-sm border"
              style={{
                backgroundColor: showCreateForm ? COLORS.background : 'white',
                borderColor: COLORS.grid,
                color: COLORS.text
              }}
            >
              {showCreateForm ? 'Cancel' : 'New Bond'}
            </button>
          </div>

          {/* Create Bond Form */}
          {showCreateForm && (
            <div className="rounded-xl p-6 mb-6 border" style={{ backgroundColor: COLORS.background, borderColor: COLORS.grid }}>
              <h3 className="text-lg font-semibold mb-6" style={{ color: COLORS.text }}>Initialize Bond</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Bond ID</label>
                  <input
                    type="text"
                    value={newBond.bond_id}
                    onChange={(e) => setNewBond({ ...newBond, bond_id: e.target.value })}
                    className="w-full px-4 py-3 bg-white rounded-lg border outline-none transition-colors"
                    style={{ borderColor: COLORS.grid, color: COLORS.text }}
                    placeholder="BOND_2"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Bond Name</label>
                  <input
                    type="text"
                    value={newBond.name}
                    onChange={(e) => setNewBond({ ...newBond, name: e.target.value })}
                    className="w-full px-4 py-3 bg-white rounded-lg border outline-none transition-colors"
                    style={{ borderColor: COLORS.grid, color: COLORS.text }}
                    placeholder="Solar Farm Beta"
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Capacity (kW)</label>
                  <input
                    type="number"
                    value={newBond.capacity_kw}
                    onChange={(e) => setNewBond({ ...newBond, capacity_kw: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-white rounded-lg border outline-none transition-colors"
                    style={{ borderColor: COLORS.grid, color: COLORS.text }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>PR Threshold (%)</label>
                  <input
                    type="number"
                    value={newBond.threshold}
                    onChange={(e) => setNewBond({ ...newBond, threshold: parseInt(e.target.value) })}
                    className="w-full px-4 py-3 bg-white rounded-lg border outline-none transition-colors"
                    style={{ borderColor: COLORS.grid, color: COLORS.text }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Latitude</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBond.lat}
                    onChange={(e) => setNewBond({ ...newBond, lat: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-white rounded-lg border outline-none transition-colors"
                    style={{ borderColor: COLORS.grid, color: COLORS.text }}
                  />
                </div>
                <div>
                  <label className="block text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Longitude</label>
                  <input
                    type="number"
                    step="0.01"
                    value={newBond.lon}
                    onChange={(e) => setNewBond({ ...newBond, lon: parseFloat(e.target.value) })}
                    className="w-full px-4 py-3 bg-white rounded-lg border outline-none transition-colors"
                    style={{ borderColor: COLORS.grid, color: COLORS.text }}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Contract Address</label>
                  <input
                    type="text"
                    value={newBond.contract_address}
                    onChange={(e) => setNewBond({ ...newBond, contract_address: e.target.value })}
                    className="w-full px-4 py-3 bg-white rounded-lg border outline-none transition-colors font-mono text-sm"
                    style={{ borderColor: COLORS.grid, color: COLORS.text }}
                  />
                </div>
              </div>
              <button
                onClick={handleCreateBond}
                disabled={!newBond.bond_id || !newBond.name}
                className="mt-6 px-6 py-3 rounded-xl transition-all duration-200 font-semibold disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: COLORS.primary, color: 'white' }}
              >
                Create Bond
              </button>
            </div>
          )}

          {/* Bond Selector */}
          <div className="flex gap-3 flex-wrap">
            {bonds.map(bond => (
              <button
                key={bond.bond_id}
                onClick={() => setSelectedBond(bond.bond_id)}
                className="px-5 py-2.5 rounded-xl transition-all duration-200 font-medium border"
                style={{
                  backgroundColor: selectedBond === bond.bond_id ? COLORS.primary : 'white',
                  color: selectedBond === bond.bond_id ? 'white' : COLORS.text,
                  borderColor: selectedBond === bond.bond_id ? COLORS.primary : COLORS.grid
                }}
              >
                {bond.name}
              </button>
            ))}
          </div>
        </div>

        {/* Bond Details */}
        {selectedBondData && (
          <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm border border-gray-100">
            <h2 className="text-xl font-semibold mb-6" style={{ color: COLORS.text }}>Bond Details</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div>
                <p className="text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Capacity</p>
                <p className="text-3xl font-semibold" style={{ color: COLORS.primary }}>{selectedBondData.capacity_kw} kW</p>
              </div>
              <div>
                <p className="text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Threshold</p>
                <p className="text-3xl font-semibold" style={{ color: COLORS.accent }}>{selectedBondData.threshold}%</p>
              </div>
              <div>
                <p className="text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Location</p>
                <p className="text-lg font-mono" style={{ color: COLORS.text }}>{selectedBondData.lat.toFixed(2)}, {selectedBondData.lon.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm mb-2 font-medium" style={{ color: COLORS.textSecondary }}>Contract</p>
                <a
                  href={`https://sepolia.etherscan.io/address/${selectedBondData.contract_address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-mono hover:opacity-80 underline underline-offset-4 transition-opacity"
                  style={{ color: COLORS.accent }}
                >
                  {selectedBondData.contract_address.substring(0, 10)}...
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="flex justify-center items-center py-20">
            <div className="w-12 h-12 border-2 border-gray-200 rounded-full animate-spin" style={{ borderTopColor: COLORS.primary }}></div>
          </div>
        )}

        {/* No Data State */}
        {!loading && !batchData && selectedBond && (
          <div className="bg-white rounded-2xl p-16 shadow-sm border border-gray-100 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full flex items-center justify-center" style={{ backgroundColor: COLORS.background }}>
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: COLORS.grid }}></div>
            </div>
            <h3 className="text-2xl font-semibold mb-3" style={{ color: COLORS.text }}>No Production Data</h3>
            <p className="mb-2" style={{ color: COLORS.textSecondary }}>
              This bond has been created but doesn't have any historical production data yet.
            </p>
            <p className="text-sm" style={{ color: COLORS.textSecondary }}>
              Add production records for <span className="font-mono" style={{ color: COLORS.primary }}>{selectedBond}</span> in your backend
            </p>
          </div>
        )}

        {/* Performance Summary */}
        {batchData && !loading && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
              {/* Compliant Days Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <p className="text-sm mb-3 font-medium" style={{ color: COLORS.textSecondary }}>Compliant Days</p>
                <p className="text-5xl font-semibold mb-3" style={{ color: COLORS.compliant }}>{batchData.compliant_days}</p>
                <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {((batchData.compliant_days / batchData.total_days) * 100).toFixed(1)}% compliance rate
                </p>
              </div>

              {/* Penalty Days Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <p className="text-sm mb-3 font-medium" style={{ color: COLORS.textSecondary }}>Penalty Days</p>
                <p className="text-5xl font-semibold mb-3" style={{ color: COLORS.penalty }}>{batchData.penalty_days}</p>
                <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {((batchData.penalty_days / batchData.total_days) * 100).toFixed(1)}% penalty rate
                </p>
              </div>

              {/* Total Days Card */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <p className="text-sm mb-3 font-medium" style={{ color: COLORS.textSecondary }}>Analysis Period</p>
                <p className="text-5xl font-semibold mb-3" style={{ color: COLORS.accent }}>{batchData.total_days}</p>
                <p className="text-sm" style={{ color: COLORS.textSecondary }}>
                  {batchData.start_date} to {batchData.end_date}
                </p>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
              {/* PR Time Series */}
              <div className="lg:col-span-2 bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold mb-6" style={{ color: COLORS.text }}>Performance Ratio</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <LineChart data={prTimeSeriesData}>
                    <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                    <XAxis dataKey="date" stroke={COLORS.textSecondary} style={{ fontSize: '12px' }} />
                    <YAxis stroke={COLORS.textSecondary} style={{ fontSize: '12px' }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: `1px solid ${COLORS.grid}`,
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: COLORS.text
                      }}
                    />
                    <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                    <Line
                      type="monotone"
                      dataKey="pr"
                      stroke={COLORS.chartLine}
                      strokeWidth={3}
                      name="Performance Ratio (%)"
                      dot={false}
                      activeDot={{ r: 6, fill: COLORS.primary }}
                    />
                    <Line
                      type="monotone"
                      dataKey="threshold"
                      stroke={COLORS.penalty}
                      strokeWidth={2}
                      strokeDasharray="6 6"
                      name="Threshold"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Compliance Pie */}
              <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
                <h3 className="text-xl font-semibold mb-6" style={{ color: COLORS.text }}>Compliance</h3>
                <ResponsiveContainer width="100%" height={320}>
                  <PieChart>
                    <Pie
                      data={compliancePieData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                      outerRadius={90}
                      fill="#8884d8"
                      dataKey="value"
                      style={{ fontSize: '13px', fontWeight: '500', fill: COLORS.text }}
                    >
                      {compliancePieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'white',
                        border: `1px solid ${COLORS.grid}`,
                        borderRadius: '12px',
                        fontSize: '13px',
                        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                        color: COLORS.text
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Energy Comparison */}
            <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold mb-6" style={{ color: COLORS.text }}>Energy Production</h3>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={energyComparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={COLORS.grid} />
                  <XAxis dataKey="date" stroke={COLORS.textSecondary} style={{ fontSize: '12px' }} />
                  <YAxis stroke={COLORS.textSecondary} style={{ fontSize: '12px' }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'white',
                      border: `1px solid ${COLORS.grid}`,
                      borderRadius: '12px',
                      fontSize: '13px',
                      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                      color: COLORS.text
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '20px' }} />
                  <Bar dataKey="theoretical" fill={COLORS.secondary} name="Theoretical Max (kWh)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="actual" fill={COLORS.compliant} name="Actual Production (kWh)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Blockchain Section */}
            <div className="bg-white rounded-2xl p-8 mb-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold mb-3" style={{ color: COLORS.text }}>Blockchain Verification</h3>
              <p className="text-sm mb-6" style={{ color: COLORS.textSecondary }}>
                Publish audit results to Ethereum Sepolia for immutable record keeping
              </p>

              <div className="flex gap-4 items-center">
                <input
                  type="date"
                  id="publish-date"
                  className="px-4 py-3 bg-white rounded-xl border outline-none transition-colors"
                  style={{ borderColor: COLORS.grid, color: COLORS.text }}
                  defaultValue={batchData.end_date}
                />
                <button
                  onClick={() => {
                    const dateInput = document.getElementById('publish-date') as HTMLInputElement;
                    publishToBlockchain(dateInput.value);
                  }}
                  disabled={loading}
                  className="px-6 py-3 rounded-xl transition-all duration-200 font-semibold disabled:opacity-40"
                  style={{ backgroundColor: COLORS.primary, color: 'white' }}
                >
                  Publish to Chain
                </button>
              </div>

              {txLink && (
                <div className="mt-6 p-4 rounded-xl border" style={{ backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }}>
                  <p className="font-semibold mb-2" style={{ color: COLORS.compliant }}>Transaction Published</p>
                  <a
                    href={txLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm hover:underline underline-offset-4 break-all transition-all"
                    style={{ color: COLORS.accent }}
                  >
                    {txLink}
                  </a>
                </div>
              )}
            </div>

            {/* Audit Log */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100">
              <h3 className="text-xl font-semibold mb-6" style={{ color: COLORS.text }}>Audit Log</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b" style={{ borderColor: COLORS.grid }}>
                      <th className="text-left py-4 px-4 font-medium" style={{ color: COLORS.textSecondary }}>Date</th>
                      <th className="text-right py-4 px-4 font-medium" style={{ color: COLORS.textSecondary }}>Actual (kWh)</th>
                      <th className="text-right py-4 px-4 font-medium" style={{ color: COLORS.textSecondary }}>Theoretical (kWh)</th>
                      <th className="text-right py-4 px-4 font-medium" style={{ color: COLORS.textSecondary }}>GHI</th>
                      <th className="text-right py-4 px-4 font-medium" style={{ color: COLORS.textSecondary }}>PR (%)</th>
                      <th className="text-center py-4 px-4 font-medium" style={{ color: COLORS.textSecondary }}>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {batchData.audit_log.slice().reverse().map((log, idx) => (
                      <tr key={idx} className="border-b hover:bg-gray-50 transition-colors" style={{ borderColor: COLORS.grid }}>
                        <td className="py-4 px-4" style={{ color: COLORS.text }}>{log.date}</td>
                        <td className="text-right py-4 px-4" style={{ color: COLORS.textSecondary }}>{log.actual_energy_kwh.toFixed(2)}</td>
                        <td className="text-right py-4 px-4" style={{ color: COLORS.textSecondary }}>{log.theoretical_max_kwh.toFixed(2)}</td>
                        <td className="text-right py-4 px-4" style={{ color: COLORS.textSecondary }}>{log.ghi.toFixed(2)}</td>
                        <td className="text-right py-4 px-4 font-semibold" style={{ color: COLORS.text }}>{log.performance_ratio.toFixed(2)}</td>
                        <td className="text-center py-4 px-4">
                          <span
                            className="px-3 py-1.5 rounded-lg text-xs font-semibold border"
                            style={{
                              backgroundColor: log.verdict === 'COMPLIANT' ? '#ECFDF5' : log.verdict === 'PENALTY' ? '#FEF2F2' : '#F9FAFB',
                              borderColor: log.verdict === 'COMPLIANT' ? '#A7F3D0' : log.verdict === 'PENALTY' ? '#FECACA' : COLORS.grid,
                              color: log.verdict === 'COMPLIANT' ? COLORS.compliant : log.verdict === 'PENALTY' ? COLORS.penalty : COLORS.ignored
                            }}
                          >
                            {log.verdict}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
