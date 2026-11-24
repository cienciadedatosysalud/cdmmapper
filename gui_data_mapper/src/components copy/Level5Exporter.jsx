import React, { useState, useEffect } from 'react';
import { HiOutlineRocketLaunch, HiOutlineArrowDownTray, HiOutlineCommandLine } from 'react-icons/hi2';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

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
    const [isProcessing, setIsProcessing] = useState(false);
    const [currentQuery, setCurrentQuery] = useState("");

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

    // Re-calcula la query cada vez que cambia CUALQUIER decisión previa
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
        if (!entityDef) return "-- No entity definition found";

        const allExpectedFields = entityDef.variables || [];
        const currentMappings = mappedColumnsByEntity[activeEntity] || {};
        const files = mappedEntities[activeEntity] || [];
        const joinConfig = joinsConfigured[activeEntity];
        const entityValueMappings = valueMappings[activeEntity] || {};
        const entityDateFormats = dateFormats[activeEntity] || {};

        if (files.length === 0) return "-- No files assigned to this entity";

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

                // 1. Base Expression (Referencia a columna)
                let baseExpression = `${tableRef}."${colName}"`;

                // 2. Lógica Semántica (CASE WHEN del Level 4)
                const fieldMappings = entityValueMappings[targetField];
                if (fieldMappings && Object.keys(fieldMappings).length > 0) {
                    let caseParts = [`CASE`];
                    Object.entries(fieldMappings).forEach(([srcVal, tgtVal]) => {
                        // Escapamos comillas simples para el SQL
                        const safeSrc = srcVal.replace(/'/g, "''");
                        const safeTgt = tgtVal.replace(/'/g, "''");
                        caseParts.push(`    WHEN ${baseExpression} = '${safeSrc}' THEN '${safeTgt}'`);
                    });
                    caseParts.push(`    ELSE ${baseExpression}`);
                    caseParts.push(`  END`);
                    baseExpression = caseParts.join('\n');
                }

                // 3. Lógica de Fechas (strptime del Level 3)
                if (isDateField) {
                    const pattern = entityDateFormats[targetField];
                    if (pattern) {
                        // 1. Intentamos parsear con el patrón elegido por el usuario
                        // 2. Usamos TRY_CAST para que si falla (ej. falta la hora), no rompa la ejecución
                        return `  TRY_CAST(strptime(${baseExpression}::VARCHAR, '${pattern}') AS ${finalType}) AS "${targetField}"`;
                    } else {
                        // 3. Si no hay patrón, dejamos que DuckDB intente su autodetección estándar (ISO)
                        return `  TRY_CAST(${baseExpression} AS ${finalType}) AS "${targetField}"`;
                    }
                }

                // 4. Cast Final para tipos no-fecha o fechas sin patrón
                return `  TRY_CAST(${baseExpression} AS ${finalType}) AS "${targetField}"`;

            } else {
                // Campo no mapeado -> NULL con el tipo correcto
                return `  CAST(NULL AS ${finalType}) AS "${targetField}"`;
            }
        });

        // Construcción de cláusula FROM / JOIN
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
                throw new Error(data.detail || "Export failed");
            }
        } catch (err) {
            MySwal.fire({
                title: 'Export Failed',
                text: `The engine encountered an issue: ${err.message}`,
                icon: 'error',
                confirmButtonText: 'Review Mappings',
                ...swalConfig, // Esto aplica tus bordes redondeados y colores
                confirmButtonColor: '#EF4444', // Rojo intenso para errores
            });
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="overflow-hidden">
            <div className="flex items-center justify-between">
                <div className="mb-10 flex flex-col">
                    <div className="text-left space-y-4 max-w-6xl">
                        <p className="text-slate-600 text-sm leading-relaxed px-2">
                            You have reached the end of the journey. In this final stage, the system compiles all your structural
                            and semantic decisions into a single, high-performance execution.
                        </p>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="bg-white border border-slate-100 p-6 rounded-[2.5rem] shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <HiOutlineRocketLaunch className="text-[#3C64A3]" size={20} />
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                        Export Engine rules
                                    </p>
                                </div>
                                <p className="text-[12px] text-slate-600 leading-relaxed">
                                    The system generates a standardized **.csv file** by applying your column selections
                                    and value translations. It performs <span className="font-bold text-[#3C64A3]">strict data casting</span>
                                    matching CDM requirements.
                                </p>
                            </div>

                            <div className="bg-[#FED56D]/5 border-l-4 border-[#FED56D] p-6 rounded-r-[2.5rem] shadow-sm">
                                <div className="flex items-center gap-3 mb-3">
                                    <HiOutlineCommandLine className="text-[#EEB141]" size={20} />
                                    <p className="text-[11px] font-black text-slate-800 uppercase tracking-widest">
                                        Reproducible SQL
                                    </p>
                                </div>
                                <p className="text-[12px] text-slate-600 leading-relaxed">
                                    Full transparency via <span className="font-bold text-slate-700">DuckDB-syntax SQL query</span>.
                                    Audit the transformation logic or reproduce it in any DuckDB-compatible environment.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-10 bg-white">
                <div className="flex items-center gap-3 mb-4 text-[#3C64A3]">
                    <HiOutlineCommandLine size={22} />
                    <span className="text-xs font-black uppercase tracking-widest">SQL Preview (Optimized)</span>
                </div>

                <div className="bg-slate-50 rounded-[2.5rem] border-2 border-slate-100 p-8">
                    <div className="max-h-[350px] overflow-y-auto custom-scrollbar">
                        <pre className="text-sm font-mono text-slate-600 leading-relaxed whitespace-pre">
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
                                <span className="italic text-slate-300">-- No mappings detected --</span>
                            )}
                        </pre>
                    </div>
                </div>

                <div className="mt-8 flex items-center justify-between">
                    <div className="flex items-center gap-3 text-[#008C96] opacity-70">
                        <div className="w-2.5 h-2.5 rounded-full bg-[#008C96] animate-pulse" />
                        <span className="text-[10px] font-black uppercase tracking-widest">
                            Server-Side Processing Active
                        </span>
                    </div>
                    <div className="text-[10px] font-bold text-slate-400 uppercase italic">
                        SQL includes nested CASE statements and strptime pattern recognition.
                    </div>
                </div>

                <div className="mt-8">
                    <button
                        onClick={handleExport}
                        disabled={!currentQuery || isProcessing}
                        className="whitespace-nowrap px-10 py-5 rounded-2xl font-black uppercase text-sm tracking-widest bg-[#FED56D] text-[#1D1D1B] hover:bg-[#F5C75D] shadow-lg shadow-yellow-200/50 disabled:opacity-30 transition-all flex items-center gap-3 active:scale-95"
                    >
                        {isProcessing ? "Processing..." : <><HiOutlineArrowDownTray size={20} /> Download CSV</>}
                    </button>
                </div>
            </div>
        </div>
    );
}