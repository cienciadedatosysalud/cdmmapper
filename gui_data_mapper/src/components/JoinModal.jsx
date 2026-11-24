import React, { useState } from 'react';
import { HiOutlineLink, HiPlus, HiTrash, HiX, HiCheck } from 'react-icons/hi';
import { HiOutlineArrowsRightLeft } from 'react-icons/hi2';
import { useTranslation } from 'react-i18next';

export default function JoinModal({ 
  entity, 
  files, 
  fileColumnsMock, 
  onClose, 
  onSave 
}) {
  const { t } = useTranslation();
  const fileA = files[0];
  const fileB = files[1];
  const colsA = fileColumnsMock[fileA] || [];
  const colsB = fileColumnsMock[fileB] || [];

  const [joinType, setJoinType] = useState('INNER JOIN');
  
  const [conditions, setConditions] = useState([
    { left: colsA[0] || '', right: colsB[0] || '' }
  ]);

  const JOIN_OPTIONS = [
    { id: 'INNER JOIN', label: t('l2.modal.inner_label'), desc: t('l2.modal.inner_desc') },
    { id: 'LEFT JOIN', label: t('l2.modal.left_label'), desc: t('l2.modal.left_desc') },
    { id: 'FULL JOIN', label: t('l2.modal.full_label'), desc: t('l2.modal.full_desc') }
  ];

  const addCondition = () => setConditions([...conditions, { left: colsA[0] || '', right: colsB[0] || '' }]);
  const removeCondition = (index) => setConditions(conditions.filter((_, i) => i !== index));
  const updateCondition = (index, field, value) => {
    const newConditions = [...conditions];
    newConditions[index][field] = value;
    setConditions(newConditions);
  };

  const handleSave = () => {
    onSave(entity, {
      type: joinType,
      leftTable: fileA,
      rightTable: fileB,
      conditions: conditions
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-300 text-left">
      <div className="bg-white w-full max-w-2xl rounded-[3rem] shadow-2xl overflow-hidden flex flex-col animate-in zoom-in-95 duration-300 text-left">
        
        {/* HEADER */}
        <div className="p-8 bg-slate-50 border-b border-slate-100 flex justify-between items-center text-left">
          <div className="text-left">
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-[#3C64A3] mb-1 block">{t('l2.modal.subtitle')}</span>
            <h2 className="text-2xl font-black text-slate-800 uppercase italic tracking-tighter text-left">
              {t('l2.modal.title')}: {entity}
            </h2>
          </div>
          <button onClick={onClose} className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-all">
            <HiX className="w-5 h-5" />
          </button>
        </div>

        {/* BODY */}
        <div className="p-10 flex-1 space-y-8 overflow-y-auto custom-scrollbar text-left">
          
          {/* SECCIÓN 1: TIPO DE JOIN */}
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 pl-2 text-left">{t('l2.modal.sec1_title')}</h3>
            <div className="grid grid-cols-3 gap-3">
              {JOIN_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  onClick={() => setJoinType(opt.id)}
                  className={`p-4 rounded-2xl border-2 transition-all text-left flex flex-col gap-1 ${
                    joinType === opt.id 
                    ? 'border-[#3C64A3] bg-blue-50/50' 
                    : 'border-slate-100 hover:border-slate-200'
                  }`}
                >
                  <span className={`text-[10px] font-black uppercase ${joinType === opt.id ? 'text-[#3C64A3]' : 'text-slate-500'}`}>
                    {opt.label}
                  </span>
                  <span className="text-[9px] text-slate-400 leading-tight">{opt.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* SECCIÓN 2: VISUALIZACIÓN DE TABLAS */}
          <div className="flex items-center justify-between gap-4 p-5 bg-slate-50 rounded-[2rem] border border-slate-100">
            <div className="text-center flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('l2.modal.base_table')}</p>
              <p className="text-[10px] font-mono font-bold text-[#3C64A3] truncate">{fileA}</p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white shadow-sm flex items-center justify-center text-[#3C64A3] border border-slate-100">
              <HiOutlineArrowsRightLeft size={20} />
            </div>
            <div className="text-center flex-1">
              <p className="text-[9px] font-black text-slate-400 uppercase mb-1 tracking-widest">{t('l2.modal.target_table')}</p>
              <p className="text-[10px] font-mono font-bold text-[#3C64A3] truncate">{fileB}</p>
            </div>
          </div>

          {/* SECCIÓN 3: KEYS */}
          <div className="space-y-4 text-left">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 pl-2 text-left">{t('l2.modal.sec2_title')}</h3>
            <div className="space-y-3">
              {conditions.map((cond, index) => (
                <div key={index} className="flex items-center gap-3 group">
                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-1">
                     <select 
                      value={cond.left}
                      onChange={(e) => updateCondition(index, 'left', e.target.value)}
                      className="w-full bg-transparent p-3 text-xs font-bold text-slate-600 outline-none cursor-pointer"
                     >
                      {colsA.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                  </div>

                  <div className="text-slate-300 font-black">=</div>

                  <div className="flex-1 bg-white rounded-2xl border border-slate-200 p-1">
                     <select 
                      value={cond.right}
                      onChange={(e) => updateCondition(index, 'right', e.target.value)}
                      className="w-full bg-transparent p-3 text-xs font-bold text-slate-600 outline-none cursor-pointer"
                     >
                      {colsB.map(c => <option key={c} value={c}>{c}</option>)}
                     </select>
                  </div>

                  {conditions.length > 1 && (
                    <button onClick={() => removeCondition(index)} className="p-2 text-slate-300 hover:text-red-500 transition-colors">
                      <HiTrash size={18} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          <button 
            onClick={addCondition}
            className="flex items-center gap-2 px-6 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-[#3C64A3] hover:text-[#3C64A3] transition-all w-full justify-center text-[10px] font-black uppercase tracking-widest"
          >
            <HiPlus className="w-4 h-4" /> {t('l2.modal.btn_add_key')}
          </button>
        </div>

        {/* FOOTER */}
        <div className="p-8 bg-slate-50 border-t border-slate-100 flex gap-4 text-left">
          <button onClick={onClose} className="flex-1 py-4 text-[11px] font-black uppercase tracking-widest text-slate-400">
            {t('common.cancel')}
          </button>
          <button 
            onClick={handleSave}
            className="flex-[2] py-4 bg-slate-900 text-white rounded-[1.5rem] font-black text-[11px] uppercase tracking-[0.2em] flex items-center justify-center gap-2 hover:bg-[#3C64A3] transition-all shadow-xl"
          >
            <HiCheck className="w-5 h-5" /> {t('l2.modal.btn_confirm')}
          </button>
        </div>
      </div>
    </div>
  );
}