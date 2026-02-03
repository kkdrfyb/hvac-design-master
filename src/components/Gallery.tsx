import React, { useState, useRef } from 'react';
import { GalleryItem } from '../types';

interface Props {
  items: GalleryItem[];
  onAdd: (files: { file: File, title: string, drawingNumber: string }[]) => void;
  onRemove: (id: string) => void;
}

const Gallery: React.FC<Props> = ({ items, onAdd, onRemove }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pendingFiles, setPendingFiles] = useState<{ file: File, title: string, drawingNumber: string }[]>([]);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [previewPdfUrl, setPreviewPdfUrl] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(file => ({
        file,
        title: file.name.replace(/\.[^/.]+$/, ""), // remove extension
        drawingNumber: ''
      }));
      setPendingFiles(newFiles);
      setShowUploadModal(true);
    }
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleConfirmUpload = () => {
    onAdd(pendingFiles);
    setPendingFiles([]);
    setShowUploadModal(false);
  };

  const updateMetadata = (index: number, field: 'title' | 'drawingNumber', value: string) => {
    const updated = [...pendingFiles];
    updated[index] = { ...updated[index], [field]: value };
    setPendingFiles(updated);
  };

  return (
    <div className="space-y-6 h-full flex flex-col">
      <div className="flex justify-between items-center flex-shrink-0">
        <h2 className="text-2xl font-bold text-slate-800">图纸图库 (Gallery)</h2>
        <button 
          onClick={() => fileInputRef.current?.click()}
          className="bg-blue-600 text-white px-4 py-2 rounded shadow hover:bg-blue-700 transition"
        >
          上传图纸/PDF
        </button>
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept="image/*,application/pdf" 
          multiple
          className="hidden" 
        />
      </div>

      {showUploadModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm animate-fade-in">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
             <div className="p-4 border-b border-slate-200">
               <h3 className="font-bold text-lg">完善图纸信息</h3>
             </div>
             <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {pendingFiles.map((item, idx) => (
                  <div key={idx} className="flex gap-4 items-start border p-3 rounded bg-slate-50">
                     <div className="flex-1 space-y-2">
                       <div>
                         <label className="text-xs text-slate-500">图纸名称</label>
                         <input 
                           className="w-full border p-1 rounded text-sm" 
                           value={item.title}
                           onChange={(e) => updateMetadata(idx, 'title', e.target.value)}
                         />
                       </div>
                       <div>
                         <label className="text-xs text-slate-500">图号 (Drawing No.)</label>
                         <input 
                           className="w-full border p-1 rounded text-sm" 
                           placeholder="e.g. 01UTL-001"
                           value={item.drawingNumber}
                           onChange={(e) => updateMetadata(idx, 'drawingNumber', e.target.value)}
                         />
                       </div>
                     </div>
                     <div className="text-xs text-slate-400 self-center">
                       {item.file.name}
                     </div>
                  </div>
                ))}
             </div>
             <div className="p-4 border-t border-slate-200 flex justify-end gap-2">
               <button onClick={() => setShowUploadModal(false)} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded">取消</button>
               <button onClick={handleConfirmUpload} className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">确认上传</button>
             </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewPdfUrl && (
         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm animate-fade-in">
            <div className="bg-white w-full h-full max-w-6xl max-h-[90vh] flex flex-col rounded shadow-2xl relative">
                <button 
                  onClick={() => setPreviewPdfUrl(null)}
                  className="absolute -top-4 -right-4 bg-red-600 text-white rounded-full w-8 h-8 flex items-center justify-center shadow-lg hover:bg-red-700 z-50"
                >
                  ×
                </button>
                <iframe src={previewPdfUrl} className="w-full h-full rounded" title="PDF Preview"></iframe>
            </div>
         </div>
      )}

      <div className="flex-1 overflow-y-auto">
      {items.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 border-2 border-dashed border-slate-300 rounded-lg">
           <p className="text-slate-500">暂无文件，请点击右上角上传。</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 pb-20">
          {items.map(item => (
            <div key={item.id} className="group relative bg-white rounded-lg shadow-sm border border-slate-200 overflow-hidden hover:shadow-lg transition">
              <div className="aspect-w-16 aspect-h-12 bg-slate-100 relative">
                {item.type === 'pdf' ? (
                  <div className="w-full h-48 flex flex-col items-center justify-center text-slate-400 bg-slate-50">
                     <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                       <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                     </svg>
                     <span className="text-xs font-bold uppercase">PDF Document</span>
                     <button 
                       onClick={() => setPreviewPdfUrl(item.url)}
                       className="mt-2 text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 transition"
                     >
                       预览内容
                     </button>
                  </div>
                ) : (
                  <img src={item.url} alt={item.title} className="object-cover w-full h-48 cursor-pointer" onClick={() => {
                     // Simple image preview could go here, reusing PDF modal or separate
                     const w = window.open("");
                     w?.document.write(`<img src="${item.url}" style="max-width:100%"/>`);
                  }}/>
                )}
              </div>
              <div className="p-3">
                <div className="flex justify-between items-start">
                  <p className="text-sm font-bold text-slate-800 truncate flex-1" title={item.title}>{item.title}</p>
                </div>
                {item.drawingNumber && <p className="text-xs font-mono text-slate-600 bg-slate-100 inline-block px-1 rounded mt-1">{item.drawingNumber}</p>}
                <p className="text-xs text-slate-400 mt-1">{item.uploadDate}</p>
              </div>
              <button 
                onClick={() => onRemove(item.id)}
                className="absolute top-2 right-2 bg-red-500 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition shadow-sm"
                title="删除"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
      </div>
    </div>
  );
};

export default Gallery;