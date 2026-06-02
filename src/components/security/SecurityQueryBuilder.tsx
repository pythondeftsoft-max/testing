
import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Plus, 
  Minus, 
  Play, 
  Save, 
  BookOpen, 
  Code,
  History,
  Star,
  Trash2
} from 'lucide-react';

interface QueryCondition {
  id: string;
  field: string;
  operator: string;
  value: string;
  connector: 'AND' | 'OR';
}

interface SavedQuery {
  id: string;
  name: string;
  description: string;
  query: string;
  conditions: QueryCondition[];
  isFavorite: boolean;
  createdAt: Date;
}

interface SecurityQueryBuilderProps {
  onQueryChange: (query: string) => void;
}

const QUERY_FIELDS = [
  { value: 'event_type', label: 'Event Type' },
  { value: 'severity', label: 'Severity' },
  { value: 'action', label: 'Action' },
  { value: 'ip_address', label: 'IP Address' },
  { value: 'user_id', label: 'User ID' },
  { value: 'resource_type', label: 'Resource Type' },
  { value: 'resource_id', label: 'Resource ID' },
  { value: 'created_at', label: 'Created At' },
  { value: 'metadata', label: 'Metadata' }
];

const OPERATORS = [
  { value: 'equals', label: 'Equals (=)' },
  { value: 'not_equals', label: 'Not Equals (!=)' },
  { value: 'contains', label: 'Contains (LIKE)' },
  { value: 'not_contains', label: 'Not Contains (NOT LIKE)' },
  { value: 'starts_with', label: 'Starts With' },
  { value: 'ends_with', label: 'Ends With' },
  { value: 'greater_than', label: 'Greater Than (>)' },
  { value: 'less_than', label: 'Less Than (<)' },
  { value: 'greater_equal', label: 'Greater or Equal (>=)' },
  { value: 'less_equal', label: 'Less or Equal (<=)' },
  { value: 'in', label: 'In (IN)' },
  { value: 'not_in', label: 'Not In (NOT IN)' },
  { value: 'is_null', label: 'Is Null' },
  { value: 'is_not_null', label: 'Is Not Null' }
];

const SAMPLE_QUERIES = [
  {
    name: 'Critical Security Events',
    description: 'Find all critical severity events in the last 24 hours',
    query: `SELECT * FROM enterprise_security_audit 
WHERE severity = 'critical' 
AND created_at >= NOW() - INTERVAL '24 hours'
ORDER BY created_at DESC;`
  },
  {
    name: 'Failed Login Attempts',
    description: 'Detect potential brute force attacks',
    query: `SELECT ip_address, COUNT(*) as attempt_count
FROM enterprise_security_audit 
WHERE event_type = 'login_failed'
AND created_at >= NOW() - INTERVAL '1 hour'
GROUP BY ip_address
HAVING COUNT(*) >= 5
ORDER BY attempt_count DESC;`
  },
  {
    name: 'Suspicious IP Activity',
    description: 'Find IPs with unusual activity patterns',
    query: `SELECT ip_address, 
       COUNT(DISTINCT user_id) as unique_users,
       COUNT(*) as total_events
FROM enterprise_security_audit 
WHERE created_at >= NOW() - INTERVAL '6 hours'
AND ip_address IS NOT NULL
GROUP BY ip_address
HAVING COUNT(DISTINCT user_id) >= 3
ORDER BY unique_users DESC;`
  }
];

export const SecurityQueryBuilder: React.FC<SecurityQueryBuilderProps> = ({
  onQueryChange
}) => {
  const [conditions, setConditions] = useState<QueryCondition[]>([
    {
      id: '1',
      field: 'severity',
      operator: 'equals',
      value: 'high',
      connector: 'AND'
    }
  ]);

  const [rawQuery, setRawQuery] = useState('');
  const [queryMode, setQueryMode] = useState<'builder' | 'raw'>('builder');
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [queryName, setQueryName] = useState('');
  const [queryDescription, setQueryDescription] = useState('');

  const addCondition = () => {
    const newCondition: QueryCondition = {
      id: Date.now().toString(),
      field: 'event_type',
      operator: 'equals',
      value: '',
      connector: 'AND'
    };
    setConditions([...conditions, newCondition]);
  };

  const removeCondition = (id: string) => {
    setConditions(conditions.filter(c => c.id !== id));
  };

  const updateCondition = (id: string, updates: Partial<QueryCondition>) => {
    setConditions(conditions.map(c => 
      c.id === id ? { ...c, ...updates } : c
    ));
  };

  const buildSQLQuery = () => {
    if (conditions.length === 0) return '';

    let query = 'SELECT * FROM enterprise_security_audit WHERE ';
    
    conditions.forEach((condition, index) => {
      if (index > 0) {
        query += ` ${condition.connector} `;
      }

      const field = condition.field;
      const value = condition.value;

      switch (condition.operator) {
        case 'equals':
          query += `${field} = '${value}'`;
          break;
        case 'not_equals':
          query += `${field} != '${value}'`;
          break;
        case 'contains':
          query += `${field} ILIKE '%${value}%'`;
          break;
        case 'not_contains':
          query += `${field} NOT ILIKE '%${value}%'`;
          break;
        case 'starts_with':
          query += `${field} ILIKE '${value}%'`;
          break;
        case 'ends_with':
          query += `${field} ILIKE '%${value}'`;
          break;
        case 'greater_than':
          query += `${field} > '${value}'`;
          break;
        case 'less_than':
          query += `${field} < '${value}'`;
          break;
        case 'greater_equal':
          query += `${field} >= '${value}'`;
          break;
        case 'less_equal':
          query += `${field} <= '${value}'`;
          break;
        case 'in':
          query += `${field} IN (${value.split(',').map(v => `'${v.trim()}'`).join(',')})`;
          break;
        case 'not_in':
          query += `${field} NOT IN (${value.split(',').map(v => `'${v.trim()}'`).join(',')})`;
          break;
        case 'is_null':
          query += `${field} IS NULL`;
          break;
        case 'is_not_null':
          query += `${field} IS NOT NULL`;
          break;
        default:
          query += `${field} = '${value}'`;
      }
    });

    query += ' ORDER BY created_at DESC LIMIT 100;';
    return query;
  };

  const executeQuery = () => {
    const query = queryMode === 'builder' ? buildSQLQuery() : rawQuery;
    onQueryChange(query);
  };

  const saveQuery = () => {
    if (!queryName.trim()) return;

    const newSavedQuery: SavedQuery = {
      id: Date.now().toString(),
      name: queryName,
      description: queryDescription,
      query: queryMode === 'builder' ? buildSQLQuery() : rawQuery,
      conditions: [...conditions],
      isFavorite: false,
      createdAt: new Date()
    };

    setSavedQueries([newSavedQuery, ...savedQueries]);
    setQueryName('');
    setQueryDescription('');
  };

  const loadSavedQuery = (savedQuery: SavedQuery) => {
    setConditions(savedQuery.conditions);
    setRawQuery(savedQuery.query);
  };

  const toggleFavorite = (id: string) => {
    setSavedQueries(savedQueries.map(q => 
      q.id === id ? { ...q, isFavorite: !q.isFavorite } : q
    ));
  };

  const deleteSavedQuery = (id: string) => {
    setSavedQueries(savedQueries.filter(q => q.id !== id));
  };

  return (
    <div className="space-y-6">
      {/* Query Mode Toggle */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Code className="w-5 h-5" />
              Advanced Query Builder
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant={queryMode === 'builder' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQueryMode('builder')}
              >
                Visual Builder
              </Button>
              <Button
                variant={queryMode === 'raw' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setQueryMode('raw')}
              >
                Raw SQL
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {queryMode === 'builder' ? (
            <div className="space-y-4">
              {/* Query Conditions */}
              <div className="space-y-3">
                {conditions.map((condition, index) => (
                  <div key={condition.id} className="flex items-center gap-2 p-3 bg-gray-50 rounded-lg">
                    {index > 0 && (
                      <Select 
                        value={condition.connector} 
                        onValueChange={(value: 'AND' | 'OR') => 
                          updateCondition(condition.id, { connector: value })
                        }
                      >
                        <SelectTrigger className="w-20">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="AND">AND</SelectItem>
                          <SelectItem value="OR">OR</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                    
                    <Select 
                      value={condition.field} 
                      onValueChange={(value) => updateCondition(condition.id, { field: value })}
                    >
                      <SelectTrigger className="w-40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {QUERY_FIELDS.map(field => (
                          <SelectItem key={field.value} value={field.value}>
                            {field.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    <Select 
                      value={condition.operator} 
                      onValueChange={(value) => updateCondition(condition.id, { operator: value })}
                    >
                      <SelectTrigger className="w-48">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map(op => (
                          <SelectItem key={op.value} value={op.value}>
                            {op.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {!['is_null', 'is_not_null'].includes(condition.operator) && (
                      <Input
                        placeholder="Value"
                        value={condition.value}
                        onChange={(e) => updateCondition(condition.id, { value: e.target.value })}
                        className="flex-1"
                      />
                    )}
                    
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeCondition(condition.id)}
                      disabled={conditions.length === 1}
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <Button onClick={addCondition} variant="outline" size="sm">
                  <Plus className="w-4 h-4 mr-1" />
                  Add Condition
                </Button>
              </div>

              {/* Generated SQL Preview */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Generated SQL:</label>
                <Textarea
                  value={buildSQLQuery()}
                  readOnly
                  className="font-mono text-sm bg-gray-50"
                  rows={4}
                />
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Raw SQL Query:</label>
                <Textarea
                  value={rawQuery}
                  onChange={(e) => setRawQuery(e.target.value)}
                  placeholder="Enter your SQL query here..."
                  className="font-mono text-sm"
                  rows={6}
                />
              </div>
            </div>
          )}

          {/* Query Actions */}
          <div className="flex items-center gap-2 pt-4 border-t">
            <Button onClick={executeQuery} className="flex items-center gap-2">
              <Play className="w-4 h-4" />
              Execute Query
            </Button>
            
            <div className="flex items-center gap-2 ml-4">
              <Input
                placeholder="Query name"
                value={queryName}
                onChange={(e) => setQueryName(e.target.value)}
                className="w-40"
              />
              <Input
                placeholder="Description (optional)"
                value={queryDescription}
                onChange={(e) => setQueryDescription(e.target.value)}
                className="w-60"
              />
              <Button onClick={saveQuery} variant="outline" size="sm">
                <Save className="w-4 h-4 mr-1" />
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sample Queries */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5" />
            Sample Queries
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {SAMPLE_QUERIES.map((sample, index) => (
              <div key={index} className="p-4 border rounded-lg hover:bg-gray-50 cursor-pointer">
                <h4 className="font-medium mb-1">{sample.name}</h4>
                <p className="text-sm text-gray-600 mb-3">{sample.description}</p>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setRawQuery(sample.query);
                    setQueryMode('raw');
                  }}
                >
                  Load Query
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Saved Queries */}
      {savedQueries.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <History className="w-5 h-5" />
              Saved Queries
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {savedQueries.map((savedQuery) => (
                <div key={savedQuery.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{savedQuery.name}</h4>
                      {savedQuery.isFavorite && (
                        <Star className="w-4 h-4 text-yellow-500 fill-current" />
                      )}
                    </div>
                    {savedQuery.description && (
                      <p className="text-sm text-gray-600">{savedQuery.description}</p>
                    )}
                    <p className="text-xs text-gray-500">
                      Created {savedQuery.createdAt.toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleFavorite(savedQuery.id)}
                    >
                      <Star className={`w-4 h-4 ${savedQuery.isFavorite ? 'text-yellow-500 fill-current' : 'text-gray-400'}`} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => loadSavedQuery(savedQuery)}
                    >
                      Load
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => deleteSavedQuery(savedQuery.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};
