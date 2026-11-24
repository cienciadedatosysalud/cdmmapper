import React, { useState, useEffect } from 'react';
import {
  HiOutlineFolderOpen, HiOutlineGlobeAlt, HiOutlineCloudArrowUp,
  HiOutlineCheckCircle, HiOutlineDocumentPlus, HiOutlineCpuChip,
  HiOutlineMagnifyingGlassCircle, HiOutlineDocumentText, HiOutlineCircleStack,
  HiOutlinePuzzlePiece, HiOutlineTableCells, HiOutlineRocketLaunch, 
  HiOutlineTrash, HiOutlineExclamationTriangle, HiOutlineArrowPath
} from 'react-icons/hi2';

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useTranslation } from 'react-i18next';

const MySwal = withReactContent(Swal);

export default function Level1Source({
  onMetadataUpdate,
  availableCatalogs,
  setAvailableCatalogs,
  initialSources = [],
  entitiesConfig = [],
  onFullReset
}) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [configMode, setConfigMode] = useState('local');
  const [hasPersistence, setHasPersistence] = useState(false);

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

  useEffect(() => {
    checkStorage();
  }, []);

  const checkStorage = async () => {
    try {
      const res = await fetch("/api/check-persistence");
      const data = await res.json();
      setHasPersistence(data.exists);
    } catch (err) {
      console.error("Error checking persistence:", err);
    }
  };

  const handleFolderTrigger = async () => {
    if (entitiesConfig.length > 0) {
      const result = await MySwal.fire({
        title: t('l1.swal.overwrite_title'),
        text: t('l1.swal.overwrite_text'),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t('common.confirm_reset'),
        cancelButtonText: t('common.cancel'),
        ...swalConfig
      });
      if (!result.isConfirmed) return;
    }

    const result = await MySwal.fire({
      title: t('l1.swal.folder_info_title'),
      html: `
      <div class="text-left space-y-3">
        <p class="text-sm text-slate-600">${t('l1.swal.folder_info_p1')}</p>
        <ul class="text-[11px] text-slate-500 list-disc ml-5 space-y-1">
          <li>${t('l1.swal.folder_info_li1')}</li>
          <li>${t('l1.swal.folder_info_li2')}</li>
        </ul>
      </div>
    `,
      icon: 'info',
      showCancelButton: true,
      confirmButtonText: t('l1.swal.folder_btn'),
      cancelButtonText: t('common.cancel'),
      ...swalConfig
    });

    if (result.isConfirmed) {
      MySwal.close();
      setTimeout(() => {
        const input = document.getElementById('folder-upload-input');
        if (input) input.click();
      }, 150);
    }
  };

  const handleUploadSources = async (fileList) => {
    if (fileList.length === 0) return;
    setLoading(true);
    const newSources = [];
    try {
      for (const file of fileList) {
        if (file.name.endsWith('.csv') || file.name.endsWith('.txt')) {
          const formData = new FormData();
          formData.append("file", file);
          const res = await fetch("/api/ingest-single-source", { method: "POST", body: formData });
          const data = await res.json();
          newSources.push(data);
        }
      }
      onMetadataUpdate({ files: newSources });
      MySwal.fire({
        title: t('common.success'),
        text: t('l1.swal.sources_success', { count: newSources.length }),
        icon: 'success',
        timer: 2000,
        showConfirmButton: false,
        ...swalConfig
      });
    } catch (err) {
      MySwal.fire(t('common.error'), t('l1.swal.upload_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUploadModel = async (fileList) => {
    if (fileList.length === 0) return;
    const hasConfig = fileList.some(file => (file.webkitRelativePath || file.name).endsWith('cdmb_config.json'));

    if (!hasConfig) {
      return MySwal.fire({
        title: t('l1.swal.invalid_folder_title'),
        text: t('l1.swal.invalid_folder_text'),
        icon: 'warning',
        confirmButtonText: t('common.retry'),
        ...swalConfig
      });
    }

    setLoading(true);
    const newCatalogs = [];
    try {
      for (const file of fileList) {
        const path = file.webkitRelativePath || file.name;
        const formData = new FormData();
        formData.append("file", file);
        if (path.endsWith('cdmb_config.json')) {
          const res = await fetch("/api/ingest-config", { method: "POST", body: formData });
          const data = await res.json();
          onMetadataUpdate({ config: data.config });
        } else if (path.toLowerCase().includes('/catalogs/')) {
          const res = await fetch("/api/ingest-single-catalog", { method: "POST", body: formData });
          const data = await res.json();
          newCatalogs.push(data.catalog);
        }
      }
      if (newCatalogs.length > 0) setAvailableCatalogs(prev => [...new Set([...prev, ...newCatalogs])]);
      MySwal.fire({ title: t('common.success'), text: t('l1.swal.model_success'), icon: 'success', timer: 2000, showConfirmButton: false, ...swalConfig });
    } catch (err) {
      MySwal.fire(t('common.error'), t('l1.swal.upload_error'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in text-left">
      {hasPersistence && (
        <div className="bg-amber-50 border-2 border-dashed border-amber-200 rounded-[3rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6 animate-in slide-in-from-left-4 duration-500">
          <div className="flex items-center gap-5">
            <div className="bg-amber-100 p-4 rounded-2xl text-amber-600"><HiOutlineExclamationTriangle size={32} /></div>
            <div className="space-y-1">
              <h4 className="text-sm font-black uppercase tracking-widest text-amber-900">{t('l1.persistence.title')}</h4>
              <p className="text-[14px] text-amber-700 font-medium leading-relaxed max-w-2xl">{t('l1.persistence.subtitle')}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={checkStorage} className="p-4 bg-amber-100 text-amber-700 rounded-2xl hover:bg-amber-200 transition-colors"><HiOutlineArrowPath size={20} className={loading ? "animate-spin" : ""} /></button>
            <button onClick={onFullReset} className="flex items-center gap-3 bg-white border border-red-100 text-red-600 px-8 py-4 rounded-[1.5rem] font-black uppercase text-[10px] hover:bg-red-600 hover:text-white transition-all shadow-sm active:scale-95 group">
              <HiOutlineTrash size={18} className="group-hover:rotate-12 transition-transform" /> {t('l1.persistence.btn')}
            </button>
          </div>
        </div>
      )}

      <div className="mb-12 flex flex-col space-y-8 animate-in fade-in slide-in-from-top-4 duration-1000">
        <div className="bg-[#3C64A3]/5 border border-[#3C64A3]/10 p-10 rounded-[3rem] relative overflow-hidden">
          <div className="absolute -right-10 -top-10 opacity-5"><HiOutlineRocketLaunch size={200} className="text-[#3C64A3]" /></div>
          <div className="relative z-10 space-y-4">
            <h2 className="text-2xl font-black text-[#3C64A3]">{t('l1.header.title')}</h2>
            <p className="text-slate-700 text-lg font-medium leading-relaxed max-w-4xl">{t('l1.header.subtitle')}</p>
            <div className="flex gap-4 pt-2">
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
                <div className="w-2 h-2 bg-[#FED56D] rounded-full"></div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('l1.header.badge1')}</span>
              </div>
              <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-sm border border-slate-100">
                <div className="w-2 h-2 bg-[#008C96] rounded-full"></div>
                <span className="text-[10px] font-black uppercase text-slate-500 tracking-widest">{t('l1.header.badge2')}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="text-left space-y-4">
          <p className="text-slate-600 text-sm leading-relaxed px-2">{t('l1.header.intro')}</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white border border-slate-100 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all">
              <div className="w-12 h-12 bg-slate-50 rounded-2xl flex items-center justify-center mb-4 text-[#3C64A3]"><HiOutlineCircleStack size={24} /></div>
              <p className="text-[11px] font-black text-[#3C64A3] uppercase tracking-widest mb-3">{t('l1.cards.sources_title')}</p>
              <p className="text-[13px] text-slate-500 leading-relaxed">{t('l1.cards.sources_text')}</p>
            </div>
            <div className="bg-white border-2 border-[#FED56D]/30 p-8 rounded-[2.5rem] shadow-sm hover:shadow-md transition-all relative">
              <div className="absolute top-6 right-8"><span className="px-3 py-1 bg-[#FED56D] text-[#1D1D1B] text-[9px] font-black uppercase rounded-lg">{t('common.required')}</span></div>
              <div className="w-12 h-12 bg-[#FED56D]/10 rounded-2xl flex items-center justify-center mb-4 text-[#EEB141]"><HiOutlinePuzzlePiece size={24} /></div>
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest mb-3">{t('l1.cards.model_title')}</p>
              <p className="text-[13px] text-slate-500 leading-relaxed">{t('l1.cards.model_text_p1')} <a href="https://cienciadedatosysalud.github.io/cdmb-web/" target="_blank" className="text-[#3C64A3] font-bold underline decoration-[#FED56D]">{t('l1.cards.model_link')}</a>. {t('l1.cards.model_text_p2')}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
        <div className="space-y-4">
          <div className="flex items-center gap-3 px-2">
            <HiOutlineDocumentPlus className="text-blue-600 w-5 h-5" />
            <h3 className="text-xs font-black text-slate-800 uppercase italic">{t('l1.inputs.sources_label_main')}</h3>
          </div>
          <label className="flex flex-col items-center justify-center p-12 border-4 border-dashed border-slate-100 rounded-[3rem] bg-white hover:border-blue-500 transition-all cursor-pointer shadow-sm group h-[220px]">
            <HiOutlineCloudArrowUp className="w-12 h-12 text-blue-100 group-hover:text-blue-500 mb-4 transition-colors" />
            <span className="text-[10px] font-black uppercase text-slate-400">{t('l1.inputs.sources_btn')}</span>
            <input type="file" multiple accept=".csv,.txt" className="hidden" onChange={(e) => handleUploadSources(Array.from(e.target.files))} />
          </label>
        </div>

        <div className="space-y-4">
          <div className="flex items-center justify-between px-2">
            <div className="flex items-center gap-3"><HiOutlineCpuChip className="text-indigo-600 w-5 h-5" /><h3 className="text-xs font-black text-slate-800 uppercase italic">{t('l1.inputs.model_label_main')}</h3></div>
          </div>
          <div className="h-[220px]">
            <div onClick={handleFolderTrigger} className="flex flex-col items-center justify-center p-12 border-4 border-dashed border-slate-100 rounded-[3rem] bg-white hover:border-indigo-500 transition-all cursor-pointer shadow-sm group h-full">
              <HiOutlineFolderOpen className="w-12 h-12 text-indigo-100 group-hover:text-indigo-500 mb-4" />
              <span className="text-[10px] font-black uppercase text-slate-400">{t('l1.inputs.model_btn')}</span>
              <input id="folder-upload-input" type="file" webkitdirectory="true" className="hidden" onChange={(e) => handleUploadModel(Array.from(e.target.files))} onClick={(e) => e.target.value = null} />
            </div>
          </div>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-4 py-6 bg-blue-50 rounded-[2rem] animate-pulse">
          <HiOutlineMagnifyingGlassCircle className="w-6 h-6 text-blue-600 animate-spin" />
          <span className="text-xs font-black uppercase text-blue-600 italic tracking-widest">{t('l1.loading_msg')}</span>
        </div>
      )}

      {(initialSources.length > 0 || entitiesConfig.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          <div className="space-y-4">
            <div className="flex items-center justify-between px-2"><div className="flex items-center gap-2"><HiOutlineDocumentText className="text-blue-500 w-5 h-5" /><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('l1.tables.sources_title')}</h3></div></div>
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-widest font-black border-b border-slate-100">
                  <tr><th className="px-6 py-4">{t('l1.tables.col_file')}</th><th className="px-6 py-4">{t('l1.tables.col_rows')}</th><th className="px-6 py-4">{t('l1.tables.col_cols')}</th><th className="px-6 py-4 text-right pr-8">{t('l1.tables.col_status')}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {initialSources.map((s, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-6 py-4 font-mono font-bold text-slate-700 truncate max-w-[150px]">{s.name}</td>
                      <td className="px-6 py-4 font-bold text-slate-400">{s.rows.toLocaleString()}</td>
                      <td className="px-6 py-4"><span className="flex items-center gap-1.5 text-blue-600 font-black"><HiOutlineTableCells className="w-3.5 h-3.5" />{s.cols?.length || 0}</span></td>
                      <td className="px-6 py-4 text-right pr-8"><HiOutlineCheckCircle className="text-green-500 w-5 h-5 ml-auto" /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between px-2"><div className="flex items-center gap-2"><HiOutlineCircleStack className="text-indigo-600 w-5 h-5" /><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('l1.tables.entities_title')}</h3></div></div>
            <div className="bg-white rounded-[2rem] border border-slate-100 overflow-hidden shadow-sm">
              <table className="w-full text-left text-[11px]">
                <thead className="bg-slate-50 text-slate-400 uppercase tracking-widest font-black border-b border-slate-100">
                  <tr><th className="px-6 py-4">{t('l1.tables.col_entity')}</th><th className="px-6 py-4">{t('l1.tables.col_vars')}</th><th className="px-6 py-4 text-right pr-8">{t('l1.tables.col_cat_status')}</th></tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {entitiesConfig.map((e, idx) => {
                    const catalogVars = e.variables?.filter(v => v.catalog_bl) || [];
                    const hasCatalogs = catalogVars.length > 0;
                    const missingCatalogs = catalogVars.filter(v => v.catalog && !availableCatalogs.includes(v.catalog.filename));
                    const allLoaded = hasCatalogs && missingCatalogs.length === 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-6 py-5"><div className="flex flex-col"><span className="font-black text-slate-900 uppercase italic tracking-tight group-hover:text-blue-600 transition-colors">{e.name}</span><span className="text-[8px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">{t('l1.tables.entity_def')}</span></div></td>
                        <td className="px-6 py-5 font-bold text-slate-400"><div className="flex items-center gap-2"><span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md text-[10px]">{e.variables?.length || 0}</span><span className="text-[9px] uppercase">{t('l1.tables.vars')}</span></div></td>
                        <td className="px-6 py-5 text-right pr-8">
                          <div className="flex flex-col items-end gap-1.5">
                            {hasCatalogs ? (allLoaded ? (
                              <div className="flex items-center gap-2 bg-emerald-50 border border-emerald-100 px-3 py-1 rounded-full"><span className="text-[8px] font-black text-emerald-600 uppercase tracking-tighter">{catalogVars.length} {t('l1.tables.cat_linked')}</span><HiOutlineCheckCircle className="text-emerald-500 w-3.5 h-3.5" /></div>
                            ) : (
                              <div className="flex items-center gap-2 bg-blue-50 border border-blue-100 px-3 py-1 rounded-full"><span className="text-[8px] font-black text-blue-600 uppercase tracking-tighter">{missingCatalogs.length} {t('l1.tables.cat_pending')}</span><HiOutlinePuzzlePiece className="text-blue-400 w-3.5 h-3.5 animate-pulse" /></div>
                            )) : <span className="text-[9px] text-slate-300 font-bold uppercase tracking-widest">{t('l1.tables.no_vocabs')}</span>}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="flex items-center gap-2 pt-4"><HiOutlineCircleStack className="text-indigo-600 w-5 h-5" /><h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">{t('l1.tables.catalogs_title')}</h3></div>
            <div className="flex flex-wrap gap-3">
              {availableCatalogs.map(name => (
                <div key={name} className="flex items-center gap-3 bg-white border border-slate-100 px-4 py-2 rounded-xl shadow-sm">
                  <HiOutlineCircleStack className="text-blue-400 w-4 h-4" /><span className="text-[10px] font-mono font-bold text-slate-500 truncate max-w-[150px]">{name}</span><div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
