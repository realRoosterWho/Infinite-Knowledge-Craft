import React, { useState } from 'react';
import { extractConcepts } from '../services/geminiService';
import { ElementData } from '../types';

interface SetupModalProps {
  onComplete: (elements: ElementData[], language: string, topic: string) => void;
}

const SetupModal: React.FC<SetupModalProps> = ({ onComplete }) => {
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleStart = async () => {
    if (!input.trim()) return;

    setIsLoading(true);
    setError('');

    try {
      const { elements, language } = await extractConcepts(input);
      if (elements.length === 0) {
        setError("Couldn't extract concepts. Try a different text.");
      } else {
        // Pass the input as the 'topic' context
        onComplete(elements, language, input);
      }
    } catch (e) {
      setError("An API error occurred. Please check your key or try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleQuickStart = (topic: string) => {
    setInput(topic);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700 p-6 rounded-2xl max-w-lg w-full shadow-2xl">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-400 mb-2">
          Infinite Knowledge Craft
        </h1>
        <p className="text-slate-400 mb-6">
          Enter a topic, a URL (AI will simulate reading it), or paste an article text to generate your starting elements.
          The AI will automatically detect the language.
        </p>

        <textarea
          className="w-full bg-slate-800 text-white p-4 rounded-xl border border-slate-700 focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4 resize-none h-32"
          placeholder="e.g., 'Quantum Physics', '西游记', 'La Révolution française', or paste a paragraph..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />

        {error && (
          <div className="bg-red-900/20 border border-red-500/50 text-red-400 p-3 rounded-lg text-sm mb-4">
            {error}
          </div>
        )}

        <div className="flex flex-col gap-3">
          <button
            onClick={handleStart}
            disabled={isLoading || !input.trim()}
            className={`
              w-full py-3 rounded-xl font-bold text-lg transition-all
              ${isLoading 
                ? 'bg-slate-700 text-slate-500 cursor-not-allowed' 
                : 'bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white shadow-lg hover:shadow-blue-500/25'}
            `}
          >
            {isLoading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Extracting...
              </span>
            ) : 'Start Crafting'}
          </button>
        </div>

        <div className="mt-6">
          <p className="text-xs text-slate-500 mb-2 uppercase tracking-wider font-semibold">Quick Start Ideas</p>
          <div className="flex flex-wrap gap-2">
            {['Web Development', 'Space Exploration', '西游记', 'Sushi Making'].map(topic => (
              <button
                key={topic}
                onClick={() => handleQuickStart(topic)}
                disabled={isLoading}
                className="px-3 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-xs text-slate-300 transition-colors"
              >
                {topic}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SetupModal;