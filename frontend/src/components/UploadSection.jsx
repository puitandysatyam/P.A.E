import React from 'react';
import { UploadCloud } from 'lucide-react';

export default function UploadSection({ onUpload }) {
  return (
    <div className="max-w-2xl mx-auto mt-12">
      <div className="mb-8">
        <h2 className="text-2xl font-bold">Ingest Statements</h2>
        <p className="text-gray-500 mt-1">Upload CSV, PDF files, or Images. PII will be masked prior to ML execution.</p>
      </div>

      <div className="border-2 border-dashed border-gray-300 rounded-xl bg-white p-12 text-center hover:bg-gray-50 hover:border-gray-400 transition-all">
        <UploadCloud className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Drag and drop your files</h3>
        <p className="text-sm text-gray-500 mt-1 mb-6">Supports .csv, .pdf, .jpg, .png up to 50MB</p>
        
        <form onSubmit={onUpload}>
          <label className="cursor-pointer inline-flex items-center px-6 py-3 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none">
            <span>Browse Files</span>
            <input type="file" className="sr-only" accept=".csv,.pdf,.jpg,.jpeg,.png" onChange={onUpload} />
          </label>
        </form>
      </div>
    </div>
  );
}