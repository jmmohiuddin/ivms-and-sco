import { useState, useRef, useEffect } from 'react';
import { 
  FiX, FiSend, FiMessageSquare, FiZap, FiBarChart2, FiSearch,
  FiCheckCircle, FiAlertCircle, FiTrendingUp, FiFileText
} from 'react-icons/fi';

const AIAssistant = ({ onClose }) => {
  const [mode, setMode] = useState('explain'); // explain, action, prediction, search
  const [messages, setMessages] = useState([
    {
      type: 'ai',
      content: 'Hi! I\'m your AI assistant. I can help you:',
      suggestions: [
        'Explain why this invoice is an exception',
        'Fix compliance violations for Vendor X',
        'Predict spend for next quarter',
        'Find all pending vendor approvals'
      ]
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const modes = [
    { id: 'explain', label: 'Explain', icon: FiMessageSquare, color: 'blue' },
    { id: 'action', label: 'Action', icon: FiZap, color: 'purple' },
    { id: 'prediction', label: 'Predict', icon: FiTrendingUp, color: 'green' },
    { id: 'search', label: 'Search', icon: FiSearch, color: 'yellow' }
  ];

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage = { type: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    // Simulate AI response
    setTimeout(() => {
      let aiResponse;
      
      if (mode === 'explain') {
        aiResponse = {
          type: 'ai',
          content: 'Based on the analysis:',
          details: [
            { icon: FiAlertCircle, text: 'Invoice amount exceeds PO by 12%', color: 'red' },
            { icon: FiCheckCircle, text: 'Vendor is compliant and approved', color: 'green' },
            { icon: FiFileText, text: 'Missing delivery confirmation', color: 'yellow' }
          ],
          actions: [
            { label: 'View Invoice Details', primary: true },
            { label: 'Contact Vendor', primary: false }
          ]
        };
      } else if (mode === 'action') {
        aiResponse = {
          type: 'ai',
          content: 'I can help fix this. Here\'s what I\'ll do:',
          steps: [
            { step: 1, text: 'Verify vendor insurance certificate', status: 'complete' },
            { step: 2, text: 'Upload missing tax document', status: 'pending' },
            { step: 3, text: 'Update compliance status', status: 'pending' }
          ],
          actions: [
            { label: 'Apply Fix', primary: true },
            { label: 'Review Steps', primary: false }
          ]
        };
      } else if (mode === 'prediction') {
        aiResponse = {
          type: 'ai',
          content: 'Based on current trends:',
          prediction: {
            metric: 'Q1 2025 Spend Forecast',
            value: '$2.4M',
            change: '+18%',
            confidence: '87%'
          },
          chart: true,
          actions: [
            { label: 'View Scenario Simulator', primary: true },
            { label: 'Download Report', primary: false }
          ]
        };
      } else {
        aiResponse = {
          type: 'ai',
          content: 'Found 3 results:',
          results: [
            { title: 'Vendor: TechCorp Inc', status: 'Pending Approval', type: 'vendor' },
            { title: 'Invoice INV-2024-001', status: 'Exception', type: 'invoice' },
            { title: 'Compliance Task #4782', status: 'Overdue', type: 'task' }
          ]
        };
      }

      setMessages(prev => [...prev, aiResponse]);
      setLoading(false);
    }, 1500);
  };

  const handleSuggestionClick = (suggestion) => {
    setInput(suggestion);
    handleSend();
  };

  const getModeColor = (modeId) => {
    const mode = modes.find(m => m.id === modeId);
    return mode?.color || 'blue';
  };

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg flex items-center justify-center">
            <FiMessageSquare size={18} className="text-white" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-gray-900">AI Assistant</h2>
            <p className="text-xs text-gray-500">Always here to help</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <FiX size={18} className="text-gray-500" />
        </button>
      </div>

      {/* Mode Selector */}
      <div className="flex items-center space-x-2 p-4 border-b border-gray-100">
        {modes.map((m) => {
          const Icon = m.icon;
          const isActive = mode === m.id;
          return (
            <button
              key={m.id}
              onClick={() => setMode(m.id)}
              className={`flex items-center space-x-1 px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? `bg-${m.color}-50 text-${m.color}-600 ring-1 ring-${m.color}-200`
                  : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
              }`}
            >
              <Icon size={14} />
              <span>{m.label}</span>
            </button>
          );
        })}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message, index) => (
          <div key={index} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              {message.type === 'user' ? (
                <div className="bg-blue-600 text-white rounded-2xl rounded-tr-sm px-4 py-2">
                  <p className="text-sm">{message.content}</p>
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="bg-gray-100 rounded-2xl rounded-tl-sm px-4 py-3">
                    <p className="text-sm text-gray-900">{message.content}</p>
                  </div>

                  {/* Details */}
                  {message.details && (
                    <div className="space-y-1.5 ml-2">
                      {message.details.map((detail, i) => {
                        const Icon = detail.icon;
                        return (
                          <div key={i} className="flex items-start space-x-2">
                            <Icon size={16} className={`text-${detail.color}-500 mt-0.5`} />
                            <span className="text-sm text-gray-700">{detail.text}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Steps */}
                  {message.steps && (
                    <div className="space-y-2 ml-2">
                      {message.steps.map((step) => (
                        <div key={step.step} className="flex items-center space-x-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium ${
                            step.status === 'complete'
                              ? 'bg-green-100 text-green-600'
                              : 'bg-gray-100 text-gray-600'
                          }`}>
                            {step.status === 'complete' ? <FiCheckCircle size={14} /> : step.step}
                          </div>
                          <span className="text-sm text-gray-700">{step.text}</span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Prediction */}
                  {message.prediction && (
                    <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg p-4 ml-2">
                      <div className="text-xs text-gray-500 mb-1">{message.prediction.metric}</div>
                      <div className="text-2xl font-bold text-gray-900">{message.prediction.value}</div>
                      <div className="flex items-center space-x-3 mt-2">
                        <span className="text-sm font-medium text-green-600">{message.prediction.change}</span>
                        <span className="text-sm text-gray-500">•</span>
                        <span className="text-sm text-gray-600">{message.prediction.confidence} confidence</span>
                      </div>
                    </div>
                  )}

                  {/* Search Results */}
                  {message.results && (
                    <div className="space-y-2 ml-2">
                      {message.results.map((result, i) => (
                        <div key={i} className="bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all cursor-pointer">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-900">{result.title}</span>
                            <span className={`text-xs px-2 py-1 rounded-full ${
                              result.status.includes('Pending') ? 'bg-yellow-100 text-yellow-700' :
                              result.status.includes('Exception') ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {result.status}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Actions */}
                  {message.actions && (
                    <div className="flex items-center space-x-2 ml-2">
                      {message.actions.map((action, i) => (
                        <button
                          key={i}
                          className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-all ${
                            action.primary
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                          }`}
                        >
                          {action.label}
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Suggestions */}
                  {message.suggestions && (
                    <div className="space-y-2 ml-2">
                      {message.suggestions.map((suggestion, i) => (
                        <button
                          key={i}
                          onClick={() => handleSuggestionClick(suggestion)}
                          className="w-full text-left bg-white border border-gray-200 rounded-lg p-3 hover:border-blue-300 hover:shadow-sm transition-all text-sm text-gray-700"
                        >
                          {suggestion}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex items-center space-x-2 text-gray-500">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
            <span className="text-sm">AI is thinking...</span>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 p-4">
        <div className="flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={`Ask AI to ${mode === 'explain' ? 'explain something' : mode === 'action' ? 'fix something' : mode === 'prediction' ? 'predict trends' : 'search for anything'}...`}
            className="flex-1 px-4 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
            disabled={loading}
          />
          <button
            onClick={handleSend}
            disabled={loading || !input.trim()}
            className="p-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <FiSend size={18} />
          </button>
        </div>
        <p className="text-xs text-gray-400 mt-2">
          Powered by AI • Context-aware • Always learning
        </p>
      </div>
    </div>
  );
};

export default AIAssistant;
