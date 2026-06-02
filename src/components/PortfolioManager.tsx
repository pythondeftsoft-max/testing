
import React, { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Building2, Eye, Settings, Trash2 } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';

interface PortfolioManagerProps {
  userId: string;
}

const PortfolioManager = ({ userId }: PortfolioManagerProps) => {
  const [portfolios, setPortfolios] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    clientName: '',
    clientEmail: '',
    clientPhone: '',
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchPortfolios();
  }, []);

  const fetchPortfolios = async () => {
    try {
      const { data, error } = await supabase
        .from('portfolios')
        .select(`
          *,
          properties (count)
        `)
        .eq('manager_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setPortfolios(data || []);
    } catch (error) {
      console.error('Error fetching portfolios:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { error } = await supabase
        .from('portfolios')
        .insert([
          {
            manager_id: userId,
            client_name: formData.clientName,
            client_email: formData.clientEmail,
            client_phone: formData.clientPhone,
          }
        ]);

      if (error) throw error;

      toast({
        title: "Portfolio created successfully!",
        description: "You can now add properties to this client portfolio.",
      });

      setFormData({ clientName: '', clientEmail: '', clientPhone: '' });
      setShowAddForm(false);
      fetchPortfolios();
    } catch (error: any) {
      toast({
        title: "Error creating portfolio",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Portfolio Management</h1>
            <p className="text-gray-600">Organize and oversee your property groups.</p>
          </div>
          <Button 
            onClick={() => setShowAddForm(true)}
            variant="gradient"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create Portfolio
          </Button>
        </div>

        {showAddForm && (
          <Card className="mb-8 bg-white border-gray-200">
            <CardHeader>
              <CardTitle className="text-gray-900">Add New Client Portfolio</CardTitle>
              <CardDescription className="text-gray-600">Create a portfolio for a new client</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <Label htmlFor="clientName" className="text-gray-700">Client Name *</Label>
                  <Input
                    id="clientName"
                    type="text"
                    value={formData.clientName}
                    onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                    required
                    className="bg-white border-gray-300 text-gray-900"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="clientEmail" className="text-gray-700">Client Email</Label>
                    <Input
                      id="clientEmail"
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData({ ...formData, clientEmail: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                  <div>
                    <Label htmlFor="clientPhone" className="text-gray-700">Client Phone</Label>
                    <Input
                      id="clientPhone"
                      type="tel"
                      value={formData.clientPhone}
                      onChange={(e) => setFormData({ ...formData, clientPhone: e.target.value })}
                      className="bg-white border-gray-300 text-gray-900"
                    />
                  </div>
                </div>

                <div className="flex space-x-4">
                  <Button type="submit" disabled={loading} variant="gradient">
                    {loading ? 'Creating...' : 'Create Portfolio'}
                  </Button>
                  <Button 
                    type="button" 
                    variant="outline" 
                    onClick={() => setShowAddForm(false)}
                    className="border-gray-300 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {portfolios.map((portfolio: any, index: number) => (
            <Card key={portfolio.id} className="bg-white border-gray-200 hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-semibold">
                      {index + 1}
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{portfolio.client_name}</h3>
                      <p className="text-sm text-gray-600">Admin Partner</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-gray-600 hover:text-gray-900 hover:bg-gray-100"
                    >
                      <Settings className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
};

export default PortfolioManager;
