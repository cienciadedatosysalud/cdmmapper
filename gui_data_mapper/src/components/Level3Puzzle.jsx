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
import { useTranslation } from 'react-i18next';

const MySwal = withReactContent(Swal);

export default function Level3Puzzle({
  activeEntity,
  entitiesConfig = [],
  sourceColumns = [],
  mappedColumns = {},
  dateFormats = {},
  onUpdateDateFormat,
  onDragEnd,
  onRemoveMapping,
  onUpdateFullMapping,
  onDetectDateFormats
}) {
  const { t } = useTranslation();

  const currentEntityDef = entitiesConfig.find(e => e.name === activeEntity);
  const targetVariables = currentEntityDef?.variables || [];

  const DATE_TIME_FORMATS = [
    // --- DATETIME ---
    { label: 'YYYY-MM-DD HH:MM:SS.ms', value: '%Y-%m-%d %H:%M:%S.%f' },
    { label: 'ISO 8601 (T)', value: '%Y-%m-%dT%H:%M:%S' },
    { label: 'YYYY-MM-DD HH:MM:SS', value: '%Y-%m-%d %H:%M:%S' },
    { label: 'DD/MM/YYYY HH:MM:SS', value: '%d/%m/%Y %H:%M:%S' },
    { label: 'MM/DD/YYYY HH:MM:SS', value: '%m/%d/%Y %H:%M:%S' },
    { label: 'DD/MM/YYYY HH:MM', value: '%d/%m/%Y %H:%M' },
    { label: 'MM/DD/YYYY HH:MM', value: '%m/%d/%Y %H:%M' },

    // --- DATE ---
    { label: 'DD/MM/YYYY', value: '%d/%m/%Y' },
    { label: 'MM/DD/YYYY', value: '%m/%d/%Y' },
    { label: 'YYYY-MM-DD', value: '%Y-%m-%d' },
    { label: 'DD-MM-YYYY', value: '%d-%m-%Y' },
    { label: 'MM-DD-YYYY', value: '%m-%d-%Y' },
    { label: 'DD.MM.YYYY', value: '%d.%m.%Y' },

    // --- COMPACT / STICKY ---
    { label: 'YYYYMMDD', value: '%Y%m%d' },
    { label: 'DDMMYYYY', value: '%d%m%Y' },
    { label: 'MMDDYYYY', value: '%m%d%Y' },

    // --- 2-DIGIT YEAR ---
    { label: 'DD/MM/YY', value: '%d/%m/%y' },
    { label: 'MM/DD/YY', value: '%m/%d/%y' },
    { label: 'YYMMDD', value: '%y%m%d' }
  ];

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

  // --- LÓGICA SØRENSEN-DICE (SIMILITUD) ---
  const getSimilarity = (str1, str2) => {
    const s1 = str1.toLowerCase().replace(/[^a-z0-9]/g, '');
    const s2 = str2.toLowerCase().replace(/[^a-z0-9]/g, '');
    if (s1 === s2) return 1;
    if (s1.length < 2 || s2.length < 2) return 0;
    const getBigrams = (str) => {
      const bigrams = new Set();
      for (let i = 0; i < str.length - 1; i++) bigrams.add(str.substring(i, i + 2));
      return bigrams;
    };
    const b1 = getBigrams(s1);
    const b2 = getBigrams(s2);
    let intersect = 0;
    for (const bit of b1) if (b2.has(bit)) intersect++;
    return (2 * intersect) / (b1.size + b2.size);
  };




  const handleAutoMap = async () => {
    const newMappings = { ...mappedColumns };
    let matchCount = 0;
    const THRESHOLD = 0.65;

    // 1. Lógica de Similitud (Sørensen-Dice)
    targetVariables.forEach(v => {
      if (newMappings[v.label]) return;
      let bestMatch = null;
      let highestScore = 0;
      sourceColumns.forEach(srcCol => {
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
      // 2. Actualizamos los mapeos en el estado global
      onUpdateFullMapping(activeEntity, newMappings);

      // 3. DETECCIÓN AUTOMÁTICA USANDO LA PROP DEL PADRE
      // Simplemente llamamos a la función que ya gestiona los fecth y el estado
      await onDetectDateFormats(activeEntity, newMappings);

      // 4. Notificación de éxito
      MySwal.fire({
        title: t('l3.automap.success_title'),
        text: t('l3.automap.success_text', { count: matchCount }),
        icon: 'success',
        timer: 3000,
        timerProgressBar: true,
        showConfirmButton: false,
        ...swalConfig
      });

    } else {
      MySwal.fire({
        title: t('l3.automap.fail_title'),
        text: t('l3.automap.fail_text'),
        icon: 'info',
        confirmButtonText: t('common.understood'),
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
    <div className="space-y-8 animate-in fade-in duration-500 text-left">
      <div className="mb-10 space-y-8">
        <div className="text-left space-y-4 max-w-6xl">
          <p className="font-black text-[#3C64A3] text-[12px] uppercase tracking-[0.2em] mb-2 px-2">
            {t('l3.header.tag')}
          </p>
          <p className="text-slate-600 text-sm leading-relaxed px-2">
            {t('l3.header.description')}
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
            <div className="bg-[#008C96]/5 border-l-4 border-[#008C96] p-6 rounded-r-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <HiOutlineSparkles className="text-[#008C96]" size={20} />
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{t('l3.cards.automap.title')}</p>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                {t('l3.cards.automap.text_p1')} <span className="font-bold text-[#008C96]">{t('l3.cards.automap.highlight')}</span> {t('l3.cards.automap.text_p2')}
              </p>
            </div>

            <div className="bg-[#FED56D]/5 border-l-4 border-[#FED56D] p-6 rounded-r-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <HiOutlineCircleStack className="text-[#EEB141]" size={20} />
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{t('l3.cards.namespace.title')}</p>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                {t('l3.cards.namespace.text_p1')} <span className="bg-white px-2 py-0.5 rounded border border-slate-200 font-mono text-[10px] mx-1">[file].[column]</span>. {t('l3.cards.namespace.text_p2')}
              </p>
            </div>

            <div className="bg-slate-50 border-l-4 border-slate-300 p-6 rounded-r-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <HiOutlinePuzzlePiece className="text-slate-400" size={20} />
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{t('l3.cards.integrity.title')}</p>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                {t('l3.cards.integrity.text_p1')} <span className="font-bold text-[#3C64A3]">{t('l3.cards.integrity.highlight')}</span> {t('l3.cards.integrity.text_p2')}
              </p>
            </div>

            <div className="bg-blue-50/50 border-l-4 border-[#3C64A3] p-6 rounded-r-[2.5rem] shadow-sm">
              <div className="flex items-center gap-3 mb-3">
                <HiOutlineCalendar className="text-[#3C64A3]" size={20} />
                <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">{t('l3.cards.temporal.title')}</p>
              </div>
              <p className="text-[12px] text-slate-600 leading-relaxed">
                {t('l3.cards.temporal.text_p1')} <span className="font-bold text-slate-700">{t('l3.cards.temporal.highlight1')}</span> {t('l3.cards.temporal.text_p2')} <span className="font-bold text-[#3C64A3]">{t('l3.cards.temporal.highlight2')}</span>.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4">
        <button
          onClick={handleAutoMap}
          className="flex items-center gap-2 bg-[#3C64A3] hover:bg-[#2A4A7A] text-white px-8 py-4 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] transition-all shadow-lg active:scale-95 group"
        >
          <HiOutlineSparkles className="w-4 h-4 group-hover:animate-pulse" />
          {t('l3.btn.automap')}
        </button>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <div className="lg:col-span-4 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">{t('l3.columns.source')}</h4>
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

          <div className="lg:col-span-8 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2 italic">{t('l3.columns.target')}: {activeEntity}</h4>
            <div className="grid grid-cols-1 gap-4 max-h-[800px] overflow-y-auto pr-2">
              {targetVariables.map((v) => {
                const targetField = v.label;
                const isMapped = mappedColumns[targetField];
                const dateStatus = isDateField(targetField);

                return (
                  <div key={targetField} className="flex flex-col gap-2">
                    <div className="flex items-center gap-4 group">
                      <div className="w-1/3 bg-white p-5 rounded-[2rem] border border-slate-100 shadow-sm flex flex-col relative group text-left">
                        <span className="text-[11px] font-black text-slate-800 uppercase italic leading-none">{targetField}</span>
                        <span className="text-[8px] text-slate-400 font-bold uppercase mt-2 line-clamp-2 leading-tight">
                          {v.description || t('l3.columns.default_desc')}
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
                                <div className="flex items-center gap-3 text-left">
                                  <HiOutlineCheckCircle className="text-emerald-500 w-5 h-5" />
                                  <div className="flex flex-col">
                                    <span className="font-mono text-[10px] font-black text-slate-700 truncate">{isMapped}</span>
                                    <span className="text-[8px] text-emerald-600 font-black uppercase tracking-tighter">{t('l3.columns.linked_msg')}</span>
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
                              <span className="text-[9px] font-black text-slate-300 uppercase italic mx-auto tracking-widest">{t('l3.columns.drop_msg')}</span>
                            )}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </div>

                    {dateStatus && isMapped && (
                      <div className="ml-[36%] mr-4 mt-3 bg-blue-50/40 border border-[#3C64A3]/20 p-5 rounded-[2.5rem] flex flex-col gap-3 animate-in slide-in-from-top-2 shadow-sm relative overflow-hidden text-left">
                        <div className="absolute -right-4 -bottom-4 opacity-5 text-[#3C64A3]">
                          <HiOutlineClock size={80} />
                        </div>

                        <div className="flex items-center justify-between relative z-10">
                          <div className="flex items-center gap-4 text-left">
                            <div className="bg-white p-3 rounded-2xl shadow-sm border border-blue-100">
                              <HiOutlineClock className="text-[#3C64A3] w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                              <span className="text-[10px] font-black text-[#3C64A3] uppercase tracking-[0.15em]">
                                {t('l3.date.title')}
                              </span>
                              <p className="text-[9px] text-slate-500 font-medium leading-tight max-w-[280px] mt-0.5">
                                {t('l3.date.description')}
                              </p>
                            </div>
                          </div>

                          <div className="flex flex-col items-end gap-2">
                            <select
                              value={(dateFormats && dateFormats[targetField]) || ""}
                              onChange={(e) => onUpdateDateFormat(targetField, e.target.value)}
                              className="bg-white text-[#1D1D1B] text-[11px] font-mono font-black rounded-xl px-4 py-2.5 border-2 border-white shadow-sm focus:border-[#3C64A3] focus:ring-4 focus:ring-[#3C64A3]/5 outline-none transition-all cursor-pointer min-w-[180px]"
                            >
                              <option value="" disabled>{t('l3.date.placeholder')}</option>
                              {DATE_TIME_FORMATS.map(f => (
                                <option key={f.value} value={f.value}>
                                  {f.label}
                                </option>
                              ))}
                            </select>

                            {!dateFormats?.[targetField] ? (
                              <span className="text-[8px] font-black text-amber-600 bg-amber-100 px-2 py-0.5 rounded-md animate-pulse uppercase">
                                {t('l3.date.required')}
                              </span>
                            ) : (
                              <span className="text-[8px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-md uppercase">
                                {t('l3.date.locked')}
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