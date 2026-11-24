import React, { useState } from 'react';
import { 
  HiOutlineCloudArrowDown, HiOutlineDocumentText, 
  HiOutlineArrowPath, HiOutlineShieldCheck,
  HiOutlineCommandLine
} from 'react-icons/hi2';

export default function Level6Delivery({ onDownloadZip, onReset }) {
  const [lang, setLang] = useState('en');
  const [isLoading, setIsLoading] = useState(false);

  const handleDownload = async () => {
    setIsLoading(true);
    try {
      // Llamamos a la función del padre pasando el idioma
      await onDownloadZip(lang);
    } catch (error) {
      console.error("Download failed", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-10">
      <div className="text-left space-y-4 max-w-6xl">
        <p className="font-black text-[#3C64A3] text-[12px] uppercase tracking-[0.2em] mb-2 px-2">
          Step 06: Final Delivery & Traceability
        </p>
        <p className="text-slate-600 text-sm leading-relaxed px-2 italic">
          Your transformation journey is complete. All structural and semantic rules have been applied.
        </p>
      </div>

      <div className="group bg-white border-2 border-[#3C64A3]/10 p-10 rounded-[3rem] shadow-xl hover:border-[#3C64A3]/30 transition-all duration-500 relative overflow-hidden">
        <div className="relative z-10 flex flex-col md:flex-row gap-10 items-center">
          
          <div className={`w-24 h-24 rounded-[2rem] flex items-center justify-center shadow-2xl transition-all duration-500 ${isLoading ? 'bg-slate-400 animate-pulse' : 'bg-[#3C64A3] text-white'}`}>
            <HiOutlineCloudArrowDown size={48} className={isLoading ? 'animate-bounce' : ''} />
          </div>

          <div className="flex-1 text-left">
            <h4 className="text-2xl font-black text-slate-900 uppercase tracking-tight mb-4">
              {isLoading ? 'Generating Package...' : 'Download Transformation Bundle'}
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8 text-slate-500 text-xs">
              <div className="flex items-center gap-2 font-bold"><HiOutlineShieldCheck className="text-[#008C96]" /> Harmonized .CSV Files</div>
              <div className="flex items-center gap-2 font-bold"><HiOutlineCommandLine className="text-[#3C64A3]" /> DuckDB .SQL Queries</div>
              <div className="flex items-center gap-2 font-bold"><HiOutlineDocumentText className="text-[#FED56D]" /> Audit Manifesto ({lang.toUpperCase()})</div>
            </div>

            <div className="flex flex-col sm:flex-row gap-4 items-center">
              {/* Selector de Idioma */}
              <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200 shrink-0">
                {['es', 'en'].map((l) => (
                  <button 
                    key={l} 
                    type="button"
                    onClick={() => setLang(l)} 
                    className={`px-4 py-2 text-[10px] font-black rounded-lg transition-all ${lang === l ? 'bg-white shadow-sm text-[#3C64A3]' : 'text-slate-400 hover:text-slate-600'}`}
                  >
                    {l.toUpperCase()}
                  </button>
                ))}
              </div>

              {/* Botón de Acción */}
              <button 
                onClick={handleDownload}
                disabled={isLoading}
                className={`w-full py-5 rounded-[1.5rem] text-[11px] font-black uppercase tracking-[0.2em] transition-all shadow-xl flex items-center justify-center gap-3 ${isLoading ? 'bg-slate-200 text-slate-400 cursor-not-allowed' : 'bg-[#3C64A3] text-white hover:bg-[#2A4A7A] active:scale-95'}`}
              >
                {isLoading ? 'Processing...' : 'Collect Transformation Package (.zip)'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="pt-10 border-t border-slate-50 flex justify-center">
        <button 
          onClick={onReset} 
          className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 hover:text-[#3C64A3] transition-colors tracking-widest group"
        >
          <HiOutlineArrowPath className={`w-4 h-4 ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'} transition-transform duration-700`} /> 
          Start a New Transformation Quest
        </button>
      </div>
    </div>
  );
}