import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Wallet, Plus, Zap, Shield, Coins } from 'lucide-react';
import { useCreateWalletConnection } from '@/hooks/useWalletConnections';

interface WalletConnectionDialogProps {
  portfolioId: string;
  trigger?: React.ReactNode;
}

const WALLET_TYPES = [
  { 
    value: 'metamask', 
    label: 'MetaMask', 
    icon: Wallet,
    description: 'Connect your MetaMask wallet for Ethereum assets'
  },
  { 
    value: 'coinbase', 
    label: 'Coinbase Wallet', 
    icon: Shield,
    description: 'Connect your Coinbase wallet'
  },
  { 
    value: 'binance', 
    label: 'Binance', 
    icon: Coins,
    description: 'Connect your Binance account (API key required)'
  },
  { 
    value: 'manual', 
    label: 'Manual Entry', 
    icon: Plus,
    description: 'Manually enter wallet address to track'
  },
];

export const WalletConnectionDialog: React.FC<WalletConnectionDialogProps> = ({
  portfolioId,
  trigger
}) => {
  const [open, setOpen] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('');
  const [connectionName, setConnectionName] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [apiSecret, setApiSecret] = useState('');

  const createConnection = useCreateWalletConnection();

  const handleConnect = async () => {
    if (!selectedType || !connectionName) return;

    const metadata: Record<string, any> = {};
    
    if (selectedType === 'binance') {
      metadata.apiKey = apiKey;
      metadata.apiSecret = apiSecret;
    }

    await createConnection.mutateAsync({
      portfolio_id: portfolioId,
      wallet_type: selectedType,
      wallet_address: walletAddress || null,
      connection_name: connectionName,
      metadata
    });

    setOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setSelectedType('');
    setConnectionName('');
    setWalletAddress('');
    setApiKey('');
    setApiSecret('');
  };

  const handleWalletTypeSelect = (type: string) => {
    setSelectedType(type);
    const walletType = WALLET_TYPES.find(w => w.value === type);
    if (walletType) {
      setConnectionName(`My ${walletType.label} Wallet`);
    }
  };

  const connectMetaMask = async () => {
    if (typeof (window as any).ethereum !== 'undefined') {
      try {
        const accounts = await (window as any).ethereum.request({ method: 'eth_requestAccounts' });
        if (accounts[0]) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error('MetaMask connection failed:', error);
      }
    } else {
      alert('MetaMask is not installed. Please install MetaMask to continue.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm">
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Connect Crypto Wallet</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Wallet Type Selection */}
          <div className="space-y-4">
            <Label>Select Wallet Type</Label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {WALLET_TYPES.map((wallet) => {
                const Icon = wallet.icon;
                return (
                  <Card 
                    key={wallet.value}
                    className={`cursor-pointer transition-all hover:shadow-md ${
                      selectedType === wallet.value ? 'ring-2 ring-primary' : ''
                    }`}
                    onClick={() => handleWalletTypeSelect(wallet.value)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-start gap-3">
                        <Icon className="w-5 h-5 mt-1 text-primary" />
                        <div>
                          <h4 className="font-medium">{wallet.label}</h4>
                          <p className="text-sm text-muted-foreground">
                            {wallet.description}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>

          {selectedType && (
            <div className="space-y-4">
              {/* Connection Name */}
              <div className="space-y-2">
                <Label htmlFor="connectionName">Connection Name</Label>
                <Input
                  id="connectionName"
                  value={connectionName}
                  onChange={(e) => setConnectionName(e.target.value)}
                  placeholder="My Wallet"
                />
              </div>

              {/* MetaMask specific */}
              {selectedType === 'metamask' && (
                <div className="space-y-2">
                  <Label>Wallet Address</Label>
                  <div className="flex gap-2">
                    <Input
                      value={walletAddress}
                      onChange={(e) => setWalletAddress(e.target.value)}
                      placeholder="0x..."
                      readOnly={!!walletAddress}
                    />
                    <Button onClick={connectMetaMask} variant="outline">
                      <Zap className="w-4 h-4 mr-2" />
                      Connect
                    </Button>
                  </div>
                </div>
              )}

              {/* Manual entry */}
              {selectedType === 'manual' && (
                <div className="space-y-2">
                  <Label htmlFor="walletAddress">Wallet Address</Label>
                  <Input
                    id="walletAddress"
                    value={walletAddress}
                    onChange={(e) => setWalletAddress(e.target.value)}
                    placeholder="Enter wallet address to track"
                  />
                </div>
              )}

              {/* Binance API */}
              {selectedType === 'binance' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="apiKey">API Key</Label>
                    <Input
                      id="apiKey"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Your Binance API key"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiSecret">API Secret</Label>
                    <Input
                      id="apiSecret"
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Your Binance API secret"
                    />
                  </div>
                  <div className="text-sm text-muted-foreground">
                    Your API credentials are encrypted and stored securely. We only use them to fetch your balances.
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleConnect}
              disabled={!selectedType || !connectionName || createConnection.isPending}
            >
              {createConnection.isPending ? 'Connecting...' : 'Connect Wallet'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};