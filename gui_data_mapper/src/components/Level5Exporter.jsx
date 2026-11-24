import React, { useState, useEffect } from 'react';
import { HiOutlineRocketLaunch, HiOutlineArrowDownTray, HiOutlineCommandLine } from 'react-icons/hi2';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';
import { useTranslation } from 'react-i18next';

const MySwal = withReactContent(Swal);

export default function Level5Exporter({
    activeEntity,
    entitiesConfig = [],
    mappedEntities = {},
    mappedColumnsByEntity = {},
    joinsConfigured = {},
    dateFormats = {},
    valueMappings = {},
    onSaveQuery
}) {
    const { t } = useTranslation();
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentQuery, setCurrentQuery] = useState("");

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
        const sql = buildQuery();
        if (sql) {
            setCurrentQuery(sql);
            onSaveQuery(activeEntity, sql);
        }
    }, [activeEntity, entitiesConfig, mappedColumnsByEntity, valueMappings, mappedEntities, joinsConfigured, dateFormats]);

    const getDuckDBType = (f) => {
        const type = f?.toLowerCase() || 'string';
        if (type === 'string') return 'VARCHAR';
        if (type === 'boolean') return 'BOOLEAN';
        if (type === 'date') return 'DATE';
        if (type === 'datetime') return 'TIMESTAMP';
        if (type === 'integer') return 'BIGINT';
        if (type === 'double') return 'DOUBLE';
        return 'VARCHAR';
    };

    const buildQuery = () => {
        const entityDef = entitiesConfig?.find(e => e.name === activeEntity);
        if (!entityDef) return "-- " + t('l5.query.no_def');

        const allExpectedFields = entityDef.variables || [];
        const currentMappings = mappedColumnsByEntity[activeEntity] || {};
        const files = mappedEntities[activeEntity] || [];
        const joinConfig = joinsConfigured[activeEntity];
        const entityValueMappings = valueMappings[activeEntity] || {};
        const entityDateFormats = dateFormats[activeEntity] || {};

        if (files.length === 0) return "-- " + t('l5.query.no_files');

        const hasJoin = files.length === 2 && joinConfig;

        const selectParts = allExpectedFields.map(variable => {
            const targetField = variable.label;
            const sourcePath = currentMappings[targetField];
            const finalType = getDuckDBType(variable.format);
            const isDateField = ['date', 'datetime'].includes(variable.format?.toLowerCase());

            if (sourcePath) {
                const parts = sourcePath.split('.');
                const colName = parts.pop();
                const fileName = parts.join('.');

                let tableRef;
                if (hasJoin) {
                    if (fileName === joinConfig.leftTable) tableRef = "T1";
                    else if (fileName === joinConfig.rightTable) tableRef = "T2";
                    else tableRef = `sources."${fileName}"`;
                } else {
                    tableRef = `sources."${fileName}"`;
                }

                let baseExpression = `${tableRef}."${colName}"`;

                // --- CORRECCIÓN MAPEO SEMÁNTICO (SOLO EXCEPCIONES) ---
                const fieldMappings = entityValueMappings[targetField];
                if (fieldMappings) {
                    // Filtramos para quedarnos solo con los que CAMBIAN el valor
                    const explicitChanges = Object.entries(fieldMappings).filter(
                        ([src, tgt]) => {
                            const hasValue = tgt !== null && tgt !== undefined && tgt.toString().trim() !== '';
                            const isDifferent = src.toString().trim() !== tgt.toString().trim();
                            return hasValue && isDifferent;
                        }
                    );

                    if (explicitChanges.length > 0) {
                        let caseParts = [`CASE`];
                        explicitChanges.forEach(([srcVal, tgtVal]) => {
                            const safeSrc = srcVal.replace(/'/g, "''");
                            const safeTgt = tgtVal.replace(/'/g, "''");
                            caseParts.push(`    WHEN ${baseExpression} = '${safeSrc}' THEN '${safeTgt}'`);
                        });
                        caseParts.push(`    ELSE ${baseExpression}`); // Si no hay match, mantenemos el origen
                        caseParts.push(`  END`);
                        baseExpression = caseParts.join('\n');
                    }
                }

                // --- LÓGICA DE FECHAS (Se mantiene igual, usando la baseExpression ya procesada) ---
                if (isDateField) {
                    const pattern = entityDateFormats[targetField];
                    if (pattern) {
                        const rawValue = `${baseExpression}::VARCHAR`;
                        const cleanExpression = `regexp_replace(regexp_replace(regexp_replace(${rawValue}, '99:', '00:', 'g'), ':99', ':00', 'g'), '9999', '0000', 'g')`;
                        return `  TRY_CAST(strptime(${cleanExpression}, '${pattern}') AS ${finalType}) AS "${targetField}"`;
                    } else {
                        return `  TRY_CAST(${baseExpression} AS ${finalType}) AS "${targetField}"`;
                    }
                }

                return `  TRY_CAST(${baseExpression} AS ${finalType}) AS "${targetField}"`;

            } else {
                return `  CAST(NULL AS ${finalType}) AS "${targetField}"`;
            }
        });

        let fromClause = "";
        if (hasJoin) {
            const type = joinConfig.type || "INNER JOIN";
            const conds = joinConfig.conditions
                .map(c => `T1."${c.left}"::VARCHAR = T2."${c.right}"::VARCHAR`)
                .join(" AND ");

            fromClause = `sources."${joinConfig.leftTable}" AS T1\n${type} sources."${joinConfig.rightTable}" AS T2 \n  ON ${conds}`;
        } else {
            fromClause = `sources."${files[0]}"`;
        }

        return `SELECT \n${selectParts.join(',\n')}\nFROM ${fromClause}`;
    };

    const handleExport = async () => {
        const query = buildQuery();
        if (!query) return;
        setIsProcessing(true);

        try {
            const response = await fetch("/api/export-entity", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ entity: activeEntity, query })
            });

            const data = await response.json();
            if (data.download_url) {
                const a = document.createElement('a');
                a.href = data.download_url;
                a.download = `cdm_${activeEntity}.csv`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                throw new Error(data.detail || t('l5.swal.error_msg'));
            }
        } catch (err) {
            MySwal.fire({
                title: t('l5.swal.error_title'),
                text: `${t('l5.swal.error_text')}: ${err.message}`,
                icon: 'error',
                confirmButtonText: t('l5.swal.error_btn'),
                ...swalConfig,
                confirmButtonColor: '#EF4444',
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="overflow-hidden text-left">
            <div className="flex items-center justify-between">
                <div className="mb-10 flex flex-col">
                    <div className="text-left space-y-4 max-w-6xl">
                        <p className="text-slate-600 text-sm leading-relaxed px-2">
                            {t('l5.header.description')}
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <HiOutlineRocketLaunch className="text-[#3C64A3]" size={20} />
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                        {t('l5.cards.rules_title')}
                                    </p>
                                </div>
                                <p className="text-[12px] text-slate-600 leading-relaxed">
                                    {t('l5.cards.rules_text_p1')} <span className="font-bold text-[#3C64A3]">{t('l5.cards.rules_bold')}</span> {t('l5.cards.rules_text_p2')}
                                </p>
                            </div>

                            <div className="bg-[#FED56D]/5 border-l-4 border-[#FED56D] p-6 rounded-r-[2.5rem] shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <HiOutlineCommandLine className="text-[#EEB141]" size={20} />
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                        {t('l5.cards.sql_title')}
                                    </p>
                                </div>
                                <p className="text-[12px] text-slate-600 leading-relaxed">
                                    {t('l5.cards.sql_text_p1')} <span className="font-bold text-slate-700">{t('l5.cards.sql_bold')}</span>. {t('l5.cards.sql_text_p2')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-10 bg-white text-left">
                <div className="flex items-center gap-3 mb-4 text-[#3C64A3]">
                    <HiOutlineCommandLine size={22} />
                    <span className="text-xs font-black uppercase tracking-widest">{t('l5.panel.preview_title')}</span>
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 p-8">
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        <pre className="text-sm font-mono text-slate-600 leading-relaxed whitespace-pre text-left">
                            {currentQuery ? (
                                currentQuery.split('\n').map((line, i) => (
                                    <div key={i} className="hover:bg-blue-50/50 px-2 transition-colors">
                                        <span className="text-slate-300 mr-6 select-none inline-block w-6 text-right">{i + 1}</span>
                                        <span className={line.includes('SELECT') || line.includes('FROM') || line.includes('CASE') ? 'text-[#3C64A3] font-black' : ''}>
                                            {line}
                                        </span>
                                    </div>
                                ))
                            ) : (
                                <span className="italic text-slate-300">-- {t('l5.panel.no_mappings')} --</span>
                            )}
                        </pre>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#008C96] opacity-70">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#008C96] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            {t('l5.panel.server_status')}
                        </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase italic">
                        {t('l5.panel.sql_info')}
                    </div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleExport}
                        disabled={!currentQuery || isProcessing}
                        className="whitespace-nowrap px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-widest bg-[#FED56D] text-[#1D1D1B] hover:bg-[#F5C75D] shadow-lg shadow-yellow-200/50 disabled:opacity-30 transition-all flex items-center gap-3 active:scale-95"
                    >
                        {isProcessing ? t('common.processing') : <><HiOutlineArrowDownTray size={20} /> {t('l5.panel.btn_export')}</>}
                    </button>
                </div>
            </div>
        </div>
    );
}