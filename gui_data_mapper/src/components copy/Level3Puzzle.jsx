import React from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  HiOutlinePuzzlePiece,
  HiOutlineArrowLongRight,
  HiOutlineTrash,
  HiOutlineCheckCircle,
  HiOutlineCircleStack,
  HiOutlineClock,
  HiOutlineSparkles,
  HiOutlineCalendar
} from 'react-icons/hi2';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

export default function Level3Puzzle({
  activeEntity,
  setActiveEntity,
  targetEntities = [],
  entitiesConfig = [],
  sourceColumns = [],
  mappedColumns = {},
  dateFormats = {},
  onUpdateDateFormat,
  onDragEnd,
  onRemoveMapping,
  onUpdateFullMapping // Nueva prop para el Auto-Map masivo
}) {

  const currentEntityDef = entitiesConfig.find(e => e.name === activeEntity);
  const targetVariables = currentEntityDef?.variables || [];
  const DATE_TIME_FORMATS = [
    { label: 'DD/MM/YYYY', value: '%d/%m/%Y' },
    { label: 'YYYY-MM-DD', value: '%Y-%m-%d' },
    { label: 'DD-MM-YYYY', value: '%d-%m-%Y' },
    { label: 'MM/DD/YYYY', value: '%m/%d/%Y' },
    { label: 'YYYYMMDD', value: '%Y%m%d' },
    { label: 'DD/MM/YYYY HH:MM', value: '%d/%m/%Y %H:%M' },
    { label: 'YYYY-MM-DD HH:MM:SS', value: '%Y-%m-%d %H:%M:%S' },
    { label: 'ISO 8601 (T)', value: '%Y-%m-%dT%H:%M:%S' }
  ];

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


  // Función Helper: Coeficiente de Sørensen-Dice
  const getSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');

    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) return 0;

    const getBigrams = (str) => {
      const bigrams = new Set();
      for (let i = 0; i < str.length - 1; i++) {
        bigrams.add(str.substring(i, i + 2));
      }
      return bigrams;
    };

    const b1 = getBigrams(s1);
    const b2 = getBigrams(s2);
    let intersect = 0;

    for (const bit of b1) {
      if (b2.has(bit)) intersect++;
    }

    return (2 * intersect) / (b1.size + b2.size);
  };

  // --- FUNCIONALIDAD AUTO-MAP ---
  const handleAutoMap = () => {
    const newMappings = { ...mappedColumns };
    let matchCount = 0;
    const THRESHOLD = 0.65; // Umbral óptimo: 65% de similitud

    targetVariables.forEach(v => {
      if (newMappings[v.label]) return; // Saltamos si ya está mapeado

      let bestMatch = null;
      let highestScore = 0;

      sourceColumns.forEach(srcCol => {
        // Extraemos solo el nombre de la columna (quitando el nombre del archivo)
        const colName = srcCol.split('.').pop();
        const score = getSimilarity(colName, v.label);

        if (score > highestScore && score >= THRESHOLD) {
          highestScore = score;
          bestMatch = srcCol;
        }
      });

      if (bestMatch) {
        newMappings[v.label] = bestMatch;
        matchCount++;
      }
    });

    if (matchCount > 0) {
      onUpdateFullMapping(activeEntity, newMappings);

      // Éxito: Se han encontrado coincidencias
      MySwal.fire({
        title: 'Smart Map Success',
        text: `Auto-Map engine found ${matchCount} matches based on name similarity!`,
        icon: 'success',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        ...swalConfig
      });
    } else {
      // Información: No se encontraron coincidencias
      MySwal.fire({
        title: 'No matches found',
        text: "The mapping engine couldn't find close similarities. Please map your columns manually.",
        icon: 'info',
        confirmButtonText: 'Understood',
        ...swalConfig
      });
    }
  };

  const isDateField = (name) => {
    if (!name) return false;
    const n = name.toLowerCase();
    return n.includes('_dt') || n.includes('fecha') || n.includes('timestamp') || n.includes('date');
  };





  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="mb-10 space-y-8">
        <div className="text-left space-y-4 max-w-6xl">
          {/* Título de Sección */}
          <p className="font-black text-[#3C64A3] text-[12px] uppercase tracking-[0.2em] mb-2 px-2">
            Step 03: Structural Column Mapping
          </p>

          {/* Descripción de Uso */}
          <p className="text-slate-600 text-sm leading-relaxed px-2">
            Connect your source attributes to the standardized CDM variables. This step ensures that
            each piece of information is placed in its correct structural container.
          </p>

          {/* GRID DE CARDS (2x2 para mejor lectura) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">

            {/* Bloque 1: Smart Auto-Map */}
            <div className="bg-[#008C96]/5 border-l-4 border-[#008C96] p-6 rounded-r-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <HiOutlineSparkles className="text-[#008C96]" size={20} />
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  Smart Auto-Map Engine
                </p>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                The <span className="font-bold text-[#008C96]">Smart Auto-Map</span> uses string similarity algorithms
                to suggest matches. Review suggestions carefully to ensure semantic accuracy.
              </p>
            </div>

            {/* Bloque 2: Namespace & Joins */}
            <div className="bg-[#FED56D]/5 border-l-4 border-[#FED56D] p-6 rounded-r-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <HiOutlineCircleStack className="text-[#EEB141]" size={20} />
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  File Namespace Logic
                </p>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                Source columns are prefixed as <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[10px] mx-1">[file].[column]</span>.
                Crucial for <span className="font-bold text-slate-700">Multi-File Entities</span> to identify source datasets.
              </p>
            </div>

            {/* Bloque 3: Schema Integrity */}
            <div className="bg-slate-50 border-l-4 border-slate-300 p-6 rounded-r-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <HiOutlinePuzzlePiece className="text-slate-400" size={20} />
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  Schema Integrity
                </p>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                Unassigned CDM variables will be <span className="font-bold text-[#3C64A3]">automatically filled with NULL values</span> to
                guarantee compliance with the target model structure.
              </p>
            </div>

            {/* Bloque 4: Date Formatting (NUEVO) */}
            <div className="bg-blue-50/50 border-l-4 border-[#3C64A3] p-6 rounded-r-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <HiOutlineCalendar className="text-[#3C64A3]" size={20} />
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                  Temporal Standardization
                </p>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                For <span className="font-bold text-slate-700">Date/DateTime</span> variables, specify the source format to
                enable transformation into <span className="font-bold text-[#3C64A3]">ISO8601 </span>
                (<span className="font-mono text-[10px]">YYYY-MM-DD</span> or <span className="font-mono text-[10px]">YYYY-MM-DD HH:MM:SS</span>).
              </p>
            </div>
          </div>


        </div>
      </div>
      <p className="font-black text-[#3C64A3] text-[12px] uppercase tracking-[0.2em] mb-5 px-2">
        Select CDM Entity
      </p>
      {/* SELECTOR DE ENTIDADES */}
      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-6">
        {targetEntities.map(entity => (
          <button
            key={entity}
            onClick={() => setActiveEntity(entity)}
            className={`px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${activeEntity === entity
              ? 'bg-slate-900 text-white shadow-xl scale-105'
              : 'bg-white text-slate-400 border border-slate-100 hover:bg-slate-50'
              }`}
          >
            <HiOutlineCircleStack /> {entity}
          </button>
        ))}


      </div>
      {/* CONTENEDOR DEL BOTÓN (Abajo a la derecha) */}
      <div className="flex justify-end pt-4">
        <button
          onClick={handleAutoMap}
          className="flex items-center gap-2 bg-[#3C64A3] hover:bg-[#2A4A7A] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 group"
        >
          <HiOutlineSparkles className="w-4 h-4 group-hover:animate-pulse" />
          Smart Auto-Map
        </button>
      </div>
      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">

          {/* COLUMNAS DISPONIBLES (Filtradas por Level 2) */}
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Source Columns</h4>
            <Droppable droppableId="pieces-pool">
              {(provided) => (
                <div ref={provided.innerRef} {...provided.droppableProps}
                  className="bg-slate-50/50 p-4 rounded-[2.5rem] border-2 border-dashed border-slate-100 min-h-[600px] max-h-[800px] overflow-y-auto flex flex-col gap-2"
                >
                  {sourceColumns.map((col, index) => (
                    <Draggable key={col} draggableId={col} index={index}>
                      {(provided, snapshot) => (
                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}
                          className={`p-4 bg-white rounded-2xl border border-slate-200 shadow-sm font-mono text-[10px] font-bold flex items-center justify-between transition-all ${snapshot.isDragging ? 'ring-4 ring-blue-500/20 scale-105 border-blue-500 z-50' : 'hover:border-blue-300'}`}
                        >
                          <span className="truncate pr-2">{col}</span>
                          <HiOutlinePuzzlePiece className={`${snapshot.isDragging ? 'text-blue-500' : 'text-slate-200'}`} />
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>

          {/* SLOTS DE DESTINO */}
          <div className="lg:col-span-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 italic">Target: {activeEntity}</h4>
            <div className="grid grid-cols-1 gap-4 max-h-[800px] overflow-y-auto pr-2">
              {targetVariables.map((v) => {
                const targetField = v.label;
                const isMapped = mappedColumns[targetField];
                const dateStatus = isDateField(targetField);

                return (
                  <div key={targetField} className="flex flex-col gap-2">
                    <div className="flex items-center gap-4 group">
                      <div className="w-1/3 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col relative group">
                        <span className="text-[11px] font-black text-slate-800 uppercase italic leading-none">{targetField}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase mt-2 line-clamp-2 leading-tight">
                          {v.description || "CDM Standard Variable"}
                        </span>
                      </div>

                      <HiOutlineArrowLongRight className="text-slate-200 shrink-0" />

                      <Droppable droppableId={`slot-${targetField}`}>
                        {(provided, snapshot) => (
                          <div ref={provided.innerRef} {...provided.droppableProps}
                            className={`flex-1 min-h-[70px] rounded-[2rem] border-2 border-dashed flex items-center px-6 transition-all ${snapshot.isDraggingOver ? 'bg-blue-50 border-blue-400' :
                              isMapped ? 'bg-white border-green-200 shadow-md' : 'bg-slate-50 border-slate-100 opacity-60'
                              }`}
                          >
                            {isMapped ? (
                              <div className="w-full flex justify-between items-center animate-in zoom-in-95">
                                <div className="flex items-center gap-3">
                                  <HiOutlineCheckCircle className="text-emerald-500 w-5 h-5" />
                                  <div className="flex flex-col">
                                    <span className="font-mono text-[10px] font-black text-slate-700 truncate">{isMapped}</span>
                                    <span className="text-[8px] text-emerald-600 font-black uppercase tracking-tighter">Auto-Linked Match</span>
                                  </div>
                                </div>
                                <button
                                  onClick={() => onRemoveMapping(targetField)}
                                  className="p-2 bg-slate-50 hover:bg-red-50 text-slate-300 hover:text-red-500 rounded-xl transition-colors"
                                >
                                  <HiOutlineTrash />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[9px] font-black text-slate-300 uppercase italic mx-auto tracking-widest">Drop Variable Here</span>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>

                    {/* FORMATO DE FECHA */}
                    {dateStatus && isMapped && (
                      <div className="ml-[36%] mr-4 mt-3 bg-blue-50/40 border border-[#3C64A3]/20 p-5 rounded-[2.5rem] flex flex-col gap-3 animate-in slide-in-from-top-2 shadow-sm relative overflow-hidden">

                        {/* Decoración de fondo sutil */}
                        <div className="absolute -right-4 -bottom-4 opacity-5 text-[#3C64A3]">
                          <HiOutlineClock size={80} />
                        </div>

                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-4">
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-100">
                              <HiOutlineClock className="text-[#3C64A3] w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-[#3C64A3] uppercase tracking-[0.15em]">
                                Source Date Interpretation
                              </span>
                              <p className="text-[9px] text-slate-500 font-medium leading-tight max-w-[280px] mt-0.5">
                                Define how dates are written **in your original file** so the engine can parse them correctly.
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <select
                              value={(dateFormats && dateFormats[targetField]) || ""}
                              onChange={(e) => onUpdateDateFormat(targetField, e.target.value)}
                              className="bg-white text-[#1D1D1B] text-[11px] font-mono font-black rounded-xl px-4 py-2.5 border-2 border-white shadow-sm focus:border-[#3C64A3] focus:ring-4 focus:ring-[#3C64A3]/5 outline-none transition-all cursor-pointer min-w-[180px]"
                            >
                              <option value="" disabled>Select Input Format...</option>
                              {DATE_TIME_FORMATS.map(f => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>

                            {/* Badge de Validación */}
                            {!dateFormats?.[targetField] ? (
                              <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse uppercase">
                                Action Required
                              </span>
                            ) : (
                              <span className="text-[8px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">
                                Pattern Locked
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}