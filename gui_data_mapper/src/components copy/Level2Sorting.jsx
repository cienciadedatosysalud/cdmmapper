import React, { useState, useEffect } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import {
  HiOutlineDocumentText,
  HiOutlineCircleStack,
  HiOutlineCheckCircle,
  HiOutlineLink,
  HiOutlineInformationCircle,
  HiOutlineSquaresPlus
} from 'react-icons/hi2'; // Cambiado a hi2

export default function Level2Sorting({
  unmappedFiles = [],
  mappedEntities = {},
  targetEntities = [],
  onDragEnd,
  onConfigureLink
}) {

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => setIsMounted(true), []);
  if (!isMounted) return null;

  return (
    <div className="flex-1 flex flex-col animate-in fade-in slide-in-from-bottom-8 duration-700">

      {/* HEADER SECTION */}
      <div className="mb-10 flex items-center justify-between">
        <div className="text-left">
          <div className="text-left space-y-4 max-w-3xl">
            {/* Descripción de Uso */}
            <p className="text-slate-600 text-sm leading-relaxed">
              Drag and drop your <span className="font-bold text-slate-700">raw CSV files</span> into their corresponding <span className="font-bold text-slate-700">CDM Entities</span>.
              This step defines the data architecture for the upcoming mapping process.
            </p>

            {/* Bloque de Lógica de Unión */}
            <div className="bg-blue-50/50 border-l-4 border-[#FED56D] p-4 rounded-r-2xl">
              <p className="text-[11px] font-black text-slate-800 uppercase tracking-tight mb-1">
                Multiple Files detected?
              </p>
              <p className="text-[12px] text-slate-500 leading-snug">
                If you assign two or more files to a single entity, you must click the
                <span className="text-[#3C64A3] font-bold"> "Configure Join"</span> button
                to specify how they should be merged (e.g., Vertical Union or Primary Key Join).
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white border border-slate-100 px-5 py-2.5 rounded-2xl flex items-center gap-3 text-slate-500 shadow-sm">
          <HiOutlineInformationCircle className="w-4 h-4 text-blue-500" />
          <span className="text-[10px] font-black uppercase tracking-widest">
            {unmappedFiles.length} Files to classify
          </span>
        </div>
      </div>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-10 flex-1 items-start">

          {/* ================= BACKPACK (SOURCE FILES) ================= */}
          <div className="lg:col-span-1 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Unassigned Files</h4>
            <Droppable droppableId="backpack">
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={`rounded-[2.5rem] p-6 border-2 border-dashed flex flex-col gap-3 min-h-[600px] transition-all duration-300 ${snapshot.isDraggingOver
                    ? 'bg-blue-50 border-blue-400 ring-8 ring-blue-500/5'
                    : 'bg-slate-50 border-slate-200'
                    }`}
                >
                  {unmappedFiles.map((file, index) => (
                    <Draggable key={file} draggableId={file} index={index}>
                      {(provided, snapshot) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.draggableProps}
                          {...provided.dragHandleProps}
                          className={`p-4 rounded-2xl border flex items-center gap-3 transition-all ${snapshot.isDragging
                            ? 'bg-white border-blue-500 shadow-2xl scale-105 z-50'
                            : 'bg-white shadow-sm border-slate-100 hover:border-blue-400 hover:shadow-md'
                            }`}
                        >
                          <div className="w-8 h-8 bg-blue-50 text-blue-600 rounded-lg flex items-center justify-center shrink-0">
                            <HiOutlineDocumentText size={16} />
                          </div>
                          <span className="font-mono text-[10px] font-bold text-slate-700 truncate">{file}</span>
                        </div>
                      )}
                    </Draggable>
                  ))}
                  {provided.placeholder}

                  {unmappedFiles.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-slate-300 gap-2 opacity-50">
                      <HiOutlineCheckCircle size={32} />
                      <span className="text-[9px] font-black uppercase tracking-widest">All files sorted</span>
                    </div>
                  )}
                </div>
              )}
            </Droppable>
          </div>

          {/* ================= TARGET ENTITIES ================= */}
          <div className="lg:col-span-3 space-y-4">
            <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest px-2">Data Model Entities</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
              {targetEntities.map((entity) => {
                const files = mappedEntities[entity] || [];
                const hasFiles = files.length > 0;
                const isFull = files.length >= 2;
                return (
                  <Droppable
                    key={entity}
                    droppableId={`entity-${entity}`}
                    isDropDisabled={isFull} // Bloquea la entrada de un 3er fichero
                  >
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={`rounded-[2.5rem] p-6 border-2 transition-all min-h-[250px] flex flex-col relative group ${snapshot.isDraggingOver
                            ? 'bg-indigo-50 border-indigo-400 ring-8 ring-indigo-500/5 scale-[1.02]'
                            : isFull
                              ? 'bg-white border-blue-200 shadow-xl' // Color distintivo cuando está lleno
                              : hasFiles
                                ? 'bg-white border-slate-200 shadow-xl'
                                : 'bg-white border-slate-100 opacity-60 grayscale hover:grayscale-0 hover:opacity-100'
                          }`}
                      >
                        {/* Badge de Límite (Solo visible si tiene 2 ficheros) */}
                        {isFull && (
                          <div className="absolute -top-3 right-8 bg-blue-600 text-white px-3 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-lg animate-in zoom-in duration-300 z-10">
                            Max Capacity Reached
                          </div>
                        )}

                        {/* Header de la Entidad */}
                        <div className="flex justify-between items-center mb-6">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-xl transition-colors ${hasFiles ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-400'
                              }`}>
                              <HiOutlineCircleStack className="w-4 h-4" />
                            </div>
                            <span className="text-[11px] font-black uppercase tracking-tight text-slate-800 italic">
                              {entity}
                            </span>
                          </div>
                          {hasFiles && (
                            <HiOutlineCheckCircle className="text-emerald-500 w-5 h-5 animate-in zoom-in" />
                          )}
                        </div>

                        {/* Lista de Ficheros dentro de la Entidad */}
                        <div className="flex-1 flex flex-col gap-2">
                          {files.map((file, index) => (
                            <Draggable key={file} draggableId={file} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className={`p-3 rounded-xl border flex items-center gap-2 transition-all ${snapshot.isDragging
                                      ? 'bg-white border-indigo-400 shadow-lg z-50'
                                      : 'bg-slate-50 border-white shadow-sm'
                                    }`}
                                >
                                  <HiOutlineDocumentText className="w-3.5 h-3.5 text-slate-400" />
                                  <span className="font-mono text-[9px] font-black text-slate-600 truncate">{file}</span>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}

                          {/* Slot vacío o invitación a añadir el segundo */}
                          {!isFull && (
                            <div className={`flex-1 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center gap-2 transition-colors ${snapshot.isDraggingOver ? 'border-indigo-300 text-indigo-400' : 'border-slate-50 text-slate-300'
                              }`}>
                              <HiOutlineSquaresPlus size={20} className="opacity-20" />
                              <span className="text-[8px] font-black uppercase tracking-[0.2em] italic">
                                {hasFiles ? 'Add one more' : 'Drop here'}
                              </span>
                            </div>
                          )}
                        </div>

                        {/* ACCIÓN: CONFIGURE JOINS (Solo si hay exactamente 2 archivos) */}
                        {isFull && (
                          <div className="mt-6 space-y-3">
                            <div className="flex items-center gap-2 px-2">
                              <div className="h-[1px] flex-1 bg-slate-100"></div>
                              <span className="text-[8px] font-bold text-slate-400 uppercase tracking-widest">Relational logic</span>
                              <div className="h-[1px] flex-1 bg-slate-100"></div>
                            </div>
                            <button
                              onClick={() => onConfigureLink(entity)}
                              className="w-full py-3.5 bg-[#3C64A3] text-white rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 hover:bg-[#2A4A7A] transition-all shadow-lg active:scale-95 group"
                            >
                              <HiOutlineLink className="w-4 h-4 group-hover:rotate-45 transition-transform" />
                              Configure Join
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </div>
        </div>
      </DragDropContext>
    </div>
  );
}