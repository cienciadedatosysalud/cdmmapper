import React, { useState, useEffect, useRef } from 'react';
import {
  HiOutlineArrowLongRight, HiOutlineCheckCircle,
  HiOutlineMagnifyingGlass, HiOutlineBookOpen,
  HiOutlineVariable, HiOutlineChevronDown, HiOutlineSparkles,
  HiOutlineExclamationTriangle, HiOutlineTrash // Añadido Trash para el reset
} from 'react-icons/hi2';

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

export default function Level4ValueMapper({
  activeEntity,
  entitiesConfig = [],
  mappedColumnsByEntity = {},
  valueMappings = {},
  onUpdateMapping,
  onClearAll // Función que debería limpiar los mapeos de la entidad/variable
}) {
  const [selectedVar, setSelectedVar] = useState(null);
  const [uniqueValues, setUniqueValues] = useState([]);
  const [catalogData, setCatalogData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  const currentEntityDef = entitiesConfig.find(e => e.name === activeEntity);
  const variablesWithCatalog = currentEntityDef?.variables.filter(v => v.catalog_bl) || [];


  const MySwal = withReactContent(Swal);

  // Personalización del estilo para que coincida con tu paleta técnica (Azul/Slate)
  const swalConfig = {
    confirmButtonColor: '#3C64A3',
    cancelButtonColor: '#94A3B8',
    customClass: {
      popup: 'rounded-[2rem] border-none shadow-2xl font-sans',
      title: 'text-slate-900 font-black uppercase tracking-tight',
      confirmButton: 'rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest',
      cancelButton: 'rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest'
    }
  };

  useEffect(() => {
    setCatalogData([]);
    setPage(0);
    setHasMore(true);
  }, [selectedVar, searchTerm]);

  useEffect(() => {
    if (!selectedVar) return;
    const loadSource = async () => {
      setLoading(true);
      try {
        const sourcePath = (mappedColumnsByEntity[activeEntity] || {})[selectedVar.label];
        if (sourcePath) {
          const lastIdx = sourcePath.lastIndexOf('.');
          const f = sourcePath.substring(0, lastIdx);
          const c = sourcePath.substring(lastIdx + 1);
          const res = await fetch(`/api/values/${encodeURIComponent(f)}/${encodeURIComponent(c)}`);
          const data = await res.json();
          setUniqueValues(data);
        } else {
          setUniqueValues([]);
        }
      } catch (e) {
        console.error("Error Source:", e);
        setUniqueValues([]);
      } finally { setLoading(false); }
    };
    loadSource();
  }, [selectedVar, activeEntity, mappedColumnsByEntity]);

  useEffect(() => {
    if (!selectedVar || !selectedVar.catalog) return;
    const fetchCatalog = async () => {
      const { filename, column_name } = selectedVar.catalog;
      try {
        const url = `/api/catalog-distinct-values/${encodeURIComponent(filename)}/${encodeURIComponent(column_name)}?page=${page}&search=${encodeURIComponent(searchTerm)}`;
        const res = await fetch(url);
        const newData = await res.json();
        if (newData.length < 50) setHasMore(false);
        setCatalogData(prev => (page === 0 ? newData : [...prev, ...newData]));
      } catch (e) { console.error("Error Catalog:", e); }
    };
    const timer = setTimeout(fetchCatalog, 250);
    return () => clearTimeout(timer);
  }, [selectedVar, page, searchTerm]);

  const handleAutoMap = async () => {
    if (!selectedVar || !selectedVar.catalog) return;
    const sourcePath = (mappedColumnsByEntity[activeEntity] || {})[selectedVar.label];
    if (!sourcePath) {
      MySwal.fire({
        title: 'Smart Map Success',
        text: `Please map the source column first in Level 3`,
        icon: 'success',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        ...swalConfig
      });

      return;
    }
    setIsAutoMapping(true);
    const lastIdx = sourcePath.lastIndexOf('.');
    const sourceFile = sourcePath.substring(0, lastIdx);
    const sourceCol = sourcePath.substring(lastIdx + 1);
    try {
      const res = await fetch('/api/auto-map-values', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_file: sourceFile,
          source_col: sourceCol,
          catalog_file: selectedVar.catalog.filename,
          catalog_col: selectedVar.catalog.column_name
        })
      });
      const matches = await res.json();
      const entries = Object.entries(matches);
      if (entries.length === 0) {
        MySwal.fire({
        title: 'No matches found',
        text: "No exact matches found in the catalog.",
        icon: 'info',
        confirmButtonText: 'Understood',
        ...swalConfig
      });
      } else {
        entries.forEach(([srcVal, targetVal]) => {
          onUpdateMapping(activeEntity, selectedVar.label, srcVal, targetVal);
        });
      }
    } catch (e) { console.error("Auto-map error:", e); } finally { setIsAutoMapping(false); }
  };

  // NUEVA FUNCIÓN: RESET MASIVO DE LA VARIABLE SELECCIONADA
  const handleResetVariable = () => {
    if (!selectedVar) return;
    if (window.confirm(`Are you sure you want to clear ALL mappings for ${selectedVar.label}?`)) {
      uniqueValues.forEach(v => {
        onUpdateMapping(activeEntity, selectedVar.label, v.val, "");
      });
    }
  };

  const handleDropdownScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore) {
      setPage(prev => prev + 1);
    }
  };

  const getProgress = () => {
    if (!selectedVar || uniqueValues.length === 0) return { pending: 0, percent: 0 };
    const mappedValues = valueMappings[activeEntity]?.[selectedVar.label] || {};
    const mappedCount = uniqueValues.filter(v => mappedValues[v.val]).length;
    return { pending: uniqueValues.length - mappedCount, percent: Math.round((mappedCount / uniqueValues.length) * 100) };
  };
  const { pending, percent } = getProgress();

  return (
    <div className="flex flex-col h-[1050px] overflow-hidden text-[#1D1D1B]">
      {/* HEADER */}
      <div className="mb-10 flex flex-col space-y-6">
        <div className="text-left space-y-4 max-w-6xl">
          <p className="font-black text-[#3C64A3] text-[12px] uppercase tracking-[0.2em] mb-2 px-2">Step 04: Semantic Value Translation</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border-l-4 border-[#3C64A3] p-6 rounded-r-[2.5rem] shadow-sm">
              <p className="text-[12px] text-slate-600 leading-relaxed italic">Map raw values to standardized catalog codes.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* SIDEBAR */}
        <div className="w-1/3 border-r border-slate-200 p-6 overflow-y-auto bg-white/40">
          <h3 className="text-[10px] font-black uppercase text-[#3C64A3] mb-6 opacity-60 tracking-widest">Fields to Map</h3>
          <div className="space-y-3">
            {variablesWithCatalog.map(v => {
              const isSelected = selectedVar?.label === v.label;
              const isMappedInLevel3 = mappedColumnsByEntity[activeEntity]?.[v.label];
              const hasOrphanValues = valueMappings[activeEntity]?.[v.label] && !isMappedInLevel3;
              return (
                <button
                  key={v.label}
                  onClick={() => setSelectedVar(v)}
                  disabled={!isMappedInLevel3}
                  className={`w-full text-left p-5 rounded-[2rem] transition-all border-2 flex justify-between items-center relative ${isSelected ? 'bg-white border-[#3C64A3] text-[#3C64A3] shadow-md' : 'bg-transparent border-transparent text-slate-500'
                    } ${!isMappedInLevel3 ? 'opacity-30' : 'hover:border-slate-200'}`}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-2">
                      <div className="font-black text-[11px] uppercase truncate">{v.label}</div>
                      {hasOrphanValues && <HiOutlineExclamationTriangle className="text-red-500 animate-pulse" size={14} />}
                    </div>
                    <div className="text-[8px] font-bold opacity-50 uppercase">{isMappedInLevel3 ? v.catalog?.filename : "No source"}</div>
                  </div>
                  {isMappedInLevel3 && (
                    <div className="flex flex-col items-end gap-1">
                      <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#008C96]' : 'bg-slate-200'}`} />
                      {valueMappings[activeEntity]?.[v.label] && <span className="text-[7px] font-black text-[#008C96]">MAPPED</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* MAPPING PANEL */}
        <div className="flex-1 p-8 overflow-y-auto bg-white relative">
          {selectedVar ? (
            <div className="max-w-4xl mx-auto space-y-6">
              {/* PROGRESS */}
              <div className="bg-[#3C64A3]/5 border border-[#3C64A3]/10 p-5 rounded-[2.5rem] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl font-black text-[10px] ${pending > 0 ? 'bg-[#FED56D]' : 'bg-[#008C96] text-white'}`}>
                    {pending} PENDING
                  </div>
                  <div className="text-sm font-black text-[#3C64A3]">{percent}% Complete</div>
                </div>
                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#008C96] transition-all" style={{ width: `${percent}%` }} />
                </div>
              </div>

              {/* CONTROLS */}
              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm pb-3 flex gap-3">
                <div className="flex-1 flex items-center gap-4 bg-white border-2 border-[#3C64A3]/10 p-4 rounded-2xl focus-within:border-[#3C64A3] transition-all">
                  <HiOutlineMagnifyingGlass className="text-[#3C64A3]" size={20} />
                  <input
                    className="bg-transparent w-full text-sm font-black uppercase outline-none"
                    placeholder="Search catalog..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <button
                  onClick={handleAutoMap}
                  disabled={isAutoMapping}
                  className="bg-[#FED56D] hover:bg-[#EEB141] text-[#1D1D1B] px-6 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg transition-all"
                >
                  <HiOutlineSparkles size={18} className={isAutoMapping ? 'animate-spin' : ''} />
                  Auto-Map
                </button>
                <button
                  onClick={handleResetVariable}
                  className="bg-red-50 hover:bg-red-500 hover:text-white text-red-600 px-6 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 transition-all border border-red-100"
                  title="Clear all mappings for this variable"
                >
                  <HiOutlineTrash size={18} />
                  Reset
                </button>
              </div>

              {/* VALUE LIST */}
              {loading ? (
                <div className="py-20 text-center animate-pulse text-[#3C64A3] font-black uppercase text-sm">Loading...</div>
              ) : (
                <div className="space-y-4">
                  {uniqueValues.map((item, idx) => {
                    const currentMap = valueMappings[activeEntity]?.[selectedVar.label]?.[item.val] || "";
                    const isDropdownOpen = activeDropdown === idx;
                    const keyCol = selectedVar.catalog?.column_name;

                    return (
                      <div key={idx} className="flex items-center gap-6 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 transition-all">
                        <div className="w-1/3">
                          <div className="text-[9px] font-black text-[#3C64A3] uppercase opacity-50 mb-1">Source Value</div>
                          <div className="text-base font-mono font-black text-[#1D1D1B] truncate">{item.val === null ? "NULL" : item.val}</div>
                          <div className="text-[10px] font-bold text-slate-400">Freq: {item.freq?.toLocaleString()}</div>
                        </div>
                        <HiOutlineArrowLongRight className="text-slate-200" size={24} />
                        <div className="flex-1 relative">
                          <button
                            onClick={() => setActiveDropdown(isDropdownOpen ? null : idx)}
                            className={`w-full flex justify-between items-center px-6 py-4 rounded-2xl border-2 text-[11px] font-black uppercase transition-all ${currentMap ? 'border-[#008C96] bg-[#008C96]/5 text-[#008C96]' : 'border-slate-100 bg-white text-slate-400'
                              }`}
                          >
                            <span className="truncate">{currentMap || "Select Code..."}</span>
                            <HiOutlineChevronDown className={isDropdownOpen ? 'rotate-180' : ''} />
                          </button>

                          {isDropdownOpen && (
                            <div
                              onScroll={handleDropdownScroll}
                              className="absolute left-0 right-0 z-[100] mt-2 max-h-56 overflow-y-auto bg-white border-2 border-[#3C64A3]/10 shadow-2xl rounded-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
                            >
                              {/* OPCIÓN PARA DESMAPEAR INDIVIDUAL */}
                              {currentMap && (
                                <div
                                  onClick={() => {
                                    onUpdateMapping(activeEntity, selectedVar.label, item.val, "");
                                    setActiveDropdown(null);
                                  }}
                                  className="p-4 mb-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-xl cursor-pointer transition-all border border-dashed border-red-200 flex justify-between items-center group"
                                >
                                  <span className="text-[10px] font-black uppercase">Clear Assignment</span>
                                  <span>✖</span>
                                </div>
                              )}
                              {catalogData.map((opt, i) => {
                                const idValue = opt[keyCol] ?? Object.values(opt)[0];
                                const desc = Object.entries(opt).filter(([k]) => k !== keyCol).map(([, v]) => v).filter(v => v).join(' | ');
                                return (
                                  <div
                                    key={i}
                                    onClick={() => {
                                      onUpdateMapping(activeEntity, selectedVar.label, item.val, idValue);
                                      setActiveDropdown(null);
                                    }}
                                    className="p-4 hover:bg-[#3C64A3] hover:text-white rounded-xl cursor-pointer transition-all mb-1 group"
                                  >
                                    <div className="text-xs font-black uppercase">[{idValue}]</div>
                                    <div className="text-[9px] font-bold opacity-60 truncate group-hover:opacity-100">{desc}</div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                        <div className="w-8 flex justify-center">
                          {currentMap && <HiOutlineCheckCircle className="text-[#008C96]" size={28} />}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 italic opacity-50">
              <HiOutlineBookOpen size={100} />
              <p className="font-black uppercase text-xl mt-6">Select a Field</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}