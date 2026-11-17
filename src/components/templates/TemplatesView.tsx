import React, { useMemo, useState } from 'react';
import { api } from '../../api';
import {
  DesignSpecInstance,
  DesignSpecTemplate,
  MainProject,
  ProjectType,
  SubProject,
  ThemeColor,
  DesignStage,
  SubmissionFile,
} from '../../types';

interface TemplatesViewProps {
  theme: ThemeColor;
  currentMain: MainProject;
  currentSub: SubProject;
  readOnly?: boolean;
  onUpdateMain: (updater: (main: MainProject) => MainProject) => void;
  onUpdateSub: (updater: (sub: SubProject) => SubProject) => void;
}

const disabledInputClass =
  'disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed';

const TemplatesView: React.FC<TemplatesViewProps> = ({
  theme,
  currentMain,
  currentSub,
  readOnly = false,
  onUpdateMain,
  onUpdateSub,
}) => {
  const templates = currentMain.designSpecTemplates || [];
  const designSpecs = currentSub.designSpecs || [];

  const [templateName, setTemplateName] = useState('');
  const [templateProjectType, setTemplateProjectType] = useState<ProjectType>(currentSub.type);
  const [templateStage, setTemplateStage] = useState<DesignStage>(currentSub.stage);
  const [templateDescription, setTemplateDescription] = useState('');
  const [mappingJson, setMappingJson] = useState('');
  const [templateFile, setTemplateFile] = useState<File | null>(null);
  const [templateError, setTemplateError] = useState('');

  const [selectedTemplateId, setSelectedTemplateId] = useState('');
  const [payloadJson, setPayloadJson] = useState(
    '{\n  "项目名称": "",\n  "子项名称": "",\n  "阶段": ""\n}'
  );
  const [generateError, setGenerateError] = useState('');
  const [lastGeneratedId, setLastGeneratedId] = useState('');

  const [selectedDwgFiles, setSelectedDwgFiles] = useState<string[]>([]);
  const [dwgError, setDwgError] = useState('');

  const dwgFiles = useMemo(() => {
    const files: SubmissionFile[] = [];
    currentSub.tasks.forEach(task => {
      task.versions.forEach(version => {
        version.files.forEach(file => {
          const name = file.name || '';
          if (name.toLowerCase().endsWith('.dwg') || file.type?.toLowerCase() === 'dwg') {
            files.push(file);
          }
        });
      });
    });
    const unique = new Map<string, SubmissionFile>();
    files.forEach(file => {
      if (file.id) unique.set(file.id, file);
    });
    return Array.from(unique.values());
  }, [currentSub.tasks]);

  const handleCreateTemplate = async () => {
    if (readOnly) return;
    if (!templateName.trim()) {
      setTemplateError('请输入模板名称');
      return;
    }
    if (!templateFile) {
      setTemplateError('请上传设计说明模板文件（DOCX）');
      return;
    }
    setTemplateError('');
    try {
      const response = await api.uploadFiles(
        `/projects/${currentMain.id}/design-spec-templates`,
        [templateFile],
        {
          name: templateName.trim(),
          projectType: templateProjectType,
          stage: templateStage,
          description: templateDescription.trim(),
          mappingJson: mappingJson.trim(),
        }
      );
      const nextTemplate = response.template as DesignSpecTemplate;
      onUpdateMain(main => ({
        ...main,
        designSpecTemplates: [nextTemplate, ...(main.designSpecTemplates || [])],
      }));
      setTemplateName('');
      setTemplateDescription('');
      setMappingJson('');
      setTemplateFile(null);
    } catch (err) {
      setTemplateError(err instanceof Error ? err.message : '模板上传失败');
    }
  };

  const handleGenerateSpec = async () => {
    if (readOnly) return;
    if (!selectedTemplateId) {
      setGenerateError('请选择设计说明模板');
      return;
    }
    let payload: Record<string, any> = {};
    try {
      payload = payloadJson ? JSON.parse(payloadJson) : {};
    } catch {
      setGenerateError('关键数据 JSON 格式错误');
      return;
    }
    setGenerateError('');
    try {
      const response = await api.post(
        `/projects/${currentMain.id}/subprojects/${currentSub.id}/design-specs/generate`,
        {
          templateId: selectedTemplateId,
          stage: currentSub.stage,
          payload,
        }
      );
      const spec = response.designSpec as DesignSpecInstance;
      setLastGeneratedId(spec.id);
      onUpdateSub(sub => ({
        ...sub,
        designSpecs: [spec, ...(sub.designSpecs || [])],
      }));
    } catch (err) {
      setGenerateError(err instanceof Error ? err.message : '生成失败');
    }
  };

  const handleFillDwg = async () => {
    if (readOnly) return;
    const specId = lastGeneratedId || designSpecs[0]?.id;
    if (!specId) {
      setDwgError('请先生成设计说明，再执行 DWG 填充');
      return;
    }
    if (selectedDwgFiles.length === 0) {
      setDwgError('请选择需要填充的 DWG 文件');
      return;
    }
    setDwgError('');
    try {
      const response = await api.post(
        `/projects/${currentMain.id}/subprojects/${currentSub.id}/design-specs/${specId}/dwg-fill`,
        { fileIds: selectedDwgFiles }
      );
      const spec = response.designSpec as DesignSpecInstance;
      onUpdateSub(sub => ({
        ...sub,
        designSpecs: (sub.designSpecs || []).map(item => (item.id === spec.id ? spec : item)),
      }));
    } catch (err) {
      setDwgError(err instanceof Error ? err.message : 'DWG 填充失败');
    }
  };

  return (
    <div className="p-6 space-y-6">
      {readOnly ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-700">
          当前项目为只读状态，你可以查看模板和生成记录，但不能上传模板、生成说明或批量填充 DWG。
        </div>
      ) : null}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-800">设计说明模板库</h3>
          <p className="text-xs text-slate-500 mt-1">上传标准 DOCX 模板并配置关键数据映射。</p>
          {templateError ? <p className="text-xs text-red-600 mt-2">{templateError}</p> : null}

          <div className="mt-4 space-y-3 text-xs">
            <input
              value={templateName}
              onChange={e => setTemplateName(e.target.value)}
              disabled={readOnly}
              placeholder="模板名称"
              className={`w-full border border-slate-200 rounded-xl px-3 py-2 ${disabledInputClass}`}
            />
            <div className="grid grid-cols-2 gap-2">
              <input
                value={templateProjectType}
                onChange={e => setTemplateProjectType(e.target.value as ProjectType)}
                disabled={readOnly}
                className={`w-full border border-slate-200 rounded-xl px-3 py-2 ${disabledInputClass}`}
              />
              <input
                value={templateStage}
                onChange={e => setTemplateStage(e.target.value as DesignStage)}
                disabled={readOnly}
                className={`w-full border border-slate-200 rounded-xl px-3 py-2 ${disabledInputClass}`}
              />
            </div>
            <input
              value={templateDescription}
              onChange={e => setTemplateDescription(e.target.value)}
              disabled={readOnly}
              placeholder="模板说明（可选）"
              className={`w-full border border-slate-200 rounded-xl px-3 py-2 ${disabledInputClass}`}
            />
            <textarea
              value={mappingJson}
              onChange={e => setMappingJson(e.target.value)}
              disabled={readOnly}
              rows={4}
              placeholder="字段映射 JSON（可选）"
              className={`w-full border border-slate-200 rounded-xl px-3 py-2 resize-none ${disabledInputClass}`}
            />
            <input
              type="file"
              accept=".docx"
              disabled={readOnly}
              onChange={e => setTemplateFile(e.target.files ? e.target.files[0] : null)}
              className={`w-full text-xs ${readOnly ? 'text-slate-400 cursor-not-allowed' : ''}`}
            />
            <button
              onClick={handleCreateTemplate}
              disabled={readOnly}
              className={`w-full py-2 rounded-xl bg-${theme}-600 text-white text-xs font-bold hover:bg-${theme}-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed`}
            >
              上传模板
            </button>
          </div>

          <div className="mt-6">
            <h4 className="text-xs font-bold text-slate-600 mb-2">已上传模板</h4>
            {templates.length === 0 ? (
              <p className="text-xs text-slate-400">暂无模板</p>
            ) : (
              <div className="space-y-2">
                {templates.map(template => (
                  <div key={template.id} className="border border-slate-200 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">{template.name}</span>
                      <span className="text-[10px] text-slate-400">{template.stage}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {template.projectType} · {template.createdBy}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
          <h3 className="text-sm font-black text-slate-800">设计说明生成</h3>
          <p className="text-xs text-slate-500 mt-1">选择模板并填写关键数据，生成 DOCX/PDF。</p>
          {generateError ? <p className="text-xs text-red-600 mt-2">{generateError}</p> : null}

          <div className="mt-4 space-y-3 text-xs">
            <select
              value={selectedTemplateId}
              onChange={e => setSelectedTemplateId(e.target.value)}
              disabled={readOnly}
              className={`w-full border border-slate-200 rounded-xl px-3 py-2 ${disabledInputClass}`}
            >
              <option value="">选择模板</option>
              {templates.map(template => (
                <option key={template.id} value={template.id}>
                  {template.name} · {template.projectType} · {template.stage}
                </option>
              ))}
            </select>
            <textarea
              value={payloadJson}
              onChange={e => setPayloadJson(e.target.value)}
              disabled={readOnly}
              rows={6}
              className={`w-full border border-slate-200 rounded-xl px-3 py-2 font-mono text-[11px] resize-none ${disabledInputClass}`}
            />
            <button
              onClick={handleGenerateSpec}
              disabled={readOnly}
              className={`w-full py-2 rounded-xl bg-${theme}-600 text-white text-xs font-bold hover:bg-${theme}-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed`}
            >
              生成设计说明
            </button>
          </div>

          <div className="mt-6">
            <h4 className="text-xs font-bold text-slate-600 mb-2">生成记录</h4>
            {designSpecs.length === 0 ? (
              <p className="text-xs text-slate-400">暂无生成记录</p>
            ) : (
              <div className="space-y-2">
                {designSpecs.map(spec => (
                  <div key={spec.id} className="border border-slate-200 rounded-xl p-3 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700">版本 {spec.id.slice(0, 6)}</span>
                      <span className="text-[10px] text-slate-400">{spec.stage}</span>
                    </div>
                    <div className="text-[10px] text-slate-400 mt-1">
                      {spec.createdBy} · {spec.createdAt}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm">
        <h3 className="text-sm font-black text-slate-800">DWG 图框批量填充</h3>
        <p className="text-xs text-slate-500 mt-1">选择 DWG 文件，将关键数据写入图框并生成新版本。</p>
        {dwgError ? <p className="text-xs text-red-600 mt-2">{dwgError}</p> : null}

        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="space-y-2 text-xs">
            {dwgFiles.length === 0 ? (
              <p className="text-xs text-slate-400">当前子项暂无 DWG 文件</p>
            ) : (
              dwgFiles.map(file => (
                <label
                  key={file.id}
                  className={`flex items-center gap-2 border border-slate-200 rounded-xl px-3 py-2 ${
                    readOnly ? 'bg-slate-50 text-slate-400' : ''
                  }`}
                >
                  <input
                    type="checkbox"
                    disabled={readOnly}
                    checked={selectedDwgFiles.includes(file.id || '')}
                    onChange={e => {
                      const id = file.id || '';
                      setSelectedDwgFiles(prev =>
                        e.target.checked ? [...prev, id] : prev.filter(item => item !== id)
                      );
                    }}
                  />
                  <span className="truncate">{file.name}</span>
                </label>
              ))
            )}
          </div>
          <div className="flex flex-col justify-between gap-3 text-xs">
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-500">
              默认使用最近一次生成的设计说明版本进行填充。
            </div>
            <button
              onClick={handleFillDwg}
              disabled={readOnly}
              className={`w-full py-2 rounded-xl bg-${theme}-600 text-white text-xs font-bold hover:bg-${theme}-500 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed`}
            >
              批量填充 DWG 图框
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TemplatesView;
