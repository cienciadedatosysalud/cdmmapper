import React, { useState, useEffect, useRef } from 'react';
import {
  HiOutlineArrowLongRight, HiOutlineCheckCircle,
  HiOutlineMagnifyingGlass, HiOutlineBookOpen,
  HiOutlineVariable, HiOutlineChevronDown, HiOutlineSparkles,
  HiOutlineExclamationTriangle, HiOutlineTrash
} from 'react-icons/hi2';

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useTranslation } from 'react-i18next';

const MySwal = withReactContent(Swal);

export default function Level4ValueMapper({
  activeEntity,
  entitiesConfig = [],
  mappedColumnsByEntity = {},
  valueMappings = {},
  emptyValueColumnsByEntity = {},
  onSourceValuesStatusChange,
  onUpdateMapping,
  onClearAll
}) {
  const { t } = useTranslation();
  const [selectedVar, setSelectedVar] = useState(null);
  const [uniqueValues, setUniqueValues] = useState([]);
  const [sourceValuesLoaded, setSourceValuesLoaded] = useState(false);
  const [catalogData, setCatalogData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [activeDropdown, setActiveDropdown] = useState(null);
  const [isAutoMapping, setIsAutoMapping] = useState(false);

  const currentEntityDef = entitiesConfig.find(e => e.name === activeEntity);
  const variablesWithCatalog = currentEntityDef?.variables.filter(v => v.catalog_bl) || [];
  const catalogFields = variablesWithCatalog.filter(v => v.catalog?.filename && v.catalog?.column_name);

  const swalConfig = {
    confirmButtonColor: '#3C64A3',
    cancelButtonColor: '#94A3B8',
    customClass: {
      popup: 'rounded-[2rem] border-none shadow-2xl font-sans text-left',
      title: 'text-slate-900 font-black uppercase tracking-tight text-left',
      confirmButton: 'rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest',
      cancelButton: 'rounded-xl px-6 py-3 text-xs font-bold uppercase tracking-widest'
    }
  };

  // Reset al cambiar de variable o buscar
  useEffect(() => {
    setCatalogData([]);
    setPage(0);
    setHasMore(true);
  }, [selectedVar, searchTerm]);

  // Carga valores únicos del ORIGEN (CSV)
  useEffect(() => {
    if (!selectedVar) return;
    let isCurrent = true;
    const loadSource = async () => {
      setLoading(true);
      setSourceValuesLoaded(false);
      setUniqueValues([]);
      try {
        const sourcePath = (mappedColumnsByEntity[activeEntity] || {})[selectedVar.label];
        if (!sourcePath) {
          onSourceValuesStatusChange(activeEntity, selectedVar.label, false);
          return;
        }

        const lastIdx = sourcePath.lastIndexOf('.');
        const f = sourcePath.substring(0, lastIdx);
        const c = sourcePath.substring(lastIdx + 1);
        const res = await fetch(`/api/values/${encodeURIComponent(f)}/${encodeURIComponent(c)}`);
        if (!res.ok) throw new Error(`Source values request failed: ${res.status}`);
        const data = await res.json();
        if (!Array.isArray(data)) throw new Error("Source values response is invalid");
        if (isCurrent) {
          setUniqueValues(data);
          setSourceValuesLoaded(true);
          onSourceValuesStatusChange(activeEntity, selectedVar.label, data.length === 0);
        }
      } catch (e) {
        if (isCurrent) {
          console.error("Error Source:", e);
          setUniqueValues([]);
        }
      } finally {
        if (isCurrent) setLoading(false);
      }
    };
    loadSource();
    return () => { isCurrent = false; };
  }, [selectedVar, activeEntity, mappedColumnsByEntity, onSourceValuesStatusChange]);

  // Carga valores del CATÁLOGO (Paginado)
  useEffect(() => {
    if (!selectedVar || !selectedVar.catalog) return;
    const fetchCatalog = async () => {
      const { filename, column_name } = selectedVar.catalog;
      try {
        const url = `/api/catalog-distinct-values/${encodeURIComponent(filename)}/${encodeURIComponent(column_name)}?page=${page}&search=${encodeURIComponent(searchTerm)}`;
        const res = await fetch(url);
        const newData = await res.json();
        
        // Si el servidor devuelve menos del tamaño de página (ej. 50), ya no hay más
        if (newData.length < 50) setHasMore(false);
        
        setCatalogData(prev => (page === 0 ? newData : [...prev, ...newData]));
      } catch (e) { console.error("Error Catalog:", e); }
    };
    const timer = setTimeout(fetchCatalog, 250);
    return () => clearTimeout(timer);
  }, [selectedVar, page, searchTerm]);

  // LÓGICA DE SCROLL INFINITO (RESTAURADA)
  const handleDropdownScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    // Si estamos a menos de 10px del final y hay más datos, cargamos la siguiente página
    if (scrollHeight - scrollTop <= clientHeight + 10 && hasMore && !loading) {
      setPage(prev => prev + 1);
    }
  };

  const handleAutoMap = async () => {
    if (!selectedVar || !selectedVar.catalog) return;
    const sourcePath = (mappedColumnsByEntity[activeEntity] || {})[selectedVar.label];
    if (!sourcePath) {
      MySwal.fire({
        title: t('l4.swal.no_source_title'),
        text: t('l4.swal.no_source_text'),
        icon: 'warning',
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
        MySwal.fire({ title: t('l4.swal.no_match_title'), text: t('l4.swal.no_match_text'), icon: 'info', confirmButtonText: t('common.understood'), ...swalConfig });
      } else {
        entries.forEach(([srcVal, targetVal]) => {
          onUpdateMapping(activeEntity, selectedVar.label, srcVal, targetVal);
        });
        MySwal.fire({ title: t('l4.swal.auto_success_title'), text: t('l4.swal.auto_success_text', { count: entries.length }), icon: 'success', timer: 2000, showConfirmButton: false, ...swalConfig });
      }
    } catch (e) { console.error("Auto-map error:", e); } finally { setIsAutoMapping(false); }
  };

  const handleAutoMapAll = async () => {
    const sourceMappings = mappedColumnsByEntity[activeEntity] || {};
    const fieldsToMap = catalogFields.filter(v => sourceMappings[v.label]);
    const skippedFields = catalogFields.length - fieldsToMap.length;

    if (fieldsToMap.length === 0) {
      MySwal.fire({
        title: t('l4.swal.no_source_title'),
        text: t('l4.swal.no_source_text'),
        icon: 'warning',
        ...swalConfig
      });
      return;
    }

    setIsAutoMapping(true);
    let mappedValueCount = 0;
    let mappedFieldCount = 0;
    let emptyFieldCount = 0;
    let unmatchedFieldCount = 0;
    const failedFields = [];

    try {
      for (const variable of fieldsToMap) {
        const sourcePath = sourceMappings[variable.label];
        const lastIdx = sourcePath.lastIndexOf('.');
        const sourceFile = sourcePath.substring(0, lastIdx);
        const sourceCol = sourcePath.substring(lastIdx + 1);

        try {
          const sourceResponse = await fetch(`/api/values/${encodeURIComponent(sourceFile)}/${encodeURIComponent(sourceCol)}`);
          if (!sourceResponse.ok) throw new Error(`Source values request failed: ${sourceResponse.status}`);
          const sourceValues = await sourceResponse.json();
          if (!Array.isArray(sourceValues)) throw new Error("Source values response is invalid");

          if (sourceValues.length === 0) {
            onSourceValuesStatusChange(activeEntity, variable.label, true);
            emptyFieldCount++;
            continue;
          }

          onSourceValuesStatusChange(activeEntity, variable.label, false);
          const response = await fetch('/api/auto-map-values', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              source_file: sourceFile,
              source_col: sourceCol,
              catalog_file: variable.catalog.filename,
              catalog_col: variable.catalog.column_name
            })
          });
          if (!response.ok) throw new Error(`Auto-map request failed: ${response.status}`);
          const matches = await response.json();
          if (!matches || typeof matches !== 'object' || Array.isArray(matches)) {
            throw new Error("Auto-map response is invalid");
          }

          const entries = Object.entries(matches);
          if (entries.length === 0) {
            unmatchedFieldCount++;
            continue;
          }

          entries.forEach(([sourceValue, targetValue]) => {
            onUpdateMapping(activeEntity, variable.label, sourceValue, targetValue);
          });
          mappedFieldCount++;
          mappedValueCount += entries.length;
        } catch (error) {
          console.error(`Auto-map failed for ${variable.label}:`, error);
          failedFields.push(variable.label);
        }
      }

      const summary = t('l4.swal.auto_all_summary', {
        values: mappedValueCount,
        fields: mappedFieldCount,
        empty: emptyFieldCount,
        unmatched: unmatchedFieldCount,
        skipped: skippedFields
      });
      const failureDetails = failedFields.length > 0
        ? ` ${t('l4.swal.auto_all_failed_fields', { fields: failedFields.join(', ') })}`
        : '';
      MySwal.fire({
        title: failedFields.length > 0 ? t('l4.swal.auto_all_warning_title') : t('l4.swal.auto_success_title'),
        text: `${summary}${failureDetails}`,
        icon: failedFields.length > 0 ? 'warning' : 'success',
        confirmButtonText: t('common.understood'),
        ...swalConfig
      });
    } finally {
      setIsAutoMapping(false);
    }
  };

  const handleResetVariable = async () => {
    if (!selectedVar) return;
    const result = await MySwal.fire({
      title: t('l4.swal.reset_title'),
      text: t('l4.swal.reset_text', { var: selectedVar.label }),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('common.confirm_reset'),
      cancelButtonText: t('common.cancel'),
      ...swalConfig
    });

    if (result.isConfirmed) {
      uniqueValues.forEach(v => {
        onUpdateMapping(activeEntity, selectedVar.label, v.val, "");
      });
    }
  };

  const getProgress = () => {
    if (!selectedVar) return { pending: 0, percent: 0 };
    if (sourceValuesLoaded && uniqueValues.length === 0) return { pending: 0, percent: 100 };
    if (uniqueValues.length === 0) return { pending: 0, percent: 0 };
    const mappedValues = valueMappings[activeEntity]?.[selectedVar.label] || {};
    const mappedCount = uniqueValues.filter(v => mappedValues[v.val]).length;
    return { pending: uniqueValues.length - mappedCount, percent: Math.round((mappedCount / uniqueValues.length) * 100) };
  };
  const { pending, percent } = getProgress();

  return (
    <div className="flex flex-col h-[1050px] overflow-hidden text-[#1D1D1B] text-left">
      <div className="mb-10 flex flex-col space-y-6">
        <div className="text-left space-y-4 max-w-6xl">
          <p className="font-black text-[#3C64A3] text-[12px] uppercase tracking-[0.2em] mb-2 px-2">{t('l4.header.tag')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-slate-50 border-l-4 border-[#3C64A3] p-6 rounded-r-[2.5rem] shadow-sm">
              <p className="text-[12px] text-slate-600 leading-relaxed italic">{t('l4.header.description')}</p>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              onClick={handleAutoMapAll}
              disabled={isAutoMapping || catalogFields.length === 0}
              className="bg-[#3C64A3] hover:bg-[#2A4A7A] disabled:opacity-40 text-white px-6 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 shadow-lg transition-all"
            >
              <HiOutlineSparkles size={18} className={isAutoMapping ? 'animate-spin' : ''} />
              {t('l4.panel.btn_automap_all')}
            </button>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        <div className="w-1/3 border-r border-slate-200 p-6 overflow-y-auto bg-white/40 text-left">
          <h3 className="text-[10px] font-black uppercase text-[#3C64A3] mb-6 opacity-60 tracking-widest">{t('l4.sidebar.title')}</h3>
          <div className="space-y-3">
            {variablesWithCatalog.map(v => {
              const isSelected = selectedVar?.label === v.label;
              const isMappedInLevel3 = mappedColumnsByEntity[activeEntity]?.[v.label];
              const hasOrphanValues = valueMappings[activeEntity]?.[v.label] && !isMappedInLevel3;
              const isMappedEmpty = emptyValueColumnsByEntity[activeEntity]?.includes(v.label);
              return (
                <button
                  key={v.label}
                  onClick={() => setSelectedVar(v)}
                  disabled={!isMappedInLevel3}
                  className={`w-full text-left p-5 rounded-[2rem] transition-all border-2 flex justify-between items-center relative ${isSelected ? 'bg-white border-[#3C64A3] text-[#3C64A3] shadow-md' : 'bg-transparent border-transparent text-slate-500'} ${!isMappedInLevel3 ? 'opacity-30' : 'hover:border-slate-200'}`}
                >
                  <div className="truncate pr-2">
                    <div className="flex items-center gap-2">
                      <div className="font-black text-[11px] uppercase truncate">{v.label}</div>
                      {hasOrphanValues && <HiOutlineExclamationTriangle className="text-red-500 animate-pulse" size={14} />}
                    </div>
                    <div className="text-[8px] font-bold opacity-50 uppercase">{isMappedInLevel3 ? v.catalog?.filename : t('l4.sidebar.no_source')}</div>
                  </div>
                  {isMappedInLevel3 && (
                    <div className="flex flex-col items-end gap-1">
                      <div className={`w-2 h-2 rounded-full ${isSelected ? 'bg-[#008C96]' : 'bg-slate-200'}`} />
                      {(valueMappings[activeEntity]?.[v.label] || isMappedEmpty) && <span className="text-[7px] font-black text-[#008C96]">{t('l4.sidebar.mapped_badge')}</span>}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        <div className="flex-1 p-8 overflow-y-auto bg-white relative text-left">
          {selectedVar ? (
            <div className="max-w-4xl mx-auto space-y-6">
              <div className="bg-[#3C64A3]/5 border border-[#3C64A3]/10 p-5 rounded-[2.5rem] flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className={`px-4 py-2 rounded-xl font-black text-[10px] ${pending > 0 ? 'bg-[#FED56D]' : 'bg-[#008C96] text-white'}`}>
                    {pending} {t('l4.panel.pending')}
                  </div>
                  <div className="text-sm font-black text-[#3C64A3]">{percent}% {t('l4.panel.complete')}</div>
                </div>
                <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                  <div className="h-full bg-[#008C96] transition-all" style={{ width: `${percent}%` }} />
                </div>
              </div>

              <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-sm pb-3 flex gap-3">
                <div className="flex-1 flex items-center gap-4 bg-white border-2 border-[#3C64A3]/10 p-4 rounded-2xl focus-within:border-[#3C64A3] transition-all">
                  <HiOutlineMagnifyingGlass className="text-[#3C64A3]" size={20} />
                  <input
                    className="bg-transparent w-full text-sm font-black uppercase outline-none"
                    placeholder={t('l4.panel.search_placeholder')}
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
                  {t('l4.panel.btn_automap')}
                </button>
                <button onClick={handleResetVariable} className="bg-red-50 hover:bg-red-500 hover:text-white text-red-600 px-6 py-4 rounded-2xl font-black uppercase text-[10px] flex items-center gap-2 transition-all border border-red-100">
                  <HiOutlineTrash size={18} /> {t('common.reset')}
                </button>
              </div>

              {loading && page === 0 ? (
                <div className="py-20 text-center animate-pulse text-[#3C64A3] font-black uppercase text-sm">{t('common.loading')}</div>
              ) : (
                <div className="space-y-4">
                  {sourceValuesLoaded && uniqueValues.length === 0 && (
                    <div className="rounded-2xl bg-emerald-50 p-6 text-center text-sm font-bold text-emerald-700">
                      {t('l4.panel.no_source_values')}
                    </div>
                  )}
                  {uniqueValues.map((item, idx) => {
                    const currentMap = valueMappings[activeEntity]?.[selectedVar.label]?.[item.val] || "";
                    const isDropdownOpen = activeDropdown === idx;
                    const keyCol = selectedVar.catalog?.column_name;

                    return (
                      <div key={idx} className="flex items-center gap-6 bg-slate-50/50 p-6 rounded-[2.5rem] border border-slate-100 transition-all text-left">
                        <div className="w-1/3">
                          <div className="text-[9px] font-black text-[#3C64A3] uppercase opacity-50 mb-1">{t('l4.panel.source_val')}</div>
                          <div className="text-base font-mono font-black text-[#1D1D1B] truncate">{item.val === null ? "NULL" : item.val}</div>
                          <div className="text-[10px] font-bold text-slate-400">{t('l4.panel.freq')}: {item.freq?.toLocaleString()}</div>
                        </div>
                        <HiOutlineArrowLongRight className="text-slate-200" size={24} />
                        <div className="flex-1 relative">
                          <button
                            onClick={() => setActiveDropdown(isDropdownOpen ? null : idx)}
                            className={`w-full flex justify-between items-center px-6 py-4 rounded-2xl border-2 text-[11px] font-black uppercase transition-all ${currentMap ? 'border-[#008C96] bg-[#008C96]/5 text-[#008C96]' : 'border-slate-100 bg-white text-slate-400'}`}
                          >
                            <span className="truncate">{currentMap || t('l4.panel.select_code')}</span>
                            <HiOutlineChevronDown className={isDropdownOpen ? 'rotate-180' : ''} />
                          </button>

                          {isDropdownOpen && (
                            <div
                              onScroll={handleDropdownScroll}
                              className="absolute left-0 right-0 z-[100] mt-2 max-h-56 overflow-y-auto bg-white border-2 border-[#3C64A3]/10 shadow-2xl rounded-2xl p-2 animate-in fade-in zoom-in-95 duration-200"
                            >
                              {currentMap && (
                                <div onClick={() => { onUpdateMapping(activeEntity, selectedVar.label, item.val, ""); setActiveDropdown(null); }} className="p-4 mb-2 bg-red-50 hover:bg-red-500 hover:text-white text-red-600 rounded-xl cursor-pointer transition-all border border-dashed border-red-200 flex justify-between items-center group">
                                  <span className="text-[10px] font-black uppercase">{t('l4.panel.clear_assignment')}</span>
                                  <span>✖</span>
                                </div>
                              )}
                              {catalogData.map((opt, i) => {
                                const idValue = opt[keyCol] ?? Object.values(opt)[0];
                                const desc = Object.entries(opt).filter(([k]) => k !== keyCol).map(([, v]) => v).filter(v => v).join(' | ');
                                return (
                                  <div key={i} onClick={() => { onUpdateMapping(activeEntity, selectedVar.label, item.val, idValue); setActiveDropdown(null); }} className="p-4 hover:bg-[#3C64A3] hover:text-white rounded-xl cursor-pointer transition-all mb-1 group text-left">
                                    <div className="text-xs font-black uppercase">[{idValue}]</div>
                                    <div className="text-[9px] font-bold opacity-60 truncate group-hover:opacity-100">{desc}</div>
                                  </div>
                                );
                              })}
                              {hasMore && (
                                <div className="p-4 text-center text-[10px] font-black uppercase text-slate-300 animate-pulse italic">
                                  {t('common.loading_more')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                        <div className="w-8 flex justify-center">{currentMap && <HiOutlineCheckCircle className="text-[#008C96]" size={28} />}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-slate-200 italic opacity-50">
              <HiOutlineBookOpen size={100} />
              <p className="font-black uppercase text-xl mt-6">{t('l4.panel.select_field')}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}