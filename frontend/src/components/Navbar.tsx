import React from 'react';
import { ShieldCheck, CheckCircle } from 'lucide-react';

const Navbar: React.FC = () => {
  return (
    <nav className="border-b border-gray-800 bg-gray-900">
      <div className="max-w-5xl mx-auto px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <ShieldCheck className="w-8 h-8 text-indigo-500" />
            <div>
              <h1 className="text-xl font-bold text-gray-100">LawLens-X</h1>
              <p className="text-sm text-gray-400">AI Contract Risk Intelligence</p>
            </div>
          </div>
          <div className="flex items-center space-x-2 text-sm">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-gray-400">Local AI Ready</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
