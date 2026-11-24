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


export default function DataMapperQuest() {

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
  const [configuringEntity, setConfiguringEntity] = useState(null);
  // --- 1. ESTADO DE MEMORIA RAM (Mantenemos tus valores) ---
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
  const [dateFormats, setDateFormats] = useState({});
  const [joinsConfigured, setJoinsConfigured] = useState({});

  // Esta es la función que debe recibir el JoinModal
  const handleSaveJoin = (entity, joinData) => {
    setJoinsConfigured(prev => ({
      ...prev,
      [entity]: joinData
    }));
  };

  const [queriesByEntity, setQueriesByEntity] = useState({});
  const [isLoading, setIsLoading] = useState(false); // <--- AÑADE ESTA LÍNEA

  // =========================================================================
  // SCROLL SPY & NAVIGATION (SIN SALTOS AL PRINCIPIO)
  // =========================================================================

  // Solo hace scroll cuando el usuario hace clic en el Sidebar
  const handleNavClick = (id, ref) => {
    setActiveNav(id);
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleResetWorkspace = async () => {
    const result = await MySwal.fire({
      title: 'Reset Workspace?',
      text: "This will permanently delete all uploaded files, mappings, and configurations. This action cannot be undone.",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Yes, reset everything',
      cancelButtonText: 'Cancel',
      ...swalConfig
    });

    if (result.isConfirmed) {
      setIsLoading(true);
      try {
        // 1. Limpiar el almacenamiento local
        localStorage.removeItem('datamapper_session_v6');
        localStorage.clear();

        const res = await fetch("/api/reset", { method: "POST" });
        await MySwal.fire({
          title: 'Reset Complete',
          text: 'The workspace is clean and ready for a new quest.',
          icon: 'success',
          timer: 2000,
          showConfirmButton: false,
          ...swalConfig
        });
        window.location.reload();
      } catch (e) {
        MySwal.fire('Error', 'Failed to reset the server state.', 'error');
      } finally {
        setIsLoading(false);
      }
    }
  };


  // Sincroniza el Sidebar con el scroll manual (Pasivo)
  useEffect(() => {
    const options = {
      root: null,
      rootMargin: '-15% 0px -75% 0px',
      threshold: 0
    };

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute('data-section-id');
          setActiveNav(sectionId);
        }
      });
    }, options);

    Object.values(refs).forEach(ref => {
      if (ref.current) observer.observe(ref.current);
    });

    return () => observer.disconnect();
  }, []);

  // Handler de cambio de entidad optimizado para no disparar scroll
  const handleEntityChange = useCallback((newEntity) => {
    setActiveEntity(newEntity);
  }, []);

  const handleUpdateDateFormat = (entity, field, format) => {
    setDateFormats(prev => ({
      ...prev,
      [entity]: {
        ...(prev[entity] || {}),
        [field]: format
      }
    }));
  };

  // =========================================================================
  // PERSISTENCIA & LÓGICA DE NEGOCIO
  // =========================================================================

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
        }
        if (p.mappedEntities) setMappedEntities(p.mappedEntities);
        if (p.mappedColumnsByEntity) setMappedColumnsByEntity(p.mappedColumnsByEntity);
        if (p.valueMappings) setValueMappings(p.valueMappings);
        if (p.dateFormats) setDateFormats(p.dateFormats);
        if (p.availableCatalogs) setAvailableCatalogs(p.availableCatalogs);
        if (p.fileColumnsMock) setFileColumnsMock(p.fileColumnsMock);
        if (p.targetColumnsByEntity) setTargetColumnsByEntity(p.targetColumnsByEntity);
        if (p.joinsConfigured) setJoinsConfigured(p.joinsConfigured);
        setLastSaved(new Date().toLocaleTimeString());
      } catch (e) { console.error("Restore failed", e); }
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      const data = {
        unmappedFiles, sourcesSummary, entitiesConfig,
        mappedEntities, valueMappings, dateFormats,
        mappedColumnsByEntity, availableCatalogs, fileColumnsMock,
        targetColumnsByEntity, joinsConfigured
      };
      localStorage.setItem('datamapper_session_v6', JSON.stringify(data));
      setLastSaved(new Date().toLocaleTimeString());
    }, 1000);
    return () => clearTimeout(timer);
  }, [unmappedFiles, mappedEntities, valueMappings, dateFormats, mappedColumnsByEntity, availableCatalogs, fileColumnsMock, targetColumnsByEntity]);


  // --- 3. EFECTO MONITOR DE RAM (Sin cambios, frecuencia de 1 min) ---
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
      setActiveEntity(config.entities[0].name)
      const tCols = {};
      const mEnts = { ...mappedEntities };
      config.entities.forEach(e => {
        tCols[e.name] = e.variables.map(v => v.label);
        if (!mEnts[e.name]) mEnts[e.name] = [];
      });
      setTargetColumnsByEntity(tCols);
      setMappedEntities(mEnts);
      if (config.entities.length > 0 && !activeEntity) setActiveEntity(config.entities[0].name);
    }
  };

  const handleSortingDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;

    let newUnmapped = [...unmappedFiles];
    let newMapped = { ...mappedEntities };

    // 1. MOVIMIENTO DE ARCHIVOS
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
      if (!newMapped[destEnt].includes(draggableId)) {
        newMapped[destEnt].push(draggableId);
      }
    }

    // --- 🧹 SMART CLEANUP (PASOS 2, 3, 4 y FECHAS) ---
    const affectedEntities = [
      source.droppableId.replace("entity-", ""),
      destination.droppableId.replace("entity-", "")
    ].filter(ent => ent !== "backpack");

    affectedEntities.forEach(ent => {
      const currentFiles = newMapped[ent] || [];

      // A. Limpiar Joins (Paso 2)
      if (currentFiles.length < 2) {
        setJoinsConfigured(prev => {
          const copy = { ...prev };
          delete copy[ent];
          return copy;
        });
      }

      // B. Limpiar Columnas (Paso 3)
      setMappedColumnsByEntity(prevCols => {
        const entCols = prevCols[ent];
        if (!entCols) return prevCols;

        const newEntCols = { ...entCols };
        let changed = false;

        Object.keys(newEntCols).forEach(cdmLabel => {
          const mapping = newEntCols[cdmLabel];
          if (typeof mapping === 'string' && mapping.includes('.')) {
            const fileName = mapping.split('.').slice(0, -1).join('.');
            if (!currentFiles.includes(fileName)) {
              delete newEntCols[cdmLabel];
              changed = true;
            }
          }
        });

        const updatedCols = changed ? { ...prevCols, [ent]: newEntCols } : prevCols;

        // C. Limpiar Valores/Catálogos (Paso 4)
        setValueMappings(prevVals => {
          const entVals = prevVals[ent];
          if (!entVals) return prevVals;

          const newEntVals = { ...entVals };
          let valsChanged = false;

          Object.keys(newEntVals).forEach(cdmLabel => {
            if (!newEntCols[cdmLabel]) {
              delete newEntVals[cdmLabel];
              valsChanged = true;
            }
          });
          return valsChanged ? { ...prevVals, [ent]: newEntVals } : prevVals;
        });

        // --- 📅 NUEVO: D. Limpiar Formatos de Fecha (Basado en Paso 3) ---
        setDateFormats(prevDates => {
          const entDates = prevDates[ent];
          if (!entDates) return prevDates;

          const newEntDates = { ...entDates };
          let datesChanged = false;

          Object.keys(newEntDates).forEach(cdmLabel => {
            // Si la columna ya no está mapeada en el Paso 3, 
            // no tiene sentido guardar su formato de fecha de origen.
            if (!newEntCols[cdmLabel]) {
              delete newEntDates[cdmLabel];
              datesChanged = true;
            }
          });
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

  const handlePuzzleDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    const entityMapping = { ...(mappedColumnsByEntity[activeEntity] || {}) };

    if (destination.droppableId === "pieces-pool" && source.droppableId.startsWith("slot-")) {
      delete entityMapping[source.droppableId.replace("slot-", "")];
    }
    if (destination.droppableId.startsWith("slot-") && source.droppableId === "pieces-pool") {
      entityMapping[destination.droppableId.replace("slot-", "")] = draggableId;
    }
    setMappedColumnsByEntity(prev => ({ ...prev, [activeEntity]: entityMapping }));
  };

  const steps = [
    { id: 'source', name: '01. Ingestion', icon: HiOutlineCloudArrowUp, ref: refs.source },
    { id: 'sorting', name: '02. Sorting', icon: HiOutlineSquares2X2, ref: refs.sorting },
    { id: 'puzzle', name: '03. Puzzle', icon: HiOutlinePuzzlePiece, ref: refs.puzzle },
    { id: 'semantic', name: '04. Semantic', icon: HiOutlineVariable, ref: refs.semantic },
    { id: 'alchemy', name: '05. Export', icon: HiOutlineRocketLaunch, ref: refs.alchemy },
    { id: 'delivery', name: '06. Delivery', icon: HiOutlineArchiveBox, ref: refs.delivery },
  ];

  const saveQueryForEntity = (entityName, sql) => {
    setQueriesByEntity(prev => ({
      ...prev,
      [entityName]: sql
    }));
  };

  const handleDownloadBundle = async (lang) => {
    if (Object.keys(queriesByEntity).length === 0) {
      return MySwal.fire({
        title: 'No Logic Found',
        text: 'Please generate your SQL queries in Step 05 before attempting to download.',
        icon: 'info',
        ...swalConfig
      });
    }

    // 1. Mostrar Loader de Swal
    MySwal.fire({
      title: 'Generating Bundle',
      html: `
      <div className="py-4">
        <p className="text-sm text-slate-500 mb-4">Please wait while we process heavy files and generate your documentation.</p>
      </div>
    `,
      allowOutsideClick: false,
      allowEscapeKey: false,
      didOpen: () => {
        MySwal.showLoading();
      },
      ...swalConfig
    });

    setIsLoading(true);

    try {
      const cleanQueries = Object.fromEntries(
        Object.entries(queriesByEntity).filter(([_, sql]) =>
          sql && !sql.startsWith("--")
        )
      );

      const response = await fetch("/api/export-bundle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entities: cleanQueries,
          entities_config: entitiesConfig,
          mapped_entities: mappedEntities,
          mapped_columns: mappedColumnsByEntity,
          joins_configured: joinsConfigured,
          lang: lang
        })
      });

      if (!response.ok) throw new Error("The server encountered an error generating your ZIP.");

      const data = await response.json();

      if (data.download_url) {
        // 2. Cerrar loader y mostrar éxito
        MySwal.close();

        const link = document.createElement('a');
        link.href = data.download_url;
        link.setAttribute('download', '');
        document.body.appendChild(link);
        link.click();
        link.remove();

        // Notificación Toast de éxito (no intrusiva)
        MySwal.fire({
          icon: 'success',
          title: 'Package collected successfully!',
          toast: true,
          position: 'top-end',
          showConfirmButton: false,
          timer: 5000,
          timerProgressBar: true
        });

        // Limpieza en segundo plano
        setTimeout(async () => {
          try { await fetch("/api/clean-zips", { method: "DELETE" }); }
          catch (err) { console.log("Silent cleanup"); }
        }, 15000);

      } else {
        throw new Error(data.detail || "Export failed");
      }
    } catch (error) {
      // 3. Manejo de errores con Swal
      MySwal.fire({
        title: 'Export Failed',
        text: error.message,
        icon: 'error',
        ...swalConfig
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC] overflow-hidden font-sans">

      {/* ASIDE - ASPIRE SIDEBAR STYLE */}
      <aside className="w-[22rem] bg-slate-50 border-r border-slate-200 flex flex-col shadow-sm z-20 shrink-0 h-screen sticky top-0 overflow-hidden">

        {/* LOGOS */}
        <div className="p-8 pb-6 bg-white border-b border-slate-100">
          <div className="flex gap-3">
            <a href="https://cienciadedatosysalud.org/" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 hover:bg-white border border-slate-200 rounded-xl transition-all shadow-sm group">
              <img src="/main_logo_small.png" alt="Web Logo" className="w-30 h-30 object-contain group-hover:scale-110 transition-transform" />
            </a>
            <a href="https://github.com/cienciadedatosysalud" target="_blank" rel="noopener noreferrer" className="p-2 bg-slate-50 hover:bg-slate-900 hover:text-white border border-slate-200 rounded-xl transition-all shadow-sm group text-slate-400">
              <FaGithub className="w-30 h-30 group-hover:scale-110 transition-transform" />
            </a>
          </div>
        </div>

        {/* NAVEGACIÓN */}
        <nav className="flex-1 px-4 mt-8 overflow-y-auto custom-scrollbar">
          <ul className="space-y-2 py-2">
            {steps.map((step) => (
              <li key={step.id}>
                <button
                  onClick={() => handleNavClick(step.id, step.ref)}
                  className={`flex items-center gap-4 w-full p-4 rounded-2xl transition-all duration-300 group ${activeNav === step.id ? 'bg-white shadow-md border-slate-200 ring-1 ring-slate-100' : 'hover:bg-white/60 border-transparent'
                    }`}
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center border transition-all duration-300 ${activeNav === step.id ? 'bg-[#3C64A3] text-white border-[#3C64A3]' : 'bg-white text-slate-400 border-slate-200'
                    }`}>
                    <step.icon className="w-5 h-5" />
                  </div>
                  <span className={`text-[12px] font-bold uppercase tracking-wide ${activeNav === step.id ? 'text-slate-900' : 'text-slate-500 group-hover:text-slate-700'}`}>
                    {step.name}
                  </span>
                  {activeNav === step.id && <HiChevronRight className="ml-auto text-[#FED56D] w-5 h-5" />}
                </button>
              </li>
            ))}
          </ul>
        </nav>

        {/* FOOTER */}
        <div className="p-7 bg-white border-t border-slate-200 space-y-6">
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2 text-slate-400">
                <HiOutlineCpuChip className="w-4 h-4" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Memory Monitor</span>
              </div>
              <span className="text-[10px] font-mono font-bold text-slate-900">{systemData.used_gb} / {systemData.total_gb} GB</span>
            </div>
            <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-100">
              <div
                className={`h-full transition-all duration-1000 ease-out ${systemData.percentage > 85 ? 'bg-red-500' : 'bg-[#3C64A3]'}`}
                style={{ width: `${systemData.percentage}%` }}
              ></div>
            </div>
          </div>
          <button
            onClick={() => { handleResetWorkspace() }}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-[10px] font-black uppercase text-slate-400 hover:text-red-500 hover:bg-red-50 transition-all"
          >
            <HiOutlineTrash className="w-4 h-4" /> Reset Quest
          </button>
        </div>
      </aside>

      {/* CONTENIDO PRINCIPAL CON SECCIONES DIFERENCIADAS */}
      <main className="flex-1 overflow-y-auto scroll-smooth p-12 space-y-16 bg-[#F8FAFC]">

        {/* NIVEL 1 */}
        <section ref={refs.source} data-section-id="source" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6">
            <h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest text-left">01. Source Ingestion</h3>
          </div>
          <div className="p-10">
            <Level1Source onMetadataUpdate={handleMetadataUpdate} initialSources={sourcesSummary} entitiesConfig={entitiesConfig} availableCatalogs={availableCatalogs} setAvailableCatalogs={setAvailableCatalogs} onFullReset={handleResetWorkspace} />
          </div>
        </section>

        {/* NIVEL 2 */}
        <section ref={refs.sorting} data-section-id="sorting" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 text-left">
            <h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">02. Entity Sorting</h3>
          </div>
          <div className="p-10">
            <Level2Sorting unmappedFiles={unmappedFiles} mappedEntities={mappedEntities} targetEntities={targetEntities}
              onDragEnd={handleSortingDragEnd} onConfigureLink={setConfiguringEntity} />
          </div>
        </section>

        {/* NIVEL 3 */}
        <section ref={refs.puzzle} data-section-id="puzzle" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 text-left">
            <h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">03. Column Puzzle</h3>
          </div>
          <div className="p-10">
            <Level3Puzzle
              activeEntity={activeEntity}
              setActiveEntity={handleEntityChange}
              targetEntities={targetEntities}
              entitiesConfig={entitiesConfig}
              sourceColumns={getAvailableSourceColumns()}
              mappedColumns={mappedColumnsByEntity[activeEntity] || {}}
              dateFormats={dateFormats[activeEntity] || {}}
              onUpdateDateFormat={(field, format) => handleUpdateDateFormat(activeEntity, field, format)}
              onDragEnd={handlePuzzleDragEnd}
              onRemoveMapping={(field) => {
                const mapping = { ...mappedColumnsByEntity[activeEntity] };
                delete mapping[field];
                setMappedColumnsByEntity(prev => ({ ...prev, [activeEntity]: mapping }));

                // Limpieza: Si borras el mapeo de la columna, borramos también su formato de fecha
                if (dateFormats[activeEntity]?.[field]) {
                  const newDates = { ...dateFormats[activeEntity] };
                  delete newDates[field];
                  setDateFormats(prev => ({ ...prev, [activeEntity]: newDates }));
                }
              }}
              onUpdateFullMapping={(entity, newMappings) => setMappedColumnsByEntity(prev => ({ ...prev, [entity]: newMappings }))}
            />
          </div>
        </section>

        {/* NIVEL 4 */}
        <section ref={refs.semantic} data-section-id="semantic" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 text-left">
            <h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">04. Semantic Mapping ({activeEntity})</h3>
          </div>
          <div className="p-10">
            <Level4ValueMapper
              activeEntity={activeEntity}
              entitiesConfig={entitiesConfig}
              mappedColumnsByEntity={mappedColumnsByEntity}
              valueMappings={valueMappings}
              onUpdateMapping={(ent, field, src, tgt) => {
                setValueMappings(prev => ({
                  ...prev,
                  [ent]: { ...prev[ent], [field]: { ...(prev[ent]?.[field] || {}), [src]: tgt } }
                }));
              }}
              onClearAll={(ent) => {
                const newMappings = { ...valueMappings };
                delete newMappings[ent];
                setValueMappings(newMappings);
              }}
            />
          </div>
        </section>

        {/* NIVEL 5 */}
        <section ref={refs.alchemy} data-section-id="alchemy" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 text-left">
            <h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">05. Export Launch ({activeEntity})</h3>
          </div>
          <div className="p-10">
            <Level5Exporter activeEntity={activeEntity}
              entitiesConfig={entitiesConfig}
              mappedEntities={mappedEntities}
              mappedColumnsByEntity={mappedColumnsByEntity}
              valueMappings={valueMappings}
              dateFormats={dateFormats}
              joinsConfigured={joinsConfigured}
              onSaveQuery={saveQueryForEntity} />
          </div>
        </section>
        <section ref={refs.delivery} data-section-id="delivery" className="bg-white rounded-[2.5rem] border border-slate-100 shadow-[0_10px_40px_rgba(0,0,0,0.04)] overflow-hidden">
          <div className="bg-slate-50/50 border-b border-slate-50 px-10 py-6 text-left">
            <h3 className="text-xl font-black text-[#3C64A3] italic uppercase tracking-widest">06. Generate documentation</h3>
          </div>
          <div className="p-10">
            <Level6Delivery
              onDownloadZip={handleDownloadBundle}
              onReset={handleResetWorkspace}
            />
          </div>
        </section>
      </main>

      {configuringEntity && (
        <JoinModal
          entity={configuringEntity}
          files={mappedEntities[configuringEntity]}
          fileColumnsMock={fileColumnsMock}
          onClose={() => setConfiguringEntity(null)}
          onSave={handleSaveJoin}
        />
      )}
    </div>
  );
}