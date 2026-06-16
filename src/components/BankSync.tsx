import React, { useState, useEffect } from 'react';
import { 
  Building2, 
  RefreshCw, 
  AlertCircle, 
  CheckCircle2, 
  HelpCircle, 
  ArrowRightLeft, 
  Plus, 
  Database, 
  Key, 
  ShieldAlert, 
  Lock, 
  ChevronRight, 
  Info, 
  Sparkles,
  Link2 
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface Transaction {
  id: string;
  amount: number;
  description: string;
  date: string;
}

interface BankSyncProps {
  onIncomeSynced: (amount: number, transactions: Transaction[], bankName: string) => void;
  triggerNotification: (msg: string) => void;
}

export default function BankSync({ onIncomeSynced, triggerNotification }: BankSyncProps) {
  // Status states
  const [plaidConfig, setPlaidConfig] = useState<{ configured: boolean; environment: string; clientIdProvided: boolean } | null>(null);
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [accessToken, setAccessToken] = useState<string | null>(() => localStorage.getItem('bank_access_token'));
  const [bankName, setBankName] = useState<string | null>(() => localStorage.getItem('bank_name'));
  const [syncingTransactions, setSyncingTransactions] = useState(false);
  const [recentBankTransactions, setRecentBankTransactions] = useState<Transaction[]>(() => {
    const saved = localStorage.getItem('bank_synced_transactions');
    return saved ? JSON.parse(saved) : [];
  });

  // Simulated link state
  const [showSimulateModal, setShowSimulateModal] = useState(false);
  const [simulateStep, setSimulateStep] = useState(0); // 0: Bank selection, 1: Connecting, 2: Access Token Granted
  const [selectedSimBank, setSelectedSimBank] = useState('');

  // Dynamically inject the Plaid Link script to avoid standard React 19 NPM peer dependency resolution issues.
  useEffect(() => {
    const isScriptLoaded = document.querySelector('script[src*="cdn.plaid.com"]');
    if (!isScriptLoaded) {
      const script = document.createElement('script');
      script.src = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  // Fetch plaid backend configuration status on mount
  useEffect(() => {
    async function checkPlaidConfig() {
      try {
        const response = await fetch('/api/plaid/config');
        if (response.ok) {
          const data = await response.json();
          setPlaidConfig(data);
        } else {
          setPlaidConfig({ configured: false, environment: 'sandbox', clientIdProvided: false });
        }
      } catch (e) {
        console.error('Backend Plaid configuration offline:', e);
        setPlaidConfig({ configured: false, environment: 'sandbox', clientIdProvided: false });
      } finally {
        setLoadingConfig(false);
      }
    }
    checkPlaidConfig();
  }, []);

  // Sync state transitions to browser store
  useEffect(() => {
    if (accessToken) localStorage.setItem('bank_access_token', accessToken);
    else localStorage.removeItem('bank_access_token');
  }, [accessToken]);

  useEffect(() => {
    if (bankName) localStorage.setItem('bank_name', bankName);
    else localStorage.removeItem('bank_name');
  }, [bankName]);

  useEffect(() => {
    localStorage.setItem('bank_synced_transactions', JSON.stringify(recentBankTransactions));
  }, [recentBankTransactions]);

  // Initiate link token generation and trigger Plaid frame onboarding
  const handleConnectLiveBank = async () => {
    if (!plaidConfig?.configured) {
      triggerNotification('Please set your PLAID_CLIENT_ID and PLAID_SECRET first to activate live sync.');
      return;
    }

    try {
      triggerNotification('Reaching Plaid servers to establish contract...');
      const response = await fetch('/api/plaid/create-link-token', { method: 'POST' });
      if (!response.ok) throw new Error('API rejection');
      
      const { link_token } = await response.json();
      
      const Plaid = (window as any).Plaid;
      if (!Plaid) {
        triggerNotification('Plaid loader script is still initializing. Retrying in 1 second.');
        return;
      }

      const handler = Plaid.create({
        token: link_token,
        onSuccess: async (publicToken: string, metadata: any) => {
          triggerNotification('Establishing encrypted exchange...');
          try {
            const exResponse = await fetch('/api/plaid/exchange-token', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ publicToken })
            });
            if (exResponse.ok) {
              const { access_token } = await exResponse.json();
              setAccessToken(access_token);
              // Fetch bank name from metadata
              const instName = metadata?.institution?.name || 'Linked Live Bank Feed';
              setBankName(instName);
              triggerNotification(`Successfully connected to ${instName}!`);
              // Trigger initial transaction sync
              fetchLiveTransactions(access_token, instName);
            }
          } catch (err) {
            triggerNotification('Failed to resolve Token verification with server.');
          }
        },
        onExit: (err: any) => {
          if (err != null) {
            console.error('Plaid exited with error:', err);
            triggerNotification('Secure Bank authentication interrupted.');
          }
        }
      });
      handler.open();
    } catch (e) {
      console.error(e);
      triggerNotification('Connection error negotiating with Plaid servers.');
    }
  };

  // Crawl live bank transactions via Express server Proxy
  const fetchLiveTransactions = async (activeToken: string, activeBank: string) => {
    setSyncingTransactions(true);
    try {
      const response = await fetch('/api/plaid/fetch-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accessToken: activeToken })
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          const freshTx = data.transactions || [];
          setRecentBankTransactions(freshTx);
          
          if (freshTx.length > 0) {
            // Push overall sum of new earnings back to main dashboard
            onIncomeSynced(data.accumulatedINR, freshTx, activeBank);
            triggerNotification(`Fetched ${freshTx.length} earnings deposits from ${activeBank}!`);
          } else {
            triggerNotification(`Synchronized with ${activeBank}. No fresh deposits found in past 30 days.`);
          }
        }
      } else {
         throw new Error('Sync rejection');
      }
    } catch (error) {
      triggerNotification('Network error syncing fresh bank feeds.');
    } finally {
      setSyncingTransactions(false);
    }
  };

  // Simulated Plaid Sandbox onboarding handles for local tryouts
  const handleSimulatedConnect = (bank: string) => {
    setSelectedSimBank(bank);
    setSimulateStep(1);
    
    // Simulate connection delay
    setTimeout(() => {
      setSimulateStep(2);
    }, 2800);
  };

  const handleFinalizeSimulate = () => {
    const mockToken = 'mock_token_' + Date.now();
    setAccessToken(mockToken);
    setBankName(selectedSimBank);
    setShowSimulateModal(false);
    setSimulateStep(0);
    triggerNotification(`Connected to ${selectedSimBank} [SIMULATED FEED]!`);

    // Populate standard simulated active deposits (INR equivalents)
    const mockDeposits: Transaction[] = [
      { id: 'b_tx_1', amount: 84000, description: `Secured Contract: ${selectedSimBank} Tech Fellowship`, date: new Date().toISOString().split('T')[0] },
      { id: 'b_tx_2', amount: 12500, description: 'Direct Deposit: MicroSaaS Retained Revenue', date: new Date().toISOString().split('T')[0] }
    ];

    setRecentBankTransactions(mockDeposits);
    const sum = mockDeposits.reduce((acc, curr) => acc + curr.amount, 0);
    // Push synced amounts to the parent
    onIncomeSynced(sum, mockDeposits, selectedSimBank);
  };

  const handleResetConnection = () => {
    setAccessToken(null);
    setBankName(null);
    setRecentBankTransactions([]);
    triggerNotification('Bank records disconnected. Local metrics preserved.');
  };

  return (
    <div className="bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-xl rounded-2xl p-6 shadow-xl relative overflow-hidden">
      
      {/* Visual Header */}
      <div className="flex items-start justify-between mb-5">
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
            <Building2 className="w-4.5 h-4.5 text-emerald-400" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-zinc-100 tracking-wide flex items-center gap-2">
              <span>SECURE BANK SYNC</span>
              <span className="text-[9px] uppercase font-mono px-2 py-0.5 rounded-full bg-emerald-400/20 text-emerald-300 font-bold tracking-widest">
                Plaid Core
              </span>
            </h4>
            <p className="text-zinc-400 text-xs mt-0.5">Automate income total directly from your bank stream</p>
          </div>
        </div>

        {accessToken && (
          <button 
            onClick={handleResetConnection}
            className="text-[10px] text-zinc-500 hover:text-red-400 font-mono transition-colors"
          >
            Disconnect Feed
          </button>
        )}
      </div>

      {/* RENDER ACTIVE FEED STATUS */}
      {accessToken ? (
        <div className="space-y-4">
          
          <div className="p-4 rounded-xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-9 w-9 rounded-lg bg-emerald-400/10 flex items-center justify-center animate-pulse">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              </div>
              <div>
                <span className="block text-[10px] font-mono text-zinc-500 uppercase tracking-widest">CONNECTED ACCOUNT</span>
                <span className="font-bold text-sm text-zinc-200">{bankName}</span>
              </div>
            </div>

            <button
              onClick={() => {
                if (accessToken.startsWith('mock_')) {
                  // Simulate refreshing
                  setSyncingTransactions(true);
                  triggerNotification('Polling simulated bank feeds...');
                  setTimeout(() => {
                    setSyncingTransactions(false);
                    // Add an extra transaction to simulate incoming deposits
                    const dailyInterest = Math.round(Math.random() * 5000 + 100);
                    const newTx: Transaction = {
                      id: 'b_tx_rand_' + Date.now(),
                      amount: dailyInterest,
                      description: 'Live Passive Dividend Yield',
                      date: new Date().toISOString().split('T')[0]
                    };
                    setRecentBankTransactions(prev => [newTx, ...prev]);
                    onIncomeSynced(dailyInterest, [newTx], bankName || 'Linked Bank');
                    triggerNotification(`Fetched premium deposit: +₹${dailyInterest.toLocaleString('en-IN')}`);
                  }, 1500);
                } else {
                  fetchLiveTransactions(accessToken, bankName || 'Linked Live Bank');
                }
              }}
              disabled={syncingTransactions}
              className="py-1.5 px-3 bg-zinc-800 hover:bg-zinc-700/80 rounded-lg text-xs font-mono font-medium text-zinc-300 hover:text-white transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${syncingTransactions ? 'animate-spin' : ''}`} />
              <span>{syncingTransactions ? 'Syncing...' : 'Sync Now'}</span>
            </button>
          </div>

          {/* Sync status logs */}
          <div>
            <span className="text-[10px] uppercase font-mono tracking-wider text-zinc-400 font-bold block mb-2">
              RECENT BANK DEPOSIT LEDGER ({recentBankTransactions.length})
            </span>

            {recentBankTransactions.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-zinc-800 rounded-xl text-zinc-500 text-xs">
                Connected successfully. No incoming transactions identified in current billing cycle.
              </div>
            ) : (
              <div className="space-y-1.5 max-h-[140px] overflow-y-auto pr-1">
                {recentBankTransactions.map(tx => (
                  <div key={tx.id} className="p-2.5 rounded-lg bg-zinc-950/40 border border-zinc-800/40 flex items-center justify-between text-xs font-mono">
                    <div className="min-w-0 pr-2">
                      <p className="font-sans font-medium text-zinc-300 truncate">{tx.description}</p>
                      <span className="text-[9px] text-zinc-500">{tx.date}</span>
                    </div>
                    <span className="text-emerald-400 font-bold text-right shrink-0">
                      +₹{tx.amount.toLocaleString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      ) : (
        /* DISCONNECTED STATE */
        <div className="space-y-4">
          <p className="text-xs text-zinc-400 leading-relaxed">
            Link and synchronize your actual bank account securely via high-grade TLS encryption. Instantly extract passive assets, stock dividends, and freelance deposits to fuel your progress.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            
            {/* LIVE PLAID CONNECT */}
            <div className="flex flex-col justify-between p-4 rounded-xl border border-zinc-800 bg-zinc-950/40 relative">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-zinc-200">
                  <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  <span>Real Plaid Integration</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Connect your real production or Sandbox feed using Plaid's secure banking pipeline.
                </p>
              </div>

              {loadingConfig ? (
                <div className="text-xs font-mono text-zinc-500 animate-pulse">Scanning server secrets...</div>
              ) : plaidConfig?.configured ? (
                <button
                  type="button"
                  onClick={handleConnectLiveBank}
                  className="w-full py-2 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-extrabold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Link2 className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>Connect Real Bank</span>
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="text-[10px] text-zinc-500 font-mono leading-tight bg-zinc-900 p-2 rounded border border-zinc-800/60">
                    ⚠️ API secrets not configured yet. Set <b>PLAID_CLIENT_ID</b> and <b>PLAID_SECRET</b> in variables.
                  </div>
                  <button
                    disabled
                    className="w-full py-2 bg-zinc-800 text-zinc-650 cursor-not-allowed font-extrabold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5" />
                    <span>Secrets Required</span>
                  </button>
                </div>
              )}
            </div>

            {/* SIMULATED CLIENT SIDE CONNECT FOR SEAMLESS DEMO */}
            <div className="flex flex-col justify-between p-4 rounded-xl border border-dashed border-zinc-800 bg-zinc-950/40">
              <div className="mb-3">
                <div className="flex items-center gap-2 mb-1.5 text-xs font-bold text-emerald-400">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-400 shrink-0 animate-pulse" />
                  <span>One-click Simulated Feed</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-normal">
                  Skip setting up keys and try out the integration flow instantly with a simulated bank connection.
                </p>
              </div>

              <button
                type="button"
                onClick={() => {
                  setSimulateStep(0);
                  setShowSimulateModal(true);
                }}
                className="w-full py-2 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-500/30 hover:border-emerald-500/60 text-emerald-400 font-bold text-xs rounded-lg transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <span>Demo Bank Onboarding</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

          </div>

          {/* SETUP CREDIT EXPLANATION ACCOUTREMENTS */}
          {!loadingConfig && !plaidConfig?.configured && (
            <details className="text-[11px] text-zinc-500 font-mono bg-zinc-950/70 rounded-xl p-3 border border-zinc-800 cursor-pointer">
              <summary className="font-semibold text-zinc-400 select-none pb-1 hover:text-zinc-200">
                Setup Live Bank feeds (Plaid Key Guide)
              </summary>
              <div className="space-y-2 mt-2 pt-2 border-t border-zinc-900 leading-normal">
                <p>To connect live savings, checking, or credit products:</p>
                <ol className="list-decimal pl-4 space-y-1 text-zinc-500">
                  <li>Visit Plaid Developer Console (<a href="https://plaid.com" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:underline">plaid.com</a>) and open a free account.</li>
                  <li>In Team Settings, locate your <b className="text-zinc-300">Client ID</b> and <b className="text-zinc-300">Sandbox Secret</b> keys.</li>
                  <li>Enter them as environment variables inside your AI Studio Secrets panel.</li>
                  <li>Recompile/Restart the server and link any bank instantly!</li>
                </ol>
              </div>
            </details>
          )}

        </div>
      )}

      {/* SIMULATOR PLAID MODAL ONBOARDING POPUP */}
      <AnimatePresence>
        {showSimulateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div 
              onClick={() => setShowSimulateModal(false)}
              className="absolute inset-0 bg-black/90 backdrop-blur-sm"
            />

            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-md bg-zinc-900 border border-zinc-800 p-6 rounded-2xl shadow-2xl z-10"
            >
              {/* Header */}
              <div className="flex justify-between items-center pb-4 border-b border-zinc-800 mb-4 text-center">
                <div className="flex items-center gap-2 text-white">
                  <ShieldAlert className="w-4.5 h-4.5 text-emerald-400 animate-pulse" />
                  <h4 className="font-bold text-sm tracking-tight text-white uppercase font-mono">Plaid Sandbox Simulator</h4>
                </div>
                <span className="text-[10px] font-mono text-zinc-500 uppercase px-2 py-0.5 rounded bg-zinc-850">Link v2.0</span>
              </div>

              {/* Step 0: Bank selector screen */}
              {simulateStep === 0 && (
                <div>
                  <p className="text-xs text-zinc-300 mb-4 leading-relaxed">
                    Select your banking institution to grant read-only ledger permissions to <b>Teen Crore Target</b> applet.
                  </p>

                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { name: 'State Bank of India', code: 'SBI', primary: '#3a82f6' },
                      { name: 'HDFC Bank', code: 'HDFC', primary: '#1e40af' },
                      { name: 'ICICI Bank', code: 'ICICI', primary: '#ea580c' },
                      { name: 'Axis Bank', code: 'AXIS', primary: '#911d30' },
                      { name: 'Chase Bank', code: 'CHASE', primary: '#1d4ed8' },
                      { name: 'Plaid Bank', code: 'PLAID', primary: '#10b981' }
                    ].map(bank => (
                      <button
                        key={bank.code}
                        onClick={() => handleSimulatedConnect(bank.name)}
                        className="p-3.5 bg-zinc-950 hover:bg-zinc-850 border border-zinc-800 hover:border-zinc-700/80 rounded-xl text-left transition-all group flex flex-col justify-between h-20 relative cursor-pointer"
                      >
                        <span className="text-[10px] font-bold font-mono tracking-wider" style={{ color: bank.primary }}>
                          [{bank.code}]
                        </span>
                        <span className="font-semibold text-xs text-zinc-200 mt-1 leading-tight group-hover:text-emerald-400 transition-colors">
                          {bank.name}
                        </span>
                      </button>
                    ))}
                  </div>

                  <p className="text-[10px] text-zinc-500 text-center font-mono leading-tight">
                    🔒 Sandbox simulation does not communicate with real banks. Fully client isolated.
                  </p>
                </div>
              )}

              {/* Step 1: Connecting spinner stage */}
              {simulateStep === 1 && (
                <div className="py-12 flex flex-col items-center justify-center text-center">
                  <div className="relative mb-6">
                    <div className="h-16 w-16 rounded-full border-4 border-zinc-800 border-t-emerald-400 animate-spin" />
                    <Building2 className="w-7 h-7 text-emerald-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
                  </div>
                  
                  <h5 className="font-bold text-sm text-zinc-200 mb-1">Authenticating Safe Feeds</h5>
                  <p className="text-xs text-zinc-500 max-w-xs font-mono leading-relaxed">
                    Connecting to {selectedSimBank} API pipelines. Negotiating encrypted session handshakes...
                  </p>
                </div>
              )}

              {/* Step 2: Connection finalized stage */}
              {simulateStep === 2 && (
                <div className="py-4 flex flex-col items-center text-center">
                  <div className="h-12 w-12 rounded-full bg-emerald-500/10 flex items-center justify-center mb-4">
                    <CheckCircle2 className="w-7 h-7 text-emerald-400" />
                  </div>

                  <h5 className="font-bold text-sm text-zinc-100 mb-1">Credentials Verified!</h5>
                  <p className="text-xs text-emerald-400 font-mono mb-6 bg-emerald-500/10 px-3 py-1 rounded">
                    Access Token Granted
                  </p>

                  <div className="w-full bg-zinc-950 p-3.5 rounded-xl border border-zinc-800 text-left space-y-2 mb-6">
                    <span className="text-[9px] font-mono text-zinc-500 block uppercase">METRIC EXTRACTED INVOICES:</span>
                    <div className="flex justify-between text-xs font-mono text-zinc-300">
                      <span>✓ Contract Freelance Income</span>
                      <span className="text-emerald-400 font-bold">+₹84,000</span>
                    </div>
                    <div className="flex justify-between text-xs font-mono text-zinc-300">
                      <span>✓ MicroSaaS Retained revenue</span>
                      <span className="text-emerald-400 font-bold">+₹12,500</span>
                    </div>
                  </div>

                  <button
                    onClick={handleFinalizeSimulate}
                    className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-600 text-zinc-950 font-extrabold text-xs rounded-xl hover:scale-[1.01] transition-transform cursor-pointer"
                  >
                    Sync Synced Income to Croft Track
                  </button>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
