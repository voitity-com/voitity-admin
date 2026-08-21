import * as React from 'react';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import FormControl from '@mui/material/FormControl';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select from '@mui/material/Select';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { ArrowsOutCardinal as ArrowsOutCardinalIcon } from '@phosphor-icons/react/dist/ssr/ArrowsOutCardinal';
import { Plus as PlusIcon } from '@phosphor-icons/react/dist/ssr/Plus';
import { Trash as TrashIcon } from '@phosphor-icons/react/dist/ssr/Trash';
import { useTranslation } from 'react-i18next';

import type { BusinessFlowGraph, BusinessFlowNode, BusinessNodeType } from '@/lib/business/api-client';
import { getCanvasBounds, getEdgePath } from '@/lib/business/flow-utils';

const nodeColors: Record<BusinessNodeType, string> = { action: '#F97316', decision: '#8B5CF6', instruction: '#0EA5E9' };

interface CanvasPanState {
  pointerId: number;
  scrollLeft: number;
  scrollTop: number;
  x: number;
  y: number;
}

function getInstructionMessages(config: Record<string, unknown>): { en: string; es: string } {
  const messages = config.messages && typeof config.messages === 'object' ? config.messages as Record<string, unknown> : {};

  return {
    en: String(messages.en ?? ''),
    es: String(messages.es ?? config.message ?? ''),
  };
}

function getDecisionQuestions(config: Record<string, unknown>): { en: string; es: string } {
  const questions = config.questions && typeof config.questions === 'object' ? config.questions as Record<string, unknown> : {};

  return {
    en: String(questions.en ?? ''),
    es: String(questions.es ?? config.question ?? ''),
  };
}

function getDecisionBranches(mode: string): string[] {
  return mode === 'required_fields_complete' ? ['complete', 'incomplete'] : ['yes', 'no'];
}

export function BusinessFlowEditor({ graph, onChange }: { graph: BusinessFlowGraph; onChange: (graph: BusinessFlowGraph) => void }): React.JSX.Element {
  const { i18n, t } = useTranslation();
  const viewportRef = React.useRef<HTMLDivElement | null>(null);
  const didCenterRef = React.useRef(false);
  const panStateRef = React.useRef<CanvasPanState | null>(null);
  const [selectedKey, setSelectedKey] = React.useState(graph.nodes.find((node) => node.config.start)?.key ?? graph.nodes[0]?.key ?? '');
  const [targetKey, setTargetKey] = React.useState('');
  const [branch, setBranch] = React.useState('');
  const [isPanning, setIsPanning] = React.useState(false);
  const bounds = React.useMemo(() => getCanvasBounds(graph.nodes), [graph.nodes]);
  const selected = graph.nodes.find((node) => node.key === selectedKey) ?? null;

  React.useEffect(() => {
    if (didCenterRef.current) return;
    const viewport = viewportRef.current;
    const start = graph.nodes.find((node) => node.config.start) ?? graph.nodes[0];
    if (viewport && start) {
      viewport.scrollLeft = start.x + bounds.offsetX - viewport.clientWidth / 3;
      viewport.scrollTop = start.y + bounds.offsetY - viewport.clientHeight / 3;
      didCenterRef.current = true;
    }
  }, [bounds.offsetX, bounds.offsetY, graph.nodes]);

  const updateNode = (key: string, patch: Partial<BusinessFlowNode>): void => {
    onChange({ ...graph, nodes: graph.nodes.map((node) => node.key === key ? { ...node, ...patch } : node) });
  };
  const updateConfig = (key: string, patch: Record<string, unknown>): void => {
    const node = graph.nodes.find((item) => item.key === key);
    if (node) updateNode(key, { config: { ...node.config, ...patch } });
  };
  const changeDecisionMode = (key: string, mode: string): void => {
    const node = graph.nodes.find((item) => item.key === key);
    if (!node) return;
    const questions = getDecisionQuestions(node.config);
    const config = mode === 'knowledge_yes_no'
      ? { ...node.config, branches: getDecisionBranches(mode), mode, question: questions.es, questions, use_business_description: true, use_sources: true }
      : { ...node.config, branches: getDecisionBranches(mode), mode };
    onChange({
      edges: graph.edges.filter((edge) => edge.source !== key),
      nodes: graph.nodes.map((item) => item.key === key ? { ...item, config } : item),
    });
    setBranch('');
    setTargetKey('');
  };
  const addNode = (type: BusinessNodeType): void => {
    const viewport = viewportRef.current;
    const key = `${type}-${Date.now()}`;
    const x = viewport ? viewport.scrollLeft - bounds.offsetX + viewport.clientWidth / 2 : 0;
    const y = viewport ? viewport.scrollTop - bounds.offsetY + viewport.clientHeight / 2 : 0;
    const config = type === 'instruction' ? { message: '', messages: { en: '', es: '' }, wait_for_input: true } : type === 'decision' ? { branches: ['yes', 'no'], mode: 'knowledge_yes_no', question: '', questions: { en: '', es: '' }, use_business_description: true, use_sources: true } : { action: 'extract_fields', required_fields: ['full_name', 'email', 'phone', 'whatsapp', 'project_summary'] };
    onChange({ ...graph, nodes: [...graph.nodes, { config, key, title: t(`dashboard.business.flow.types.${type}`), type, x: Math.round(x), y: Math.round(y) }] });
    setSelectedKey(key);
  };
  const deleteNode = (key: string): void => {
    onChange({ nodes: graph.nodes.filter((node) => node.key !== key), edges: graph.edges.filter((edge) => edge.source !== key && edge.target !== key) });
    setSelectedKey('');
  };
  const beginDrag = (event: React.PointerEvent, node: BusinessFlowNode): void => {
    if ((event.target as HTMLElement).closest('button,input,textarea')) return;
    event.preventDefault();
    const startX = event.clientX; const startY = event.clientY; const originalX = node.x; const originalY = node.y;
    const move = (moveEvent: PointerEvent): void => { updateNode(node.key, { x: Math.round(originalX + moveEvent.clientX - startX), y: Math.round(originalY + moveEvent.clientY - startY) }); };
    const up = (): void => { window.removeEventListener('pointermove', move); window.removeEventListener('pointerup', up); };
    window.addEventListener('pointermove', move); window.addEventListener('pointerup', up);
  };
  const beginCanvasPan = (event: React.PointerEvent<HTMLDivElement>): void => {
    if (event.button !== 0 || (event.target as HTMLElement).closest('[data-flow-node]')) return;
    const viewport = viewportRef.current;
    if (!viewport) return;

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    panStateRef.current = {
      pointerId: event.pointerId,
      scrollLeft: viewport.scrollLeft,
      scrollTop: viewport.scrollTop,
      x: event.clientX,
      y: event.clientY,
    };
    setIsPanning(true);
  };
  const moveCanvasPan = (event: React.PointerEvent<HTMLDivElement>): void => {
    const viewport = viewportRef.current;
    const pan = panStateRef.current;
    if (!viewport || !pan || pan.pointerId !== event.pointerId) return;

    viewport.scrollLeft = pan.scrollLeft - (event.clientX - pan.x);
    viewport.scrollTop = pan.scrollTop - (event.clientY - pan.y);
  };
  const endCanvasPan = (event: React.PointerEvent<HTMLDivElement>): void => {
    const pan = panStateRef.current;
    if (!pan || pan.pointerId !== event.pointerId) return;

    panStateRef.current = null;
    setIsPanning(false);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const addEdge = (): void => {
    if (!selected || !targetKey || selected.key === targetKey || (selected.type === 'decision' && !branch)) return;
    const sourceHandle = selected.type === 'decision' ? branch : null;
    const key = `${selected.key}-${targetKey}-${sourceHandle ?? 'default'}-${Date.now()}`;
    const compatibleEdges = selected.type === 'decision'
      ? graph.edges.filter((edge) => edge.source !== selected.key || edge.source_handle !== sourceHandle)
      : graph.edges;
    onChange({ ...graph, edges: [...compatibleEdges, { config: {}, key, label: sourceHandle, source: selected.key, source_handle: sourceHandle, target: targetKey }] });
    setTargetKey(''); setBranch('');
  };

  return (
    <Stack spacing={2}>
      <Alert icon={<ArrowsOutCardinalIcon />} severity="info">{t('dashboard.business.flow.navigationHelp')}</Alert>
      <Stack direction={{ lg: 'row', xs: 'column' }} spacing={2}>
        <Stack spacing={1} sx={{ flex: '0 0 auto', width: { lg: 170, xs: '100%' } }}>
          <Typography variant="subtitle2">{t('dashboard.business.flow.addNode')}</Typography>
          {(['instruction', 'decision', 'action'] as BusinessNodeType[]).map((type) => <Button key={type} onClick={() => { addNode(type); }} startIcon={<PlusIcon />} sx={{ borderColor: nodeColors[type], color: nodeColors[type], justifyContent: 'flex-start' }} variant="outlined">{t(`dashboard.business.flow.types.${type}`)}</Button>)}
          <Divider />
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>{(['instruction', 'decision', 'action'] as BusinessNodeType[]).map((type) => <Chip key={type} label={t(`dashboard.business.flow.types.${type}`)} size="small" sx={{ bgcolor: `${nodeColors[type]}18`, color: nodeColors[type] }} />)}</Stack>
        </Stack>

        <Box
          aria-label={String(t('dashboard.business.flow.canvasLabel'))}
          onLostPointerCapture={endCanvasPan}
          onPointerCancel={endCanvasPan}
          onPointerDown={beginCanvasPan}
          onPointerMove={moveCanvasPan}
          onPointerUp={endCanvasPan}
          ref={viewportRef}
          role="region"
          sx={{
            bgcolor: 'background.level1',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
            cursor: isPanning ? 'grabbing' : 'grab',
            flex: '1 1 auto',
            height: 720,
            minWidth: 0,
            overflow: 'auto',
            overscrollBehavior: 'contain',
            touchAction: 'none',
            userSelect: 'none',
          }}
        >
          <Box sx={{ backgroundImage: 'radial-gradient(circle, rgba(120,120,140,.24) 1px, transparent 1px)', backgroundSize: '24px 24px', height: bounds.height, position: 'relative', width: bounds.width }}>
            <Box component="svg" sx={{ height: '100%', left: 0, overflow: 'visible', pointerEvents: 'none', position: 'absolute', top: 0, width: '100%' }}>
              <defs><marker id="business-arrow" markerHeight="8" markerWidth="8" orient="auto" refX="7" refY="4"><path d="M0,0 L8,4 L0,8 z" fill="#64748B" /></marker></defs>
              {graph.edges.map((edge) => { const source = graph.nodes.find((node) => node.key === edge.source); const target = graph.nodes.find((node) => node.key === edge.target); if (!source || !target) return null; const path = getEdgePath(source, target, bounds.offsetX, bounds.offsetY); const labelX = (source.x + target.x) / 2 + bounds.offsetX + 120; const labelY = (source.y + target.y) / 2 + bounds.offsetY + 45; return <g key={edge.key}><path d={path} fill="none" markerEnd="url(#business-arrow)" stroke="#64748B" strokeWidth="2" /><text fill="#475569" fontSize="12" fontWeight="600" x={labelX} y={labelY}>{edge.label}</text></g>; })}
            </Box>
            {graph.nodes.map((node) => <Card data-flow-node key={node.key} onClick={() => { setSelectedKey(node.key); }} onPointerDown={(event) => { beginDrag(event, node); }} sx={{ border: '2px solid', borderColor: selectedKey === node.key ? nodeColors[node.type] : 'divider', boxShadow: selectedKey === node.key ? `0 0 0 4px ${nodeColors[node.type]}24` : 2, cursor: 'grab', left: node.x + bounds.offsetX, position: 'absolute', top: node.y + bounds.offsetY, touchAction: 'none', userSelect: 'none', width: 240, '&:active': { cursor: 'grabbing' } }}><CardContent sx={{ p: '14px !important' }}><Stack spacing={1}><Stack direction="row" spacing={0.5} sx={{ alignItems: 'center', justifyContent: 'space-between' }}><Chip label={t(`dashboard.business.flow.types.${node.type}`)} size="small" sx={{ bgcolor: `${nodeColors[node.type]}18`, color: nodeColors[node.type] }} /><Stack direction="row" spacing={0.5}>{node.config.visibility === 'internal' ? <Chip color="warning" label={t('dashboard.business.flow.internal')} size="small" /> : null}{node.config.start ? <Chip color="success" label={t('dashboard.business.flow.start')} size="small" /> : null}</Stack></Stack><Typography noWrap variant="subtitle2">{node.title}</Typography><Typography color="text.secondary" sx={{ display: '-webkit-box', overflow: 'hidden', WebkitBoxOrient: 'vertical', WebkitLineClamp: 2 }} variant="caption">{node.type === 'instruction' ? getInstructionMessages(node.config)[i18n.resolvedLanguage === 'en' ? 'en' : 'es'] : node.type === 'decision' && node.config.mode === 'knowledge_yes_no' ? getDecisionQuestions(node.config)[i18n.resolvedLanguage === 'en' ? 'en' : 'es'] : node.type === 'decision' ? String(node.config.mode ?? '') : String(node.config.action ?? '')}</Typography></Stack></CardContent></Card>)}
          </Box>
        </Box>

        <Card sx={{ flex: '0 0 auto', width: { lg: 300, xs: '100%' } }}><CardContent><Stack spacing={2}><Typography variant="h6">{t('dashboard.business.flow.inspector')}</Typography>{selected ? <React.Fragment>
          <TextField label={t('dashboard.business.flow.nodeTitle')} onChange={(event) => { updateNode(selected.key, { title: event.target.value }); }} value={selected.title} />
          <FormControlLabel control={<Switch checked={Boolean(selected.config.start)} onChange={(_, checked) => { onChange({ ...graph, nodes: graph.nodes.map((node) => ({ ...node, config: { ...node.config, start: node.key === selected.key ? checked : checked ? false : node.config.start } })) }); }} />} label={t('dashboard.business.flow.start')} />
          {selected.type === 'instruction' ? <React.Fragment><Typography color="text.secondary" variant="caption">{t('dashboard.business.flow.messagesHelp')}</Typography><TextField label={t('dashboard.business.flow.messageEs')} multiline onChange={(event) => { const messages = getInstructionMessages(selected.config); updateConfig(selected.key, { message: event.target.value, messages: { ...messages, es: event.target.value } }); }} rows={4} value={getInstructionMessages(selected.config).es} /><TextField label={t('dashboard.business.flow.messageEn')} multiline onChange={(event) => { const messages = getInstructionMessages(selected.config); updateConfig(selected.key, { messages: { ...messages, en: event.target.value } }); }} rows={4} value={getInstructionMessages(selected.config).en} /><FormControlLabel control={<Switch checked={Boolean(selected.config.wait_for_input)} onChange={(_, checked) => { updateConfig(selected.key, { wait_for_input: checked }); }} />} label={t('dashboard.business.flow.waitForInput')} />{selected.config.wait_for_input ? <React.Fragment><TextField helperText={t('dashboard.business.flow.instructionRequiredFieldsHelp')} label={t('dashboard.business.flow.requiredFields')} onChange={(event) => { updateConfig(selected.key, { required_fields: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) }); }} value={((selected.config.required_fields as string[] | undefined) ?? []).join(', ')} /><TextField helperText={t('dashboard.business.flow.instructionOptionalFieldsHelp')} label={t('dashboard.business.flow.optionalFields')} onChange={(event) => { updateConfig(selected.key, { optional_fields: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) }); }} value={((selected.config.optional_fields as string[] | undefined) ?? []).join(', ')} /></React.Fragment> : null}</React.Fragment> : null}
          {selected.type === 'decision' ? <React.Fragment><FormControl><InputLabel>{t('dashboard.business.flow.decisionMode')}</InputLabel><Select label={t('dashboard.business.flow.decisionMode')} onChange={(event) => { changeDecisionMode(selected.key, event.target.value); }} value={String(selected.config.mode ?? 'knowledge_yes_no')}>{selected.config.mode === 'technology_interest' ? <MenuItem disabled value="technology_interest">technology_interest ({t('dashboard.business.flow.legacy')})</MenuItem> : null}<MenuItem value="knowledge_yes_no">{t('dashboard.business.flow.decisionModes.knowledgeYesNo')}</MenuItem><MenuItem value="required_fields_complete">{t('dashboard.business.flow.decisionModes.requiredFields')}</MenuItem></Select></FormControl>{selected.config.mode === 'knowledge_yes_no' ? <React.Fragment><Typography color="text.secondary" variant="caption">{t('dashboard.business.flow.decisionQuestionHelp')}</Typography><TextField label={t('dashboard.business.flow.questionEs')} multiline onChange={(event) => { const questions = getDecisionQuestions(selected.config); updateConfig(selected.key, { question: event.target.value, questions: { ...questions, es: event.target.value } }); }} rows={3} value={getDecisionQuestions(selected.config).es} /><TextField label={t('dashboard.business.flow.questionEn')} multiline onChange={(event) => { const questions = getDecisionQuestions(selected.config); updateConfig(selected.key, { questions: { ...questions, en: event.target.value } }); }} rows={3} value={getDecisionQuestions(selected.config).en} /><FormControlLabel control={<Switch checked={selected.config.use_business_description !== false} onChange={(_, checked) => { updateConfig(selected.key, { use_business_description: checked }); }} />} label={t('dashboard.business.flow.useBusinessDescription')} /><FormControlLabel control={<Switch checked={selected.config.use_sources !== false} onChange={(_, checked) => { updateConfig(selected.key, { use_sources: checked }); }} />} label={t('dashboard.business.flow.useSources')} /></React.Fragment> : null}<Stack direction="row" spacing={1} sx={{ alignItems: 'center', flexWrap: 'wrap' }}><Typography color="text.secondary" variant="caption">{t('dashboard.business.flow.fixedBranches')}</Typography>{((selected.config.branches as string[] | undefined) ?? getDecisionBranches(String(selected.config.mode))).map((value) => <Chip key={value} label={value} size="small" />)}</Stack>{selected.config.mode === 'required_fields_complete' ? <TextField helperText={t('dashboard.business.flow.requiredFieldsHelp')} label={t('dashboard.business.flow.requiredFields')} onChange={(event) => { updateConfig(selected.key, { required_fields: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) }); }} value={((selected.config.required_fields as string[] | undefined) ?? []).join(', ')} /> : null}</React.Fragment> : null}
          {selected.type === 'action' ? <React.Fragment><FormControl><InputLabel>{t('dashboard.business.flow.actionType')}</InputLabel><Select label={t('dashboard.business.flow.actionType')} onChange={(event) => { const action = event.target.value; updateConfig(selected.key, { action, visibility: action === 'analyze_solution' ? 'internal' : undefined }); }} value={String(selected.config.action ?? 'extract_fields')}><MenuItem value="capture_problem">capture_problem</MenuItem><MenuItem value="extract_fields">extract_fields</MenuItem><MenuItem value="analyze_solution">analyze_solution</MenuItem><MenuItem value="finalize_lead">finalize_lead</MenuItem></Select></FormControl>{selected.config.action === 'extract_fields' ? <React.Fragment><TextField helperText={t('dashboard.business.flow.requiredFieldsHelp')} label={t('dashboard.business.flow.requiredFields')} onChange={(event) => { updateConfig(selected.key, { required_fields: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) }); }} value={((selected.config.required_fields as string[] | undefined) ?? []).join(', ')} /><TextField helperText={t('dashboard.business.flow.optionalFieldsHelp')} label={t('dashboard.business.flow.optionalFields')} onChange={(event) => { updateConfig(selected.key, { optional_fields: event.target.value.split(',').map((value) => value.trim()).filter(Boolean) }); }} value={((selected.config.optional_fields as string[] | undefined) ?? []).join(', ')} /></React.Fragment> : null}</React.Fragment> : null}
          <Divider /><Typography variant="subtitle2">{t('dashboard.business.flow.connections')}</Typography><FormControl><InputLabel>{t('dashboard.business.flow.target')}</InputLabel><Select label={t('dashboard.business.flow.target')} onChange={(event) => { setTargetKey(event.target.value); }} value={targetKey}>{graph.nodes.filter((node) => node.key !== selected.key).map((node) => <MenuItem key={node.key} value={node.key}>{node.title}</MenuItem>)}</Select></FormControl>{selected.type === 'decision' ? <FormControl><InputLabel>{t('dashboard.business.flow.branch')}</InputLabel><Select label={t('dashboard.business.flow.branch')} onChange={(event) => { setBranch(event.target.value); }} value={branch}>{((selected.config.branches as string[] | undefined) ?? []).map((value) => <MenuItem key={value} value={value}>{value}</MenuItem>)}</Select></FormControl> : null}<Button disabled={!targetKey || (selected.type === 'decision' && !branch)} onClick={addEdge} variant="outlined">{t('dashboard.business.flow.connect')}</Button>
          {graph.edges.filter((edge) => edge.source === selected.key || edge.target === selected.key).map((edge) => <Stack direction="row" key={edge.key} spacing={1} sx={{ alignItems: 'center' }}><Typography noWrap sx={{ flex: 1 }} variant="caption">{edge.source} → {edge.target} {edge.label ? `(${edge.label})` : ''}</Typography><Button color="error" onClick={() => { onChange({ ...graph, edges: graph.edges.filter((item) => item.key !== edge.key) }); }} size="small"><TrashIcon /></Button></Stack>)}
          <Button color="error" onClick={() => { deleteNode(selected.key); }} startIcon={<TrashIcon />}>{t('dashboard.business.flow.deleteNode')}</Button>
        </React.Fragment> : <Typography color="text.secondary">{t('dashboard.business.flow.selectNode')}</Typography>}</Stack></CardContent></Card>
      </Stack>
    </Stack>
  );
}
