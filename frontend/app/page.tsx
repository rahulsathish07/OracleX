'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, LineChart, Line, ReferenceLine
} from 'recharts';
import {
  Leaf, Activity, History, ShieldCheck, Plus, Globe,
  X, ExternalLink, Percent, Zap, Database, Navigation, Loader2, PlayCircle, TrendingUp
} from 'lucide-react';

const API_BASE = "http://localhost:8000";

export default function CarbonOracleMaster() {
  const [bonds, setBonds] = useState<any[]>([]);
  const [selectedBond, setSelectedBond] = useState<any>(null);
  const [manualInput, setManualInput] = useState('');

  // Data States
  const [timeWarpData, setTimeWarpData] = useState<any[]>([]);
  const [liveFeed, setLiveFeed] = useState<any[]>([]);

  const [showCreate, setShowCreate] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  const socketRef = useRef<WebSocket | null>(null);

  // Default Form
  const [newBond, setNewBond] = useState({
    bond_id: '',
    name: '',
    lat: 12.97, // User Input
    lon: 77.59, // User Input
    capacity_kw: 100, // User Input
    threshold: 75, // User Input
    base_interest_rate: 5.5, // User Input
    contract_address: '0x' + Math.random().toString(16).slice(2, 42)
  });

  /* ---------------- 1. FETCH & REFRESH ---------------- */
  const fetchBonds = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/v1/bonds`);
      const data = await res.json();
      setBonds(Array.isArray(data) ? data : []);

      // Live update of Interest Rate if bond is selected
      if (selectedBond) {
        const updated = data.find((b: any) => b.bond_id === selectedBond.bond_id);
        if (updated) setSelectedBond(updated);
      }
    } catch (err) { console.error(err); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchBonds(); }, []);

  /* ---------------- 2. BOND SELECTION & WS ---------------- */
  useEffect(() => {
    if (!selectedBond) return;
    fetchHistory();

    // WebSocket for LIVE GRAPH
    if (socketRef.current) socketRef.current.close();
    try {
      socketRef.current = new WebSocket(`ws://localhost:8000/ws/oracle/${selectedBond.bond_id}`);
      socketRef.current.onmessage = (event) => {
        const msg = JSON.parse(event.data);
        if (msg.type === "ORACLE_UPDATE") {
          setLiveFeed(prev => [...prev.slice(-19), msg.data]);
        }
      };
    } catch (e) { console.error(e); }

    return () => socketRef.current?.close();
  }, [selectedBond?.bond_id]);

  const fetchHistory = async () => {
    if (!selectedBond) return;
    try {
      const res = await fetch(`${API_BASE}/oracle/audit/${selectedBond.bond_id}`);
      const data = await res.json();
      const log = data.audit_log || [];
      // Sort by date
      setTimeWarpData(log.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime()));
    } catch (e) { setTimeWarpData([]); }
  };

  /* ---------------- 3. ACTIONS ---------------- */
  const handleCreateBond = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch(`${API_BASE}/api/v1/bonds`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(newBond)
    });
    setShowCreate(false);
    fetchBonds();
  };

  // Triggered by "Simulate History" button
  const simulateIoTData = async () => {
    if (!selectedBond) return;
    setIsSimulating(true);

    // Simulate last 30 days of "IoT" data fetching
    for (let i = 29; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      // We call the PR endpoint WITHOUT actual_energy.
      // The backend will generate it based on the Bond Profile + Lat/Lon
      await fetch(`${API_BASE}/oracle/pr/${selectedBond.bond_id}/${dateStr}`);
    }

    await fetchBonds(); // Get new interest rate
    await fetchHistory(); // Update Time Warp Graph
    setIsSimulating(false);
  };

  const submitProductionLog = async () => {
    if (!manualInput || !selectedBond) return;
    const today = new Date().toISOString().split('T')[0];

    // Manual Input Override
    await fetch(`${API_BASE}/oracle/pr/${selectedBond.bond_id}/${today}?actual_energy=${manualInput}`);
    await fetch(`${API_BASE}/oracle/publish/${selectedBond.bond_id}/${today}`, { method: 'POST' });

    setManualInput('');
    fetchBonds();
    fetchHistory();
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 p-4 md:p-10 font-sans selection:bg-emerald-100">

      {/* HEADER */}
      <nav className="max-w-7xl mx-auto mb-10 flex justify-between items-center bg-white border border-slate-200 p-4 rounded-[2rem] shadow-sm">
        <div className="flex items-center gap-3 pl-2">
          <div className="bg-emerald-600 p-2 rounded-xl text-white"><Leaf size={20} fill="currentColor" /></div>
          <h1 className="font-black text-lg tracking-tight">CarbonOracle</h1>
        </div>
        <div className="flex items-center gap-2 pr-2">
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-xl text-xs font-bold hover:bg-black transition-all"><Plus size={14} /> NEW_ASSET</button>
          {selectedBond && <button onClick={() => setSelectedBond(null)} className="px-5 py-3 rounded-xl border border-slate-200 text-xs font-bold text-slate-500 hover:bg-slate-50">BACK</button>}
        </div>
      </nav>

      <main className="max-w-7xl mx-auto">
        {!selectedBond ? (
          /* PORTFOLIO GRID */
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {bonds.map(b => (
              <div key={b.bond_id} onClick={() => setSelectedBond(b)} className="bg-white border border-slate-100 p-8 rounded-[2.5rem] hover:shadow-xl hover:border-emerald-200 transition-all cursor-pointer group">
                <div className="flex justify-between mb-8"><Zap className="text-slate-300 group-hover:text-emerald-500 transition-colors" size={32} /><span className="text-[10px] font-mono text-slate-400">{b.bond_id}</span></div>
                <h3 className="text-xl font-black mb-2">{b.name}</h3>
                <div className="flex justify-between items-end border-t border-slate-50 pt-4">
                  <div><p className="text-[9px] font-bold text-slate-400 uppercase">Capacity</p><p className="font-bold">{b.capacity_kw}kW</p></div>
                  <div className="text-right"><p className="text-[9px] font-bold text-slate-400 uppercase">Rate</p><p className="font-bold text-emerald-600">{b.base_interest_rate}%</p></div>
                </div>
              </div>
            ))}
            {bonds.length === 0 && !isLoading && <div className="col-span-3 text-center py-20 text-slate-400 font-mono text-xs">NO ASSETS FOUND</div>}
          </div>
        ) : (
          /* DASHBOARD */
          <div className="space-y-6 animate-in fade-in duration-500">

            {/* TOP SECTION */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

              {/* ASSET INFO */}
              <div className="lg:col-span-2 bg-white border border-slate-100 p-10 rounded-[3rem] shadow-sm flex flex-col justify-between relative overflow-hidden">
                <div className="absolute top-0 right-0 p-10 opacity-5"><Activity size={120} /></div>
                <div>
                  <span className="bg-emerald-100 text-emerald-700 text-[9px] font-black px-3 py-1 rounded-full uppercase">Verified_Node</span>
                  <h2 className="text-4xl font-black text-slate-900 mt-4 mb-8">{selectedBond.name}</h2>
                </div>
                <div className="flex gap-10">
                  <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Rate (Dynamic)</p><p className="text-2xl font-black text-emerald-600 flex items-center gap-2">{selectedBond.base_interest_rate}% <TrendingUp size={16} /></p></div>
                  <div><p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Lat, Lon</p><p className="text-2xl font-black text-slate-700">{selectedBond.lat}, {selectedBond.lon}</p></div>
                </div>
              </div>

              {/* CONTROL PANEL */}
              <div className="bg-slate-900 text-white p-10 rounded-[3rem] shadow-2xl flex flex-col justify-center">
                <p className="text-[10px] font-mono text-emerald-400 uppercase mb-4 tracking-widest">Oracle_Input</p>
                <div className="space-y-3">
                  <input type="number" value={manualInput} onChange={e => setManualInput(e.target.value)} placeholder="Manual kWh Input" className="w-full bg-white/10 border border-white/10 rounded-xl px-4 py-3 outline-none font-mono text-sm" />
                  <button onClick={submitProductionLog} className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-900 font-black py-3 rounded-xl text-xs transition-colors">EXECUTE_PROOF</button>
                  <button onClick={simulateIoTData} disabled={isSimulating} className="w-full bg-slate-800 hover:bg-slate-700 text-slate-400 font-bold py-3 rounded-xl text-[10px] flex justify-center items-center gap-2">
                    {isSimulating ? <Loader2 className="animate-spin" size={12} /> : <PlayCircle size={12} />} PULL_IOT_DATA (30 DAYS)
                  </button>
                </div>
              </div>
            </div>

            {/* GRAPHS */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

              {/* GRAPH 1: LIVE FEED */}
              <div className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-sm h-80">
                <h4 className="text-[10px] font-bold text-emerald-600 uppercase mb-6 flex items-center gap-2"><Activity size={14} /> Live_Session_Feed</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={liveFeed}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <YAxis domain={[0, 100]} hide />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Line type="step" dataKey="performance_ratio" stroke="#059669" strokeWidth={3} dot={{ r: 4 }} isAnimationActive={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* GRAPH 2: TIME WARP */}
              <div className="bg-white border border-slate-100 p-8 rounded-[3rem] shadow-sm h-80">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase mb-6 flex items-center gap-2"><History size={14} /> Audit_History (Time Warp)</h4>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={timeWarpData}>
                    <defs><linearGradient id="colorPr" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366F1" stopOpacity={0.1} /><stop offset="95%" stopColor="#6366F1" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#F1F5F9" />
                    <XAxis dataKey="date" hide />
                    <Tooltip contentStyle={{ borderRadius: '12px' }} />
                    <Area type="monotone" dataKey="performance_ratio" stroke="#6366F1" fill="url(#colorPr)" strokeWidth={3} />
                    <ReferenceLine y={selectedBond.threshold} stroke="#FDA4AF" strokeDasharray="3 3" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* BLOCKCHAIN LOG */}
            <div className="bg-white border border-slate-100 rounded-[3rem] p-8">
              <h4 className="text-[10px] font-bold text-slate-900 uppercase mb-6 flex items-center gap-2"><Database size={14} /> Chain_Ledger</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-[10px]">
                  <thead className="text-slate-400 border-b border-slate-50"><tr><th className="py-3">Date</th><th>Verdict</th><th className="text-right">Proof</th></tr></thead>
                  <tbody>
                    {timeWarpData.slice().reverse().slice(0, 5).map((log: any, i: number) => (
                      <tr key={i} className="border-b border-slate-50 last:border-0">
                        <td className="py-3 text-slate-500">{log.date}</td>
                        <td className="py-3"><span className={`px-2 py-1 rounded-md font-bold ${log.verdict === 'COMPLIANT' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>{log.verdict}</span></td>
                        <td className="py-3 text-right">
                          {log.tx_link ? <a href={`https://sepolia.etherscan.io/tx/${log.tx_link}`} target="_blank" className="text-blue-500 underline">SIMULATED_TX</a> : '--'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* CREATE FORM */}
      {showCreate && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md flex items-center justify-center p-6 z-50">
          <div className="bg-white w-full max-w-md rounded-[3rem] p-10 shadow-2xl relative">
            <button onClick={() => setShowCreate(false)} className="absolute top-8 right-8 text-slate-300 hover:text-slate-900"><X size={20} /></button>
            <h2 className="text-2xl font-black mb-6">Create Bond</h2>
            <form onSubmit={handleCreateBond} className="space-y-4">
              <input required placeholder="Bond ID (e.g. BOND_01)" className="w-full bg-slate-50 rounded-xl p-4 font-bold text-sm" onChange={e => setNewBond({ ...newBond, bond_id: e.target.value })} />
              <input required placeholder="Name" className="w-full bg-slate-50 rounded-xl p-4 font-bold text-sm" onChange={e => setNewBond({ ...newBond, name: e.target.value })} />

              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="Lat" className="bg-slate-50 rounded-xl p-4 font-mono text-sm" onChange={e => setNewBond({ ...newBond, lat: parseFloat(e.target.value) })} />
                <input type="number" placeholder="Lon" className="bg-slate-50 rounded-xl p-4 font-mono text-sm" onChange={e => setNewBond({ ...newBond, lon: parseFloat(e.target.value) })} />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <input type="number" placeholder="kW" className="bg-slate-50 rounded-xl p-4 font-bold text-sm" onChange={e => setNewBond({ ...newBond, capacity_kw: parseFloat(e.target.value) })} />
                <input type="number" step="0.1" placeholder="Rate %" className="bg-slate-50 rounded-xl p-4 font-bold text-sm text-emerald-600" onChange={e => setNewBond({ ...newBond, base_interest_rate: parseFloat(e.target.value) })} />
              </div>

              <input type="number" placeholder="Threshold %" className="w-full bg-slate-50 rounded-xl p-4 font-bold text-sm" onChange={e => setNewBond({ ...newBond, threshold: parseFloat(e.target.value) })} />

              <button type="submit" className="w-full bg-emerald-500 text-white font-black py-4 rounded-xl shadow-lg shadow-emerald-200">REGISTER</button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
