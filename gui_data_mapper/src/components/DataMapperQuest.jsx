import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  HiOutlineArchiveBox,
  HiOutlineCloudArrowUp,
  HiOutlinePuzzlePiece,
  HiOutlineTrash,
  HiOutlineSquares2X2,
  HiOutlineVariable,
  HiOutlineRocketLaunch,
  HiChevronRight,
  HiOutlineCpuChip,
} from 'react-icons/hi2';
import { FaGithub } from 'react-icons/fa';

// i18n
import '../i18n';
import { useTranslation } from 'react-i18next';

// Subcomponents
import Level1Source from './Level1Source';
import Level2Sorting from './Level2Sorting';
import Level3Puzzle from './Level3Puzzle';
import Level4ValueMapper from './Level4ValueMapper';
import Level5Exporter from './Level5Exporter';
import Level6Delivery from './Level6Delivery';
import JoinModal from './JoinModal';

import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

const MySwal = withReactContent(Swal);

export default function DataMapperQuest() {
  const { t, i18n } = useTranslation();

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

  const refs = {
    source: useRef(null),
    sorting: useRef(null),
    puzzle: useRef(null),
    semantic: useRef(null),
    alchemy: useRef(null),
    delivery: useRef(null)
  };

  // --- ESTADOS DE UI ---
  const [activeNav, setActiveNav] = useState('source');
  const [lastSaved, setLastSaved] = useState(null);
  const [isSessionRestored, setIsSessionRestored] = useState(false);
  const [configuringEntity, setConfiguringEntity] = useState(null);
  const [systemData, setSystemData] = useState({
    percentage: 0, total_gb: 0, used_gb: 0, text: '...', status: 'loading'
  });

  // --- ESTADOS DE LÓGICA DE DATOS ---
  const [unmappedFiles, setUnmappedFiles] = useState([]);
  const [sourcesSummary, setSourcesSummary] = useState([]);
  const [fileColumnsMock, setFileColumnsMock] = useState({});
  const [availableCatalogs, setAvailableCatalogs] = useState([]);
  const [entitiesConfig, setEntitiesConfig] = useState([]);
  const [targetEntities, setTargetEntities] = useState([]);
  const [targetColumnsByEntity, setTargetColumnsByEntity] = useState({});
  const [mappedEntities, setMappedEntities] = useState({});
  const [activeEntity, setActiveEntity] = useState(null);
  const [mappedColumnsByEntity, setMappedColumnsByEntity] = useState({});
  const [valueMappings, setValueMappings] = useState({});
  const [emptyValueColumnsByEntity, setEmptyValueColumnsByEntity] = useState({});
  const [dateFormats, setDateFormats] = useState({});
  const [joinsConfigured, setJoinsConfigured] = useState({});
  const [queriesByEntity, setQueriesByEntity] = useState({});
  const [isLoading, setIsLoading] = useState(false);

  // =========================================================================
  // NAVEGACIÓN E IDIOMA
  // =========================================================================

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
  };

  const handleNavClick = (id, ref) => {
    setActiveNav(id);
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleResetWorkspace = async () => {
    const result = await MySwal.fire({
      title: t('quest.swal.reset_title'),
      text: t('quest.swal.reset_text'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('quest.swal.confirm'),
      cancelButtonText: t('quest.swal.cancel'),
      ...swalConfig
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        localStorage.removeItem('datamapper_session_v6');
        localStorage.clear();
        const res = await fetch("/api/reset", { method: "POST" });
        await MySwal.fire({
          title: t('quest.swal.done_title'),
          text: t('quest.swal.done_text'),
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          ...swalConfig
        });
        window.location.reload();
      } catch (e) {
        MySwal.fire(t('quest.swal.error_title'), t('quest.swal.error_text'), 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const options = { root: null, rootMargin: '-15% 0px -75% 0px', threshold: 0 };
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section-id');
          setActiveNav(sectionId);
        }
      });
    }, options);
    Object.values(refs).forEach(ref => { if (ref.current) observer.observe(ref.current); });
    return () => observer.disconnect();
  }, []);

  // =========================================================================
  // PERSISTENCIA & LÓGICA DE NEGOCIO
  // =========================================================================

  const handleSaveJoin = (entity, joinData) => {
    setJoinsConfigured(prev => ({ ...prev, [entity]: joinData }));
  };

  const handleEntityChange = useCallback((newEntity) => {
    setActiveEntity(newEntity);
  }, []);

  const handleSourceValuesStatusChange = useCallback((entity, field, isEmpty) => {
    setEmptyValueColumnsByEntity(prev => {
      const fields = new Set(prev[entity] || []);
      if (isEmpty) fields.add(field);
      else fields.delete(field);

      const updated = { ...prev };
      if (fields.size > 0) updated[entity] = Array.from(fields);
      else delete updated[entity];
      return updated;
    });
  }, []);

  const handleUpdateDateFormat = (entity, field, format) => {
    setDateFormats(prev => ({
      ...prev,
      [entity]: { ...(prev[entity] || {}), [field]: format }
    }));
  };

  useEffect(() => {
    const saved = localStorage.getItem('datamapper_session_v6');
    if (saved) {
      try {
        const p = JSON.parse(saved);
        if (p.unmappedFiles) setUnmappedFiles(p.unmappedFiles);
        if (p.sourcesSummary) setSourcesSummary(p.sourcesSummary);
        if (p.entitiesConfig) {
          setEntitiesConfig(p.entitiesConfig);
          setTargetEntities(p.entitiesConfig.map(e => e.name));
          if (!p.activeEntity && p.entitiesConfig.length > 0) {
            setActiveEntity(p.entitiesConfig[0].name);
          }
        }
        if (p.mappedEntities) setMappedEntities(p.mappedEntities);
        if (p.mappedColumnsByEntity) setMappedColumnsByEntity(p.mappedColumnsByEntity);
        if (p.valueMappings) setValueMappings(p.valueMappings);
        if (p.emptyValueColumnsByEntity) setEmptyValueColumnsByEntity(p.emptyValueColumnsByEntity);
        if (p.dateFormats) setDateFormats(p.dateFormats);
        if (p.availableCatalogs) setAvailableCatalogs(p.availableCatalogs);
        if (p.fileColumnsMock) setFileColumnsMock(p.fileColumnsMock);
        if (p.targetColumnsByEntity) setTargetColumnsByEntity(p.targetColumnsByEntity);
        if (p.joinsConfigured) setJoinsConfigured(p.joinsConfigured);
        if (p.queriesByEntity) setQueriesByEntity(p.queriesByEntity);
        if (p.activeEntity) setActiveEntity(p.activeEntity);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (e) { console.error("Restore failed", e); }
    }
    setIsSessionRestored(true);
  }, []);

  useEffect(() => {
    if (!isSessionRestored) return;

    const timer = setTimeout(() => {
      const data = {
        unmappedFiles, sourcesSummary, entitiesConfig,
        mappedEntities, valueMappings, dateFormats,
        emptyValueColumnsByEntity,
        mappedColumnsByEntity, availableCatalogs, fileColumnsMock,
        targetColumnsByEntity, joinsConfigured, queriesByEntity, activeEntity
      };
      localStorage.setItem('datamapper_session_v6', JSON.stringify(data));
      setLastSaved(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearTimeout(timer);
  }, [
    isSessionRestored, unmappedFiles, sourcesSummary, entitiesConfig,
    mappedEntities, valueMappings, emptyValueColumnsByEntity, dateFormats, mappedColumnsByEntity,
    availableCatalogs, fileColumnsMock, targetColumnsByEntity,
    joinsConfigured, queriesByEntity, activeEntity
  ]);

  useEffect(() => {
    const fetchSystemStatus = async () => {
      try {
        const response = await fetch('/api/memoryusage');
        const data = await response.json();
        setSystemData({ ...data, status: 'online' });
      } catch (error) {
        setSystemData({ percentage: 0, total_gb: 0, used_gb: 0, text: 'Offline', status: 'error' });
      }
    };
    fetchSystemStatus();
    const interval = setInterval(fetchSystemStatus, 10000);
    return () => clearInterval(interval);
  }, []);

  const handleMetadataUpdate = ({ files, config }) => {
    if (files) {
      setSourcesSummary(prev => {
        const existingNames = prev.map(s => s.name);
        const newUnique = files.filter(f => !existingNames.includes(f.name));
        return [...prev, ...newUnique];
      });
      setUnmappedFiles(prev => [...new Set([...prev, ...files.map(f => f.name)])]);
      const newCols = {};
      files.forEach(f => newCols[f.name] = f.cols.map(c => c.name));
      setFileColumnsMock(prev => ({ ...prev, ...newCols }));
    }
    if (config && config.entities) {
      setEntitiesConfig(config.entities);
      setTargetEntities(config.entities.map(e => e.name));
      const tCols = {};
      const mEnts = { ...mappedEntities };
      config.entities.forEach(e => {
        tCols[e.name] = e.variables.map(v => v.label);
        if (!mEnts[e.name]) mEnts[e.name] = [];
      });
      setTargetColumnsByEntity(tCols);
      setMappedEntities(mEnts);
      console.log("=================")
      console.log(config.entities.length)
      console.log(activeEntity)
      console.log(!activeEntity)
      console.log("=================")
      if (config.entities.length > 0 && !activeEntity) setActiveEntity(config.entities[0].name);
    }
  };

  const handleSortingDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    let newUnmapped = [...unmappedFiles];
    let newMapped = { ...mappedEntities };

    if (source.droppableId === "backpack") {
      newUnmapped.splice(source.index, 1);
    } else {
      const sourceEnt = source.droppableId.replace("entity-", "");
      newMapped[sourceEnt] = (newMapped[sourceEnt] || []).filter(f => f !== draggableId);
    }

    if (destination.droppableId === "backpack") {
      newUnmapped.splice(destination.index, 0, draggableId);
    } else {
      const destEnt = destination.droppableId.replace("entity-", "");
      if (!newMapped[destEnt]) newMapped[destEnt] = [];
      if (!newMapped[destEnt].includes(draggableId)) newMapped[destEnt].push(draggableId);
    }

    const affectedEntities = [source.droppableId.replace("entity-", ""), destination.droppableId.replace("entity-", "")].filter(ent => ent !== "backpack");

    affectedEntities.forEach(ent => {
      const currentFiles = newMapped[ent] || [];
      if (currentFiles.length < 2) {
        setJoinsConfigured(prev => { const copy = { ...prev }; delete copy[ent]; return copy; });
      }
      setMappedColumnsByEntity(prevCols => {
        const entCols = prevCols[ent];
        if (!entCols) return prevCols;
        const newEntCols = { ...entCols };
        let changed = false;
        Object.keys(newEntCols).forEach(cdmLabel => {
          const mapping = newEntCols[cdmLabel];
          if (typeof mapping === 'string' && mapping.includes('.')) {
            const fileName = mapping.split('.').slice(0, -1).join('.');
            if (!currentFiles.includes(fileName)) { delete newEntCols[cdmLabel]; changed = true; }
          }
        });
        const updatedCols = changed ? { ...prevCols, [ent]: newEntCols } : prevCols;
        setValueMappings(prevVals => {
          const entVals = prevVals[ent];
          if (!entVals) return prevVals;
          const newEntVals = { ...entVals };
          let valsChanged = false;
          Object.keys(newEntVals).forEach(cdmLabel => { if (!newEntCols[cdmLabel]) { delete newEntVals[cdmLabel]; valsChanged = true; } });
          return valsChanged ? { ...prevVals, [ent]: newEntVals } : prevVals;
        });
        setDateFormats(prevDates => {
          const entDates = prevDates[ent];
          if (!entDates) return prevDates;
          const newEntDates = { ...entDates };
          let datesChanged = false;
          Object.keys(newEntDates).forEach(cdmLabel => { if (!newEntCols[cdmLabel]) { delete newEntDates[cdmLabel]; datesChanged = true; } });
          return datesChanged ? { ...prevDates, [ent]: newEntDates } : prevDates;
        });
        return updatedCols;
      });
    });
    setUnmappedFiles(newUnmapped);
    setMappedEntities(newMapped);
  };

  const getAvailableSourceColumns = () => {
    const filesForEntity = mappedEntities[activeEntity] || [];
    let allCols = [];
    filesForEntity.forEach(fileName => {
      const cols = fileColumnsMock[fileName] || [];
      allCols = [...allCols, ...cols.map(c => `${fileName}.${c}`)];
    });
    const alreadyUsed = Object.values(mappedColumnsByEntity[activeEntity] || {});
    return allCols.filter(col => !alreadyUsed.includes(col));
  };

  const handlePuzzleDragEnd = async (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    const entityMapping = { ...(mappedColumnsByEntity[activeEntity] || {}) };
    const targetField = destination.droppableId.replace("slot-", "");

    // --- LÓGICA ORIGINAL DE ARRASTRE ---
    if (destination.droppableId === "pieces-pool" && source.droppableId.startsWith("slot-")) {
      delete entityMapping[source.droppableId.replace("slot-", "")];
    }

    if (destination.droppableId.startsWith("slot-") && source.droppableId === "pieces-pool") {
      entityMapping[targetField] = draggableId;
    }

    // Actualizamos el estado de los mapeos
    setMappedColumnsByEntity(prev => ({ ...prev, [activeEntity]: entityMapping }));

    // --- NUEVA LÓGICA: AUTO-DETECCIÓN DE FECHA ---
    if (destination.droppableId.startsWith("slot-") && source.droppableId === "pieces-pool") {

      // 1. Buscamos si la variable destino en el CDM es de tipo fecha
      const currentEntityDef = entitiesConfig.find(e => e.name === activeEntity);
      const varDef = currentEntityDef?.variables.find(v => v.label === targetField);
      const isDateType = ['date', 'datetime'].includes(varDef?.format?.toLowerCase());

      // 2. Si es fecha, preguntamos al servidor por el formato
      if (isDateType) {
        try {
          // Extraemos archivo y columna (draggableId suele ser "archivo.csv.columna")
          const parts = draggableId.split('.');
          const colName = parts.pop();
          const fileName = parts.join('.');

          const response = await fetch('/api/detect-date-format', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ file: fileName, column: colName })
          });

          const data = await response.json();

          if (data.format) {
            // Guardamos el patrón (ej: %Y%m%d) en el estado de formatos de fecha
            handleUpdateDateFormat(activeEntity, targetField, data.format);

            // Feedback visual
            MySwal.fire({
              toast: true,
              position: 'top-end',
              icon: 'success',
              title: `✨ ${t('l3.date.detected')}: ${data.format}`,
              showConfirmButton: false,
              timer: 2500,
              timerProgressBar: true
            });
          }
        } catch (error) {
          console.error("Auto-date detection error:", error);
        }
      }
    }
  };

  const steps = [
    { id: 'source', name: t('quest.steps.step1'), icon: HiOutlineCloudArrowUp, ref: refs.source },
    { id: 'sorting', name: t('quest.steps.step2'), icon: HiOutlineSquares2X2, ref: refs.sorting },
    { id: 'puzzle', name: t('quest.steps.step3'), icon: HiOutlinePuzzlePiece, ref: refs.puzzle, perEntity: true },
    { id: 'semantic', name: t('quest.steps.step4'), icon: HiOutlineVariable, ref: refs.semantic, perEntity: true },
    { id: 'alchemy', name: t('quest.steps.step5'), icon: HiOutlineRocketLaunch, ref: refs.alchemy, perEntity: true },
    { id: 'delivery', name: t('quest.steps.step6'), icon: HiOutlineArchiveBox, ref: refs.delivery },
  ];

  const saveQueryForEntity = (entityName, sql) => {
    setQueriesByEntity(prev => ({ ...prev, [entityName]: sql }));
  };

  const handleDownloadBundle = async () => {
    const lang = i18n.language.split('-')[0] || 'en';
    if (Object.keys(queriesByEntity).length === 0) {
      return MySwal.fire({
        title: t('quest.delivery.no_logic_title'),
        text: t('quest.delivery.no_logic_text'),
        icon: 'info',
        ...swalConfig
      });
    }

    MySwal.fire({
      title: t('quest.delivery.generating_title'),
      html: `<div class="py-4"><p class="text-sm text-slate-500 mb-4">${t('quest.delivery.generating_text')}</p></div>`,
      allowOutsideClick: false,
      didOpen: () => { MySwal.showLoading(); },
      ...swalConfig
    });

    setIsLoading(true);
    try {
      const cleanQueries = Object.fromEntries(Object.entries(queriesByEntity).filter(([_, sql]) => sql && !sql.startsWith("--")));
      const response = await fetch("/api/export-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: cleanQueries, entities_config: entitiesConfig,
          mapped_entities: mappedEntities, mapped_columns: mappedColumnsByEntity,
          joins_configured: joinsConfigured, lang: lang
        })
      });
      if (!response.ok) throw new Error(t('quest.delivery.error_server'));
      const data = await response.json();
      if (data.download_url) {
        MySwal.close();
        const link = document.createElement('a');
        link.href = data.download_url;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        link.remove();
        MySwal.fire({ icon: 'success', title: t('quest.delivery.success_title'), toast: true, position: 'top-end', showConfirmButton: false, timer: 5000, timerProgressBar: true });
        setTimeout(async () => { try { await fetch("/api/clean-zips", { method: "DELETE" }); } catch (err) { } }, 15000);
      } else {
        throw new Error(data.detail || t('quest.delivery.error_failed'));
      }
    } catch (error) {
      MySwal.fire({ title: t('quest.delivery.error_title'), text: error.message, icon: 'error', ...swalConfig });
    } finally { setIsLoading(false); }
  };


  const detectDateFormatsForEntity = async (entityName, newMappings) => {
    const currentEntityDef = entitiesConfig.find(e => e.name === entityName);
    if (!currentEntityDef) return;

    // Filtramos solo las variables que son de tipo fecha y que acaban de ser mapeadas
    const dateVariables = currentEntityDef.variables.filter(v =>
      ['date', 'datetime'].includes(v.format?.toLowerCase()) && newMappings[v.label]
    );

    for (const v of dateVariables) {
      const draggableId = newMappings[v.label];
      const parts = draggableId.split('.');
      const colName = parts.pop();
      const fileName = parts.join('.');

      try {
        const response = await fetch('/api/detect-date-format', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ file: fileName, column: colName })
        });
        const data = await response.json();

        if (data.format) {
          // Actualizamos el formato en el estado
          handleUpdateDateFormat(entityName, v.label, data.format);
        }
      } catch (error) {
        console.error(`Error detectando fecha para ${v.label}:`, error);
      }
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans text-left">
      <aside className="w-[22rem] bg-slate-50 border-r border-slate-200 flex flex-col shadow-sm z-20 shrink-0 h-screen sticky top-0 overflow-hidden text-left">
        <div className="flex bg-slate-100 p-1.5 rounded-xl border border-slate-200 gap-1">
          {/* Botón Español */}
          <button
            onClick={() => changeLanguage('es')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-[9px] font-black rounded-lg transition-all ${i18n.language === 'es'
              ? 'bg-white text-[#3C64A3] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-400 hover:bg-slate-50'
              }`}
          >
            <img
              src="/es.png"
              alt="Spain"
              className={`w-4 h-3 object-cover rounded-sm shadow-sm ${i18n.language !== 'es' && 'grayscale opacity-70'}`}
            />
            <span>ES</span>
          </button>

          {/* Botón Inglés */}
          <button
            onClick={() => changeLanguage('en')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-1.5 text-[9px] font-black rounded-lg transition-all ${i18n.language === 'en'
              ? 'bg-white text-[#3C64A3] shadow-sm ring-1 ring-slate-200'
              : 'text-slate-400 hover:bg-slate-50'
              }`}
          >
            <img
              src="/gb.png"
              alt="UK"
              className={`w-4 h-3 object-cover rounded-sm shadow-sm ${i18n.language !== 'en' && 'grayscale opacity-70'}`}
            />
            <span>EN</span>
          </button>
        </div>
        <div className="p-8 pb-6 bg-white border-b border-slate-100 flex items-center justify-between">
          <div className="flex gap-3">
            <a href="https://cienciadedatosysalud.org/" target="_blank" className="p-2 bg-slate-50 border border-slate-200 rounded-xl transition-all shadow-sm group">
              <img src="/main_logo_small.png" className="w-30 h-30 object-contain group-hover:scale-110 transition-transform" />
            </a>
            <a href="https://github.com/cienciadedatosysalud" target="_blank" className="p-2 bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 rounded-xl transition-all shadow-sm group text-slate-400">
              <FaGithub className="w-30 h-30 group-hover:scale-110 transition-transform" />
            </a>
          </div>

        </div>

        <p className="px-6 pt-4 text-[9px] font-bold leading-relaxed text-slate-400">
          {t('quest.sidebar.entity_context')}
        </p>
        <nav className="flex-1 px-4 mt-2 overflow-y-auto custom-scrollbar">
          <ul className="space-y-2 py-2 text-left">
            {steps.map((step) => (
              <li key={step.id} className="flex items-center gap-2">
                <button
                  onClick={() => handleNavClick(step.id, step.ref)}
                  className={`flex min-w-0 flex-1 items-center gap-2 rounded-2xl p-2 transition-all duration-300 group ${activeNav === step.id ? 'bg-white shadow-md border-slate-200 ring-1 ring-slate-100' : 'hover:bg-white/60 border-transparent'}`}
                >
                  <div className={`w-9 h-9 shrink-0 rounded-xl flex items-center justify-center border transition-all duration-300 ${activeNav === step.id ? 'bg-[#3C64A3] text-white border-[#3C64A3]' : 'bg-white text-slate-400 border-slate-200'}`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`min-w-0 flex-1 text-[11px] font-bold uppercase tracking-wide ${activeNav === step.id ? 'text-slate-900' : 'text-slate-500'}`}>{step.name}</span>
                  {activeNav === step.id && <HiChevronRight className="shrink-0 text-[#FED56D] w-4 h-4" />}
                </button>
                {step.perEntity && (
                  <select
                    aria-label={`${t('quest.steps.entity_label')} - ${step.name}`}
                    value={activeEntity || ''}
                    onChange={(event) => handleEntityChange(event.target.value)}
                    disabled={targetEntities.length === 0}
                    className="w-28 shrink-0 rounded-lg border border-[#3C64A3]/20 bg-white px-2 py-2 text-[9px] font-black text-[#3C64A3] outline-none focus:border-[#3C64A3] disabled:opacity-50"
                  >
                    <option value="" disabled>{t('quest.sidebar.select_entity')}</option>
                    {targetEntities.map(entity => <option key={entity} value={entity}>{entity}</option>)}
                  </select>
                )}
              </li>
            ))}
          </ul>
        </nav>

        <div className="p-7 bg-white border-t border-slate-200 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-400 text-left">
                <HiOutlineCpuChip className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">{t('quest.sidebar.memory')}</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-900">{systemData.used_gb} / {systemData.total_gb} GB</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
              <div className={`h-full transition-all duration-1000 ease-out ${systemData.percentage > 85 ? 'bg-red-500' : 'bg-[#3C64A3]'}`} style={{ width: `${systemData.percentage}%` }}></div>
            </div>
          </div>
          <button onClick={handleResetWorkspace} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all">
            <HiOutlineTrash className="w-4 h-4" /> {t('quest.sidebar.reset')}
          </button>
        </div>
      </aside>

      <main className="flex-1 overflow-y-auto scroll-smooth p-12 space-y-16 bg-[#F8FAFC]">
        <section ref={refs.source} data-section-id="source" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6"><h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest text-left">{t('quest.steps.step1_title')}</h3></div>
          <div className="p-10"><Level1Source onMetadataUpdate={handleMetadataUpdate} initialSources={sourcesSummary} entitiesConfig={entitiesConfig} availableCatalogs={availableCatalogs} setAvailableCatalogs={setAvailableCatalogs} onFullReset={handleResetWorkspace} /></div>
        </section>

        <section ref={refs.sorting} data-section-id="sorting" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 text-left"><h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">{t('quest.steps.step2_title')}</h3></div>
          <div className="p-10"><Level2Sorting unmappedFiles={unmappedFiles} mappedEntities={mappedEntities} targetEntities={targetEntities} onDragEnd={handleSortingDragEnd} onConfigureLink={setConfiguringEntity} /></div>
        </section>

        <section ref={refs.puzzle} data-section-id="puzzle" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">{t('quest.steps.step3_title')}</h3>
            <div className="flex items-center gap-2 rounded-xl border border-[#3C64A3]/15 bg-[#3C64A3]/5 px-4 py-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('quest.steps.entity_label')}</span>
              <span className="text-xs font-black text-[#3C64A3]">{activeEntity || t('quest.sidebar.select_entity')}</span>
            </div>
          </div>
          <div className="p-10"><Level3Puzzle activeEntity={activeEntity} entitiesConfig={entitiesConfig} sourceColumns={getAvailableSourceColumns()} mappedColumns={mappedColumnsByEntity[activeEntity] || {}} dateFormats={dateFormats[activeEntity] || {}} onUpdateDateFormat={(field, format) => handleUpdateDateFormat(activeEntity, field, format)} onDragEnd={handlePuzzleDragEnd} onRemoveMapping={(field) => { const mapping = { ...mappedColumnsByEntity[activeEntity] }; delete mapping[field]; setMappedColumnsByEntity(prev => ({ ...prev, [activeEntity]: mapping })); if (dateFormats[activeEntity]?.[field]) { const newDates = { ...dateFormats[activeEntity] }; delete newDates[field]; setDateFormats(prev => ({ ...prev, [activeEntity]: newDates })); } }} onUpdateFullMapping={(entity, newMappings) => setMappedColumnsByEntity(prev => ({ ...prev, [entity]: newMappings }))} onDetectDateFormats = {detectDateFormatsForEntity}/></div>
        </section>

        <section ref={refs.semantic} data-section-id="semantic" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">{t('quest.steps.step4_title')}</h3>
            <div className="flex items-center gap-2 rounded-xl border border-[#3C64A3]/15 bg-[#3C64A3]/5 px-4 py-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('quest.steps.entity_label')}</span>
              <span className="text-xs font-black text-[#3C64A3]">{activeEntity || t('quest.sidebar.select_entity')}</span>
            </div>
          </div>
          <div className="p-10"><Level4ValueMapper activeEntity={activeEntity} entitiesConfig={entitiesConfig} mappedColumnsByEntity={mappedColumnsByEntity} valueMappings={valueMappings} emptyValueColumnsByEntity={emptyValueColumnsByEntity} onSourceValuesStatusChange={handleSourceValuesStatusChange} onUpdateMapping={(ent, field, src, tgt) => { setValueMappings(prev => ({ ...prev, [ent]: { ...prev[ent], [field]: { ...(prev[ent]?.[field] || {}), [src]: tgt } } })); }} onClearAll={(ent) => { const newMappings = { ...valueMappings }; delete newMappings[ent]; setValueMappings(newMappings); }} /></div>
        </section>

        <section ref={refs.alchemy} data-section-id="alchemy" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 flex flex-wrap items-center justify-between gap-4">
            <h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">{t('quest.steps.step5_title')}</h3>
            <div className="flex items-center gap-2 rounded-xl border border-[#3C64A3]/15 bg-[#3C64A3]/5 px-4 py-2">
              <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">{t('quest.steps.entity_label')}</span>
              <span className="text-xs font-black text-[#3C64A3]">{activeEntity || t('quest.sidebar.select_entity')}</span>
            </div>
          </div>
          <div className="p-10"><Level5Exporter activeEntity={activeEntity} entitiesConfig={entitiesConfig} mappedEntities={mappedEntities} mappedColumnsByEntity={mappedColumnsByEntity} valueMappings={valueMappings} dateFormats={dateFormats} joinsConfigured={joinsConfigured} onSaveQuery={saveQueryForEntity} /></div>
        </section>

        <section ref={refs.delivery} data-section-id="delivery" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 text-left"><h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">{t('quest.steps.step6_title')}</h3></div>
          <div className="p-10"><Level6Delivery onDownloadZip={handleDownloadBundle} onReset={handleResetWorkspace} /></div>
        </section>
      </main>

      {configuringEntity && (
        <JoinModal entity={configuringEntity} files={mappedEntities[configuringEntity]} fileColumnsMock={fileColumnsMock} onClose={() => setConfiguringEntity(null)} onSave={handleSaveJoin} />
      )}
    </div>
  );
}