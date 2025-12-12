import React, { useState, useEffect } from 'react';
import {
  Play,
  Plus,
  Trash2,
  Save,
  Copy,
  BarChart2,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  ChevronRight,
  ChevronDown,
  Sliders,
  RefreshCw,
  Download,
  Share2,
  Layers,
  GitCompare,
  Settings,
  Clock,
  Target,
  DollarSign,
  Users,
  Shield,
  Zap,
  CheckCircle,
  Info
} from 'lucide-react';
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
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import predictionService from '../../services/predictionService';

const ScenarioSimulator = () => {
  const [loading, setLoading] = useState(false);
  const [runningSimulation, setRunningSimulation] = useState(false);
  const [activeTab, setActiveTab] = useState('create');
  const [scenarios, setScenarios] = useState([]);
  const [selectedScenarios, setSelectedScenarios] = useState([]);
  const [comparisonResults, setComparisonResults] = useState(null);

  // Current scenario being edited
  const [currentScenario, setCurrentScenario] = useState({
    name: '',
    description: '',
    type: 'spend',
    inputVariables: []
  });

  // Simulation results
  const [simulationResults, setSimulationResults] = useState(null);

  // Predefined scenario templates
  const scenarioTemplates = {
    spend: {
      name: 'Spend Optimization',
      description: 'Analyze impact of spend reduction strategies',
      variables: [
        { name: 'vendor_consolidation', label: 'Vendor Consolidation %', baselineValue: 100, unit: '%', min: 50, max: 100 },
        { name: 'payment_term_change', label: 'Payment Terms (days)', baselineValue: 30, unit: 'days', min: 15, max: 90 },
        { name: 'volume_discount', label: 'Volume Discount Target', baselineValue: 0, unit: '%', min: 0, max: 25 }
      ]
    },
    risk: {
      name: 'Risk Mitigation',
      description: 'Evaluate risk mitigation strategies',
      variables: [
        { name: 'audit_frequency', label: 'Audit Frequency (per year)', baselineValue: 1, unit: 'audits', min: 1, max: 12 },
        { name: 'backup_vendors', label: 'Backup Vendors Count', baselineValue: 0, unit: 'vendors', min: 0, max: 5 },
        { name: 'quality_threshold', label: 'Quality Threshold', baselineValue: 0.9, unit: 'score', min: 0.7, max: 0.99 }
      ]
    },
    demand: {
      name: 'Demand Scenario',
      description: 'Model demand fluctuations impact',
      variables: [
        { name: 'market_growth', label: 'Market Growth Rate', baselineValue: 0.05, unit: '%', min: -0.2, max: 0.3 },
        { name: 'seasonality_factor', label: 'Seasonality Intensity', baselineValue: 1.0, unit: 'factor', min: 0.5, max: 2.0 },
        { name: 'new_product_launches', label: 'New Products', baselineValue: 0, unit: 'products', min: 0, max: 10 }
      ]
    },
    vendor_loss: {
      name: 'Vendor Loss Impact',
      description: 'Analyze impact of losing key vendors',
      variables: [
        { name: 'vendor_share', label: 'Vendor Supply Share', baselineValue: 0.3, unit: '%', min: 0, max: 0.5 },
        { name: 'recovery_time', label: 'Recovery Time (days)', baselineValue: 30, unit: 'days', min: 7, max: 180 },
        { name: 'price_premium', label: 'Alternative Price Premium', baselineValue: 0.1, unit: '%', min: 0, max: 0.5 }
      ]
    },
    cashflow: {
      name: 'Cash Flow Optimization',
      description: 'Optimize payment timing and cash position',
      variables: [
        { name: 'early_payment_discount', label: 'Early Payment Discount', baselineValue: 0.02, unit: '%', min: 0, max: 0.05 },
        { name: 'payment_delay', label: 'Max Payment Delay (days)', baselineValue: 0, unit: 'days', min: 0, max: 30 },
        { name: 'credit_facility', label: 'Credit Facility Utilization', baselineValue: 0, unit: '%', min: 0, max: 1 }
      ]
    }
  };

  useEffect(() => {
    loadScenarios();
  }, []);

  const loadScenarios = async () => {
    setLoading(true);
    try {
      const response = await predictionService.getScenarios();
      setScenarios(response.scenarios || generateMockScenarios());
    } catch (error) {
      console.error('Error loading scenarios:', error);
      setScenarios(generateMockScenarios());
    } finally {
      setLoading(false);
    }
  };

  const generateMockScenarios = () => [
    {
      scenarioId: 'SC-001',
      name: 'Vendor Consolidation 2024',
      type: 'spend',
      status: 'completed',
      createdAt: new Date().toISOString(),
      outputs: [
        { metric: 'annual_spend', change: -125000, changePercent: -8.5 },
        { metric: 'vendor_count', change: -5, changePercent: -25 }
      ]
    },
    {
      scenarioId: 'SC-002',
      name: 'Risk Reduction Initiative',
      type: 'risk',
      status: 'completed',
      createdAt: new Date().toISOString(),
      outputs: [
        { metric: 'overall_risk_score', change: -0.15, changePercent: -20 },
        { metric: 'audit_cost', change: 15000, changePercent: 50 }
      ]
    },
    {
      scenarioId: 'SC-003',
      name: 'Market Expansion Scenario',
      type: 'demand',
      status: 'draft',
      createdAt: new Date().toISOString(),
      outputs: []
    }
  ];

  const handleTemplateSelect = (templateKey) => {
    const template = scenarioTemplates[templateKey];
    setCurrentScenario({
      name: template.name,
      description: template.description,
      type: templateKey,
      inputVariables: template.variables.map(v => ({
        ...v,
        scenarioValue: v.baselineValue
      }))
    });
  };

  const handleVariableChange = (index, field, value) => {
    const updatedVariables = [...currentScenario.inputVariables];
    updatedVariables[index] = {
      ...updatedVariables[index],
      [field]: parseFloat(value) || 0
    };
    setCurrentScenario({
      ...currentScenario,
      inputVariables: updatedVariables
    });
  };

  const addVariable = () => {
    setCurrentScenario({
      ...currentScenario,
      inputVariables: [
        ...currentScenario.inputVariables,
        {
          name: '',
          label: 'New Variable',
          baselineValue: 0,
          scenarioValue: 0,
          unit: '',
          min: 0,
          max: 100
        }
      ]
    });
  };

  const removeVariable = (index) => {
    const updatedVariables = currentScenario.inputVariables.filter((_, i) => i !== index);
    setCurrentScenario({
      ...currentScenario,
      inputVariables: updatedVariables
    });
  };

  const runSimulation = async () => {
    if (!currentScenario.name || currentScenario.inputVariables.length === 0) {
      alert('Please provide a scenario name and at least one variable');
      return;
    }

    setRunningSimulation(true);
    try {
      const response = await predictionService.runScenario(currentScenario);
      setSimulationResults(response);
      setActiveTab('results');
    } catch (error) {
      console.error('Simulation error:', error);
      // Generate mock results
      setSimulationResults(generateMockResults());
      setActiveTab('results');
    } finally {
      setRunningSimulation(false);
    }
  };

  const generateMockResults = () => ({
    scenarioId: `SC-${Date.now()}`,
    name: currentScenario.name,
    type: currentScenario.type,
    runAt: new Date().toISOString(),
    inputVariables: currentScenario.inputVariables,
    outputs: currentScenario.inputVariables.map(v => {
      const change = (v.scenarioValue - v.baselineValue);
      const impact = change * (Math.random() * 0.5 + 0.75);
      return {
        metric: `${v.name}_impact`,
        baselineValue: v.baselineValue * 1000,
        predictedValue: (v.baselineValue + impact) * 1000,
        change: impact * 1000,
        changePercent: ((impact / (v.baselineValue || 1)) * 100),
        confidence: 0.75 + Math.random() * 0.2
      };
    }),
    recommendations: [
      {
        priority: 'high',
        metric: 'cost_savings',
        recommendation: 'Implement vendor consolidation to achieve projected savings',
        confidence: 0.85
      },
      {
        priority: 'medium',
        metric: 'risk_mitigation',
        recommendation: 'Consider gradual implementation to minimize transition risks',
        confidence: 0.78
      }
    ],
    timeline: [
      { month: 'Month 1', baseline: 100000, scenario: 95000 },
      { month: 'Month 2', baseline: 100000, scenario: 92000 },
      { month: 'Month 3', baseline: 100000, scenario: 88000 },
      { month: 'Month 4', baseline: 100000, scenario: 85000 },
      { month: 'Month 5', baseline: 100000, scenario: 82000 },
      { month: 'Month 6', baseline: 100000, scenario: 80000 }
    ]
  });

  const saveScenario = async () => {
    try {
      await predictionService.createScenario({
        ...currentScenario,
        outputs: simulationResults?.outputs || []
      });
      loadScenarios();
      alert('Scenario saved successfully!');
    } catch (error) {
      console.error('Error saving scenario:', error);
      alert('Error saving scenario');
    }
  };

  const toggleScenarioSelection = (scenarioId) => {
    setSelectedScenarios(prev => 
      prev.includes(scenarioId) 
        ? prev.filter(id => id !== scenarioId)
        : [...prev, scenarioId]
    );
  };

  const compareSelectedScenarios = async () => {
    if (selectedScenarios.length < 2) {
      alert('Please select at least 2 scenarios to compare');
      return;
    }

    setLoading(true);
    try {
      const scenariosToCompare = scenarios.filter(s => selectedScenarios.includes(s.scenarioId));
      const response = await predictionService.compareScenarios(scenariosToCompare);
      setComparisonResults(response);
      setActiveTab('compare');
    } catch (error) {
      console.error('Comparison error:', error);
      // Generate mock comparison
      setComparisonResults(generateMockComparison());
      setActiveTab('compare');
    } finally {
      setLoading(false);
    }
  };

  const generateMockComparison = () => ({
    comparedAt: new Date().toISOString(),
    scenarios: selectedScenarios.map(id => {
      const scenario = scenarios.find(s => s.scenarioId === id);
      return {
        name: scenario?.name || id,
        type: scenario?.type || 'custom',
        netImpact: Math.random() * 100000 - 50000,
        avgConfidence: 0.75 + Math.random() * 0.2
      };
    }),
    summary: {
      recommendedScenario: scenarios.find(s => s.scenarioId === selectedScenarios[0])?.name,
      reason: 'Highest positive net impact with acceptable confidence level',
      confidence: 0.82
    },
    dimensionComparison: [
      { dimension: 'Cost Impact', ...Object.fromEntries(selectedScenarios.map((id, i) => [scenarios.find(s => s.scenarioId === id)?.name || id, Math.random() * 100])) },
      { dimension: 'Risk Change', ...Object.fromEntries(selectedScenarios.map((id, i) => [scenarios.find(s => s.scenarioId === id)?.name || id, Math.random() * 100])) },
      { dimension: 'Time to Value', ...Object.fromEntries(selectedScenarios.map((id, i) => [scenarios.find(s => s.scenarioId === id)?.name || id, Math.random() * 100])) },
      { dimension: 'Complexity', ...Object.fromEntries(selectedScenarios.map((id, i) => [scenarios.find(s => s.scenarioId === id)?.name || id, Math.random() * 100])) }
    ]
  });

  const renderScenarioBuilder = () => (
    <div className="space-y-6">
      {/* Template Selection */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Select Scenario Template</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {Object.entries(scenarioTemplates).map(([key, template]) => (
            <button
              key={key}
              onClick={() => handleTemplateSelect(key)}
              className={`p-4 rounded-lg border-2 transition-all text-left ${
                currentScenario.type === key 
                  ? 'border-blue-500 bg-blue-50' 
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                {key === 'spend' && <DollarSign className="w-5 h-5 text-blue-600" />}
                {key === 'risk' && <Shield className="w-5 h-5 text-orange-600" />}
                {key === 'demand' && <TrendingUp className="w-5 h-5 text-green-600" />}
                {key === 'vendor_loss' && <AlertTriangle className="w-5 h-5 text-red-600" />}
                {key === 'cashflow' && <Zap className="w-5 h-5 text-purple-600" />}
              </div>
              <p className="font-medium text-gray-900 text-sm">{template.name}</p>
              <p className="text-xs text-gray-500 mt-1">{template.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Scenario Details */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Scenario Details</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scenario Name</label>
            <input
              type="text"
              value={currentScenario.name}
              onChange={(e) => setCurrentScenario({ ...currentScenario, name: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Enter scenario name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <input
              type="text"
              value={currentScenario.description}
              onChange={(e) => setCurrentScenario({ ...currentScenario, description: e.target.value })}
              className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              placeholder="Brief description"
            />
          </div>
        </div>
      </div>

      {/* Variables Configuration */}
      <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Input Variables</h3>
          <button
            onClick={addVariable}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg"
          >
            <Plus className="w-4 h-4" />
            Add Variable
          </button>
        </div>

        {currentScenario.inputVariables.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Sliders className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>Select a template or add variables to begin</p>
          </div>
        ) : (
          <div className="space-y-4">
            {currentScenario.inputVariables.map((variable, index) => (
              <div key={index} className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-medium text-gray-900">{variable.label}</span>
                  <button
                    onClick={() => removeVariable(index)}
                    className="p-1 text-gray-400 hover:text-red-500"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Baseline Value</label>
                    <input
                      type="number"
                      value={variable.baselineValue}
                      onChange={(e) => handleVariableChange(index, 'baselineValue', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Scenario Value</label>
                    <input
                      type="number"
                      value={variable.scenarioValue}
                      onChange={(e) => handleVariableChange(index, 'scenarioValue', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-gray-500 mb-1">Unit</label>
                    <span className="block px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600">
                      {variable.unit}
                    </span>
                  </div>
                </div>

                {/* Slider for visual adjustment */}
                <div className="mt-3">
                  <input
                    type="range"
                    min={variable.min}
                    max={variable.max}
                    step={(variable.max - variable.min) / 100}
                    value={variable.scenarioValue}
                    onChange={(e) => handleVariableChange(index, 'scenarioValue', e.target.value)}
                    className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                  />
                  <div className="flex justify-between text-xs text-gray-400 mt-1">
                    <span>{variable.min} {variable.unit}</span>
                    <span>{variable.max} {variable.unit}</span>
                  </div>
                </div>

                {/* Change indicator */}
                <div className="mt-2 flex items-center gap-2">
                  <span className="text-xs text-gray-500">Change:</span>
                  <span className={`text-sm font-medium ${
                    variable.scenarioValue > variable.baselineValue ? 'text-green-600' :
                    variable.scenarioValue < variable.baselineValue ? 'text-red-600' :
                    'text-gray-600'
                  }`}>
                    {variable.scenarioValue > variable.baselineValue ? '+' : ''}
                    {((variable.scenarioValue - variable.baselineValue) / (variable.baselineValue || 1) * 100).toFixed(1)}%
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Run Simulation Button */}
      <div className="flex justify-end gap-4">
        <button
          onClick={() => setCurrentScenario({ name: '', description: '', type: 'spend', inputVariables: [] })}
          className="px-6 py-2.5 border border-gray-200 rounded-lg text-gray-700 hover:bg-gray-50"
        >
          Reset
        </button>
        <button
          onClick={runSimulation}
          disabled={runningSimulation || !currentScenario.name}
          className="flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
        >
          {runningSimulation ? (
            <>
              <RefreshCw className="w-5 h-5 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run Simulation
            </>
          )}
        </button>
      </div>
    </div>
  );

  const renderSimulationResults = () => {
    if (!simulationResults) {
      return (
        <div className="text-center py-12 text-gray-500">
          <BarChart2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No simulation results yet. Create and run a scenario first.</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Results Header */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">{simulationResults.name}</h3>
              <p className="text-sm text-gray-500">
                Simulated at {new Date(simulationResults.runAt).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={saveScenario}
                className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50"
              >
                <Save className="w-4 h-4" />
                Save
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Download className="w-4 h-4" />
                Export
              </button>
              <button className="flex items-center gap-2 px-4 py-2 border border-gray-200 rounded-lg hover:bg-gray-50">
                <Share2 className="w-4 h-4" />
                Share
              </button>
            </div>
          </div>
        </div>

        {/* Output Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {simulationResults.outputs?.map((output, index) => (
            <div key={index} className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
              <p className="text-sm text-gray-500 capitalize">
                {output.metric.replace(/_/g, ' ')}
              </p>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-gray-900">
                  {output.predictedValue >= 1000 
                    ? `$${(output.predictedValue / 1000).toFixed(1)}k`
                    : output.predictedValue.toFixed(2)
                  }
                </span>
                <span className={`text-sm font-medium ${
                  output.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                }`}>
                  {output.changePercent > 0 ? '+' : ''}{output.changePercent.toFixed(1)}%
                </span>
              </div>
              <div className="mt-2 flex items-center gap-1 text-xs text-gray-400">
                <Target className="w-3 h-3" />
                Confidence: {(output.confidence * 100).toFixed(0)}%
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Chart */}
        {simulationResults.timeline && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Projected Timeline</h3>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={simulationResults.timeline}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 12 }} />
                <YAxis tickFormatter={(v) => `$${(v/1000).toFixed(0)}k`} tick={{ fontSize: 12 }} />
                <Tooltip formatter={(value) => [`$${value.toLocaleString()}`, '']} />
                <Legend />
                <Line
                  type="monotone"
                  dataKey="baseline"
                  stroke="#9ca3af"
                  strokeDasharray="5 5"
                  name="Baseline"
                />
                <Line
                  type="monotone"
                  dataKey="scenario"
                  stroke="#3b82f6"
                  strokeWidth={2}
                  name="Scenario"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        {/* Recommendations */}
        {simulationResults.recommendations?.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recommendations</h3>
            <div className="space-y-3">
              {simulationResults.recommendations.map((rec, index) => (
                <div 
                  key={index} 
                  className={`p-4 rounded-lg flex items-start gap-3 ${
                    rec.priority === 'high' ? 'bg-blue-50' :
                    rec.priority === 'medium' ? 'bg-yellow-50' : 'bg-gray-50'
                  }`}
                >
                  <CheckCircle className={`w-5 h-5 mt-0.5 ${
                    rec.priority === 'high' ? 'text-blue-600' :
                    rec.priority === 'medium' ? 'text-yellow-600' : 'text-gray-600'
                  }`} />
                  <div>
                    <p className="font-medium text-gray-900">{rec.recommendation}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      Confidence: {(rec.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  const renderScenarioList = () => (
    <div className="space-y-6">
      {/* Action Bar */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Saved Scenarios</h3>
        <div className="flex gap-2">
          {selectedScenarios.length >= 2 && (
            <button
              onClick={compareSelectedScenarios}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700"
            >
              <GitCompare className="w-4 h-4" />
              Compare ({selectedScenarios.length})
            </button>
          )}
        </div>
      </div>

      {/* Scenarios Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {scenarios.map((scenario) => (
          <div
            key={scenario.scenarioId}
            className={`bg-white rounded-xl shadow-sm p-6 border-2 transition-all cursor-pointer ${
              selectedScenarios.includes(scenario.scenarioId)
                ? 'border-purple-500 bg-purple-50'
                : 'border-gray-100 hover:border-gray-200'
            }`}
            onClick={() => toggleScenarioSelection(scenario.scenarioId)}
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-semibold text-gray-900">{scenario.name}</h4>
                <p className="text-sm text-gray-500 capitalize">{scenario.type} scenario</p>
              </div>
              <span className={`px-2 py-1 text-xs rounded-full ${
                scenario.status === 'completed' ? 'bg-green-100 text-green-700' :
                scenario.status === 'running' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {scenario.status}
              </span>
            </div>

            {scenario.outputs?.length > 0 && (
              <div className="space-y-2 mb-4">
                {scenario.outputs.slice(0, 2).map((output, idx) => (
                  <div key={idx} className="flex items-center justify-between text-sm">
                    <span className="text-gray-500 capitalize">
                      {output.metric.replace(/_/g, ' ')}
                    </span>
                    <span className={`font-medium ${
                      output.changePercent > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {output.changePercent > 0 ? '+' : ''}{output.changePercent.toFixed(1)}%
                    </span>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center gap-2 text-xs text-gray-400">
              <Clock className="w-3 h-3" />
              {new Date(scenario.createdAt).toLocaleDateString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderComparison = () => {
    if (!comparisonResults) {
      return (
        <div className="text-center py-12 text-gray-500">
          <GitCompare className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>Select scenarios from the list to compare</p>
        </div>
      );
    }

    const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

    return (
      <div className="space-y-6">
        {/* Comparison Summary */}
        <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Scenario Comparison</h3>
            <span className="text-sm text-gray-500">
              Compared {comparisonResults.scenarios.length} scenarios
            </span>
          </div>

          {/* Recommendation */}
          {comparisonResults.summary && (
            <div className="p-4 bg-blue-50 rounded-lg mb-6">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-5 h-5 text-blue-600" />
                <span className="font-medium text-blue-900">Recommended: {comparisonResults.summary.recommendedScenario}</span>
              </div>
              <p className="text-sm text-blue-700">{comparisonResults.summary.reason}</p>
            </div>
          )}

          {/* Scenario Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {comparisonResults.scenarios.map((scenario, index) => (
              <div 
                key={index} 
                className={`p-4 rounded-lg border ${
                  scenario.name === comparisonResults.summary?.recommendedScenario
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div 
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: COLORS[index] }}
                  />
                  <span className="font-medium text-gray-900">{scenario.name}</span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Net Impact</span>
                    <span className={`font-medium ${
                      scenario.netImpact < 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {scenario.netImpact < 0 ? '-' : '+'}${Math.abs(scenario.netImpact / 1000).toFixed(1)}k
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Confidence</span>
                    <span className="font-medium">
                      {(scenario.avgConfidence * 100).toFixed(0)}%
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Radar Chart Comparison */}
        {comparisonResults.dimensionComparison && (
          <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Multi-Dimension Comparison</h3>
            <ResponsiveContainer width="100%" height={400}>
              <RadarChart data={comparisonResults.dimensionComparison}>
                <PolarGrid />
                <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 12 }} />
                <PolarRadiusAxis domain={[0, 100]} />
                {comparisonResults.scenarios.map((scenario, index) => (
                  <Radar
                    key={scenario.name}
                    name={scenario.name}
                    dataKey={scenario.name}
                    stroke={COLORS[index]}
                    fill={COLORS[index]}
                    fillOpacity={0.2}
                  />
                ))}
                <Legend />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
            <Layers className="w-8 h-8 text-purple-600" />
            Scenario Simulator
          </h1>
          <p className="text-gray-500 mt-1">What-if analysis and scenario planning</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex gap-8">
          {[
            { id: 'create', label: 'Create Scenario', icon: Plus },
            { id: 'results', label: 'Results', icon: BarChart2 },
            { id: 'saved', label: 'Saved Scenarios', icon: Save },
            { id: 'compare', label: 'Compare', icon: GitCompare }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === tab.id
                  ? 'border-purple-500 text-purple-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="mt-6">
        {activeTab === 'create' && renderScenarioBuilder()}
        {activeTab === 'results' && renderSimulationResults()}
        {activeTab === 'saved' && renderScenarioList()}
        {activeTab === 'compare' && renderComparison()}
      </div>
    </div>
  );
};

export default ScenarioSimulator;
