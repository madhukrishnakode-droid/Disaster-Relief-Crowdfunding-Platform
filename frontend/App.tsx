import React, { useState, useEffect } from "react";

declare global {
  interface Window {
    aptos?: {
      connect: () => Promise<{ address: string; publicKey?: string }>;
      disconnect: () => Promise<void>;
      signAndSubmitTransaction: (payload: any) => Promise<any>;
      account: () => Promise<{ address: string; publicKey?: string }>;
      isConnected: () => Promise<boolean>;
      network: () => Promise<string>;
      getAccountResources: (address: string) => Promise<any[]>;
    };
  }
}

const ADMIN_ADDRESS = '0x19e69cef4912141bca40c0ac643684683de4c5ad7ed857450a8cb518c94ffb8a'; // Fixed: Added 0x prefix

// Convert normal string to hex string for Move vector<u8>
const stringToHex = (str: string): string => {
  return (
    "0x" +
    Array.from(new TextEncoder().encode(str))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
};

type Campaign = {
  owner: string;
  title: string;
  description: string;
  goal: number;
  donated: number;
  completed: boolean;
};

type WalletState = {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  network: string | null;
  error: string | null;
};

const App: React.FC = () => {
  const [wallet, setWallet] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    network: null,
    error: null,
  });

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loadingCampaigns, setLoadingCampaigns] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newGoal, setNewGoal] = useState<number>(0);

  const [donationAmount, setDonationAmount] = useState<number>(0);
  const [selectedCampaignIndex, setSelectedCampaignIndex] = useState<number | null>(null);

  // Check if Petra wallet is installed
  const isPetraInstalled = (): boolean => {
    return typeof window.aptos !== "undefined";
  };

  // Check wallet connection status on app load
  const checkWalletConnection = async () => {
    if (!isPetraInstalled()) {
      setWallet(prev => ({
        ...prev,
        error: "Petra wallet is not installed. Please install it to continue."
      }));
      return;
    }

    try {
      const isConnected = await window.aptos!.isConnected();
      if (isConnected) {
        const account = await window.aptos!.account();
        const network = await window.aptos!.network();
        
        setWallet({
          address: account.address,
          isConnected: true,
          isConnecting: false,
          network,
          error: null,
        });
      }
    } catch (error) {
      console.log("Wallet not connected or error checking connection:", error);
      setWallet(prev => ({
        ...prev,
        isConnected: false,
        error: null,
      }));
    }
  };

  // Connect wallet with improved error handling
  const connectWallet = async () => {
    if (!isPetraInstalled()) {
      window.open("https://petra.app/", "_blank");
      setWallet(prev => ({
        ...prev,
        error: "Petra wallet not found. Please install it from the opened page and refresh this page."
      }));
      return;
    }

    setWallet(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const response = await window.aptos!.connect();
      const network = await window.aptos!.network();
      
      // Check if we're on the correct network (optional)
      if (network !== "Mainnet" && network !== "Testnet" && network !== "Devnet") {
        setWallet(prev => ({
          ...prev,
          isConnecting: false,
          error: `Please switch to a supported network. Current network: ${network}`
        }));
        return;
      }

      setWallet({
        address: response.address,
        isConnected: true,
        isConnecting: false,
        network,
        error: null,
      });

      console.log("✅ Wallet connected successfully:", response.address);
    } catch (error: any) {
      console.error("Wallet connection error:", error);
      
      let errorMessage = "Failed to connect wallet";
      if (error.code === 4001) {
        errorMessage = "Connection rejected by user";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setWallet(prev => ({
        ...prev,
        isConnecting: false,
        error: errorMessage
      }));
    }
  };

  // Disconnect wallet
  const disconnectWallet = async () => {
    try {
      if (window.aptos?.disconnect) {
        await window.aptos.disconnect();
      }
      
      setWallet({
        address: null,
        isConnected: false,
        isConnecting: false,
        network: null,
        error: null,
      });

      // Clear campaign data
      setCampaigns([]);
      
      console.log("👋 Wallet disconnected");
    } catch (error) {
      console.error("Error disconnecting wallet:", error);
    }
  };

  // Fetch campaigns using account resources (simplified approach)
  const fetchCampaigns = async () => {
    if (!wallet.isConnected) return;
    
    setLoadingCampaigns(true);
    setCampaigns([]);

    try {
      // Try to fetch account resources to check if the module exists
      const resources = await window.aptos!.getAccountResources(ADMIN_ADDRESS);
      console.log("Account resources:", resources);
      
      // Look for campaign-related resources
      const campaignResource = resources.find(resource => 
        resource.type.includes('::backend::') || 
        resource.type.includes('Campaign')
      );
      
      if (campaignResource) {
        console.log("Found campaign resource:", campaignResource);
        // Parse campaign data from resource if available
        // This is a simplified approach - in practice you'd need proper view functions
      } else {
        console.log("No campaign resources found - contract may not be deployed or have no campaigns");
      }
      
      // For demo purposes, adding a sample campaign
      setCampaigns([
        {
          owner: wallet.address || "",
          title: "Sample Disaster Relief Campaign",
          description: "This is a sample campaign for testing purposes",
          goal: 10,
          donated: 2.5,
          completed: false
        }
      ]);
      
    } catch (error) {
      console.error("Error fetching campaigns:", error);
      // Don't set error here as it might just mean no campaigns exist
      setCampaigns([]);
    } finally {
      setLoadingCampaigns(false);
    }
  };

  // Create campaign with corrected payload structure
  const createCampaign = async () => {
    if (!wallet.isConnected) {
      setWallet(prev => ({ ...prev, error: "Please connect wallet first." }));
      return;
    }
    
    if (!newTitle.trim() || !newDescription.trim() || newGoal <= 0) {
      setWallet(prev => ({ 
        ...prev, 
        error: "All fields are required. Goal must be greater than 0." 
      }));
      return;
    }

    // Clear previous errors
    setWallet(prev => ({ ...prev, error: null }));

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${ADMIN_ADDRESS}::backend::create_campaign`,
        type_arguments: [],
        arguments: [
          stringToHex(newTitle.trim()),
          stringToHex(newDescription.trim()),
          (newGoal * 100_000_000).toString(), // Convert to string for large numbers
        ],
      };

      console.log("Transaction payload:", payload);
      
      const result = await window.aptos!.signAndSubmitTransaction(payload);
      console.log("✅ Campaign created:", result);
      
      // Clear form
      setNewTitle("");
      setNewDescription("");
      setNewGoal(0);
      
      // Show success message
      setWallet(prev => ({ 
        ...prev, 
        error: null 
      }));
      
      // Refresh campaigns after a delay to allow transaction to be processed
      setTimeout(() => {
        fetchCampaigns();
      }, 2000);
      
    } catch (error: any) {
      console.error("Create campaign error:", error);
      
      let errorMessage = "Failed to create campaign";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message?.includes("FUNCTION_NOT_FOUND")) {
        errorMessage = "Smart contract not found or function doesn't exist. Please check if the contract is deployed.";
      } else if (error.message?.includes("INVALID_ARGUMENT")) {
        errorMessage = "Invalid arguments provided to the contract function.";
      } else if (error.message?.includes("MODULE_NOT_FOUND")) {
        errorMessage = "Smart contract module not found. Please verify the contract address.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setWallet(prev => ({ ...prev, error: errorMessage }));
    }
  };

  // Donate to existing campaign with corrected payload
  const donate = async () => {
    if (!wallet.isConnected || selectedCampaignIndex === null) {
      setWallet(prev => ({ 
        ...prev, 
        error: "Please select a campaign and ensure wallet is connected." 
      }));
      return;
    }
    
    if (donationAmount <= 0) {
      setWallet(prev => ({ ...prev, error: "Donation amount must be greater than 0." }));
      return;
    }

    setWallet(prev => ({ ...prev, error: null }));

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${ADMIN_ADDRESS}::backend::donate`,
        type_arguments: [],
        arguments: [
          selectedCampaignIndex.toString(),
          (donationAmount * 100_000_000).toString(),
        ],
      };

      const result = await window.aptos!.signAndSubmitTransaction(payload);
      console.log("✅ Donation successful:", result);
      
      setDonationAmount(0);
      setSelectedCampaignIndex(null);
      
      // Refresh campaigns after a delay
      setTimeout(() => {
        fetchCampaigns();
      }, 2000);
      
    } catch (error: any) {
      console.error("Donation error:", error);
      
      let errorMessage = "Donation failed";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message?.includes("FUNCTION_NOT_FOUND")) {
        errorMessage = "Donate function not found in smart contract.";
      } else if (error.message?.includes("INSUFFICIENT_BALANCE")) {
        errorMessage = "Insufficient balance for this donation.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setWallet(prev => ({ ...prev, error: errorMessage }));
    }
  };

  // Withdraw from completed campaign
  const withdraw = async (index: number) => {
    if (!wallet.isConnected) {
      setWallet(prev => ({ ...prev, error: "Please connect wallet first." }));
      return;
    }

    setWallet(prev => ({ ...prev, error: null }));

    try {
      const payload = {
        type: "entry_function_payload",
        function: `${ADMIN_ADDRESS}::backend::withdraw`,
        type_arguments: [],
        arguments: [index.toString()],
      };

      const result = await window.aptos!.signAndSubmitTransaction(payload);
      console.log("✅ Withdrawal successful:", result);
      
      setTimeout(() => {
        fetchCampaigns();
      }, 2000);
      
    } catch (error: any) {
      console.error("Withdraw error:", error);
      
      let errorMessage = "Withdrawal failed";
      if (error.code === 4001) {
        errorMessage = "Transaction rejected by user";
      } else if (error.message?.includes("FUNCTION_NOT_FOUND")) {
        errorMessage = "Withdraw function not found in smart contract.";
      } else if (error.message?.includes("UNAUTHORIZED")) {
        errorMessage = "You are not authorized to withdraw from this campaign.";
      } else if (error.message) {
        errorMessage = error.message;
      }

      setWallet(prev => ({ ...prev, error: errorMessage }));
    }
  };

  // Clear error message
  const clearError = () => {
    setWallet(prev => ({ ...prev, error: null }));
  };

  // Check wallet connection on component mount
  useEffect(() => {
    checkWalletConnection();
  }, []);

  // Fetch campaigns when wallet connects
  useEffect(() => {
    if (wallet.isConnected) {
      fetchCampaigns();
    }
  }, [wallet.isConnected]);

  return (
    <div style={{ padding: 20, maxWidth: 900, margin: "auto" }}>
      <h1>🌍 Disaster Relief Campaigns</h1>

      {/* Wallet Connection Section */}
      <div style={{ 
        padding: 16, 
        border: "2px solid #ddddddff", 
        borderRadius: 8, 
        marginBottom: 20,
        backgroundColor: wallet.isConnected ? "#1f839cff" : "#1f839cff"
      }}>
        {!wallet.isConnected ? (
          <div>
            <h3>Connect Your Wallet</h3>
            <p>Connect your Petra wallet to create campaigns and make donations</p>
            <button 
              onClick={connectWallet} 
              disabled={wallet.isConnecting}
              style={{
                backgroundColor: wallet.isConnecting ? "#ccc" : "#646cff",
                color: "white",
                padding: "10px 20px",
                fontSize: "16px",
                border: "none",
                borderRadius: "4px",
                cursor: wallet.isConnecting ? "not-allowed" : "pointer"
              }}
            >
              {wallet.isConnecting ? "Connecting..." : "🔗 Connect Petra Wallet"}
            </button>
            
            {!isPetraInstalled() && (
              <div style={{ marginTop: 10, fontSize: "14px", color: "#666" }}>
                Don't have Petra wallet? 
                <a 
                  href="https://petra.app/" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ marginLeft: 5 }}
                >
                  Install it here
                </a>
              </div>
            )}
          </div>
        ) : (
          <div>
            <h3>✅ Wallet Connected</h3>
            <p><strong>Address:</strong> {wallet.address}</p>
            {wallet.network && (
              <p><strong>Network:</strong> {wallet.network}</p>
            )}
            <button 
              onClick={disconnectWallet}
              style={{
                backgroundColor: "#ff6b6b",
                color: "white",
                padding: "8px 16px",
                border: "none",
                borderRadius: "4px",
                cursor: "pointer"
              }}
            >
              🔌 Disconnect
            </button>
          </div>
        )}
      </div>

      {/* Error Display */}
      {wallet.error && (
        <div style={{ 
          padding: 12, 
          backgroundColor: "#ffebee", 
          border: "1px solid #f44336",
          borderRadius: 4,
          marginBottom: 20,
          color: "#c62828"
        }}>
          ⚠️ {wallet.error}
          <button 
            onClick={clearError}
            style={{ 
              marginLeft: 10, 
              padding: "2px 8px", 
              fontSize: "12px",
              backgroundColor: "transparent",
              border: "1px solid #c62828",
              color: "#c62828",
              borderRadius: "2px",
              cursor: "pointer"
            }}
          >
            ✕
          </button>
        </div>
      )}

      {/* Create Campaign Section */}
      <div style={{ marginBottom: 40 }}>
        <h2>🚀 Create New Campaign</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <input
            type="text"
            placeholder="Campaign Title"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            style={{ padding: 10, fontSize: 14, borderRadius: 4, border: "1px solid #1c509eff" }}
            maxLength={100}
          />
          <textarea
            placeholder="Campaign Description"
            value={newDescription}
            onChange={(e) => setNewDescription(e.target.value)}
            rows={4}
            style={{ padding: 10, fontSize: 14, borderRadius: 4, border: "1px solid #ddd", resize: "vertical" }}
            maxLength={500}
          />
          <input
            type="number"
            placeholder="Goal Amount (APT)"
            value={newGoal || ""}
            onChange={(e) => setNewGoal(Number(e.target.value))}
            min="0"
            step="0.1"
            style={{ padding: 10, fontSize: 14, borderRadius: 4, border: "1px solid #ddd" }}
          />
          <button 
            onClick={createCampaign} 
            disabled={!wallet.isConnected || !newTitle.trim() || !newDescription.trim() || newGoal <= 0}
            style={{
              padding: 12,
              fontSize: 16,
              backgroundColor: (wallet.isConnected && newTitle.trim() && newDescription.trim() && newGoal > 0) ? "#4caf50" : "#ccc",
              color: "white",
              border: "none",
              borderRadius: 4,
              cursor: (wallet.isConnected && newTitle.trim() && newDescription.trim() && newGoal > 0) ? "pointer" : "not-allowed"
            }}
          >
            📝 Create Campaign
          </button>
        </div>
        
        {!wallet.isConnected && (
          <p style={{ marginTop: 10, fontSize: "14px", color: "#666", fontStyle: "italic" }}>
            Please connect your wallet to create campaigns
          </p>
        )}
      </div>

      {/* Campaigns Section */}
      <div>
        <h2 style={{ marginBottom: 20 }}>📋 Active Campaigns</h2>
        
        {!wallet.isConnected ? (
          <p style={{ textAlign: "center", color: "#666", fontStyle: "italic" }}>
            Connect your wallet to view and interact with campaigns
          </p>
        ) : loadingCampaigns ? (
          <div style={{ textAlign: "center", padding: 40 }}>
            <p>🔄 Loading campaigns...</p>
          </div>
        ) : campaigns.length === 0 ? (
          <div style={{ textAlign: "center", padding: 40, backgroundColor: "#f9f9f9", borderRadius: 8 }}>
            <p style={{ fontSize: 18, margin: 0 }}>🔭 No campaigns found</p>
            <p style={{ color: "#666", marginTop: 8 }}>Be the first to create a disaster relief campaign!</p>
          </div>
        ) : (
          <div style={{ display: "grid", gap: 20 }}>
            {campaigns.map((campaign, index) => (
              <div
                key={index}
                style={{ 
                  border: "2px solid #e0e0e0", 
                  borderRadius: 12, 
                  padding: 20,
                  backgroundColor: campaign.completed ? "#f8f9fa" : "#ffffff",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.1)"
                }}
              >
                <h3 style={{ margin: "0 0 12px 0", color: "#333" }}>
                  {campaign.title}
                  {campaign.completed && <span style={{ color: "#4caf50", fontSize: "14px" }}> ✅ COMPLETED</span>}
                </h3>
                
                <p style={{ color: "#666", marginBottom: 16 }}>{campaign.description}</p>
                
                <div style={{ fontSize: "14px", color: "#555", marginBottom: 16 }}>
                  <p><strong>Owner:</strong> {campaign.owner === wallet.address ? "You" : `${campaign.owner.substring(0, 10)}...`}</p>
                  <p><strong>Goal:</strong> {campaign.goal} APT</p>
                  <p><strong>Raised:</strong> {campaign.donated} APT ({((campaign.donated / campaign.goal) * 100).toFixed(1)}%)</p>
                </div>

                {/* Progress bar */}
                <div style={{ 
                  width: "100%", 
                  height: 8, 
                  backgroundColor: "#e0e0e0", 
                  borderRadius: 4,
                  marginBottom: 16,
                  overflow: "hidden"
                }}>
                  <div style={{
                    width: `${Math.min((campaign.donated / campaign.goal) * 100, 100)}%`,
                    height: "100%",
                    backgroundColor: campaign.completed ? "#4caf50" : "#2196f3",
                    transition: "width 0.3s ease"
                  }} />
                </div>

                {!campaign.completed && (
                  <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                    <input
                      type="number"
                      placeholder="Amount (APT)"
                      value={selectedCampaignIndex === index ? donationAmount || "" : ""}
                      onChange={(e) => {
                        setSelectedCampaignIndex(index);
                        setDonationAmount(Number(e.target.value));
                      }}
                      min="0"
                      step="0.1"
                      style={{ 
                        flex: 1, 
                        padding: 8, 
                        borderRadius: 4, 
                        border: "1px solid #ddd" 
                      }}
                    />
                    <button 
                      onClick={donate}
                      disabled={selectedCampaignIndex !== index || donationAmount <= 0}
                      style={{
                        padding: "8px 16px",
                        backgroundColor: (selectedCampaignIndex === index && donationAmount > 0) ? "#ff9800" : "#ccc",
                        color: "white",
                        border: "none",
                        borderRadius: 4,
                        cursor: (selectedCampaignIndex === index && donationAmount > 0) ? "pointer" : "not-allowed"
                      }}
                    >
                      👍 Donate
                    </button>
                  </div>
                )}

                {campaign.completed && wallet.address === campaign.owner && (
                  <button 
                    onClick={() => withdraw(index)}
                    style={{
                      padding: "10px 20px",
                      backgroundColor: "#4caf50",
                      color: "white",
                      border: "none",
                      borderRadius: 4,
                      fontSize: "14px",
                      cursor: "pointer"
                    }}
                  >
                    💰 Withdraw Funds
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default App;