import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import {
  AccountUser,
  EditableSubprojectPermission,
  MainProject,
} from '../types';

interface AccountManagementViewProps {
  users: AccountUser[];
  projects: MainProject[];
  currentUserId: number;
  onRefreshUsers: () => Promise<void>;
}

interface UserDraft {
  role: 'admin' | 'user';
  editableSubprojectPermissions: EditableSubprojectPermission[];
}

interface ImportResult {
  createdCount: number;
  updatedCount: number;
  errorCount: number;
  errors: string[];
}

const makePermissionKey = (projectId: string, subProjectId: string) =>
  `${projectId}::${subProjectId}`;

const hasPermission = (
  permissions: EditableSubprojectPermission[],
  projectId: string,
  subProjectId: string
) =>
  permissions.some(
    permission =>
      permission.projectId === projectId && permission.subProjectId === subProjectId
  );

const togglePermission = (
  permissions: EditableSubprojectPermission[],
  projectId: string,
  subProjectId: string
) => {
  if (hasPermission(permissions, projectId, subProjectId)) {
    return permissions.filter(
      permission =>
        permission.projectId !== projectId || permission.subProjectId !== subProjectId
    );
  }

  return [...permissions, { projectId, subProjectId }];
};

const AccountManagementView: React.FC<AccountManagementViewProps> = ({
  users,
  projects,
  currentUserId,
  onRefreshUsers,
}) => {
  const importInputRef = useRef<HTMLInputElement | null>(null);
  const [newUsername, setNewUsername] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');
  const [newPermissions, setNewPermissions] = useState<EditableSubprojectPermission[]>([]);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [importFile, setImportFile] = useState<File | null>(null);
  const [importError, setImportError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);

  const [drafts, setDrafts] = useState<Record<number, UserDraft>>({});
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [refreshingUsers, setRefreshingUsers] = useState(false);
  const [savingUserId, setSavingUserId] = useState<number | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<number | null>(null);
  const [saveError, setSaveError] = useState('');
  const [deleteError, setDeleteError] = useState('');

  useEffect(() => {
    const nextDrafts: Record<number, UserDraft> = {};
    users.forEach(user => {
      nextDrafts[user.id] = {
        role: user.role,
        editableSubprojectPermissions: [...(user.editableSubprojectPermissions || [])],
      };
    });
    setDrafts(nextDrafts);
  }, [users]);

  useEffect(() => {
    if (!users.length) {
      setSelectedUserId(null);
      return;
    }

    setSelectedUserId(prev =>
      prev && users.some(user => user.id === prev) ? prev : users[0].id
    );
  }, [users]);

  const permissionProjects = useMemo(
    () =>
      [...projects]
        .sort((a, b) =>
          `${a.name || ''}${a.code || ''}`.localeCompare(`${b.name || ''}${b.code || ''}`)
        )
        .map(project => ({
          id: project.id,
          label: `${project.name} (${project.code})`,
          subProjects: [...(project.subProjects || [])]
            .sort((a, b) =>
              `${a.name || ''}${a.code || ''}`.localeCompare(
                `${b.name || ''}${b.code || ''}`
              )
            )
            .map(subProject => ({
              id: subProject.id,
              label: `${subProject.name} (${subProject.code})`,
            })),
        })),
    [projects]
  );

  const permissionLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    permissionProjects.forEach(project => {
      project.subProjects.forEach(subProject => {
        map.set(
          makePermissionKey(project.id, subProject.id),
          `${project.label} / ${subProject.label}`
        );
      });
    });
    return map;
  }, [permissionProjects]);

  const summarizePermissions = (permissions: EditableSubprojectPermission[]) =>
    permissions
      .map(permission =>
        permissionLabelMap.get(
          makePermissionKey(permission.projectId, permission.subProjectId)
        )
      )
      .filter((label): label is string => !!label)
      .sort((a, b) => a.localeCompare(b));

  const selectedUser = useMemo(
    () => users.find(user => user.id === selectedUserId) || null,
    [selectedUserId, users]
  );

  const selectedDraft = useMemo(() => {
    if (!selectedUser) return null;
    return (
      drafts[selectedUser.id] || {
        role: selectedUser.role,
        editableSubprojectPermissions: selectedUser.editableSubprojectPermissions || [],
      }
    );
  }, [drafts, selectedUser]);

  const toggleProjectPermissions = (
    currentPermissions: EditableSubprojectPermission[],
    projectId: string,
    subProjectIds: string[]
  ) => {
    const allSelected =
      subProjectIds.length > 0 &&
      subProjectIds.every(subProjectId =>
        hasPermission(currentPermissions, projectId, subProjectId)
      );

    if (allSelected) {
      return currentPermissions.filter(
        permission =>
          permission.projectId !== projectId ||
          !subProjectIds.includes(permission.subProjectId)
      );
    }

    const next = [...currentPermissions];
    subProjectIds.forEach(subProjectId => {
      if (!hasPermission(next, projectId, subProjectId)) {
        next.push({ projectId, subProjectId });
      }
    });
    return next;
  };

  const handleRefreshUsers = async () => {
    setSaveError('');
    setDeleteError('');
    setRefreshingUsers(true);
    try {
      await onRefreshUsers();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '加载账户列表失败');
    } finally {
      setRefreshingUsers(false);
    }
  };

  const handleCreateUser = async () => {
    const username = newUsername.trim();
    if (!username) {
      setCreateError('请输入用户名');
      return;
    }

    setCreateError('');
    setCreating(true);
    try {
      await api.post('/auth/register', {
        username,
        password: '123456',
        role: newRole,
        editableSubprojectPermissions: newRole === 'admin' ? [] : newPermissions,
      });
      setNewUsername('');
      setNewRole('user');
      setNewPermissions([]);
      await onRefreshUsers();
    } catch (error) {
      setCreateError(error instanceof Error ? error.message : '创建账户失败');
    } finally {
      setCreating(false);
    }
  };

  const handleImportUsers = async () => {
    if (!importFile) {
      setImportError('请先选择 Excel 或 CSV 文件');
      return;
    }

    setImportError('');
    setImporting(true);
    setImportResult(null);
    try {
      const result = (await api.uploadFiles('/auth/import-users', [importFile])) as ImportResult;
      setImportResult({
        createdCount: result.createdCount || 0,
        updatedCount: result.updatedCount || 0,
        errorCount: result.errorCount || 0,
        errors: Array.isArray(result.errors) ? result.errors : [],
      });
      setImportFile(null);
      if (importInputRef.current) {
        importInputRef.current.value = '';
      }
      await onRefreshUsers();
    } catch (error) {
      setImportError(error instanceof Error ? error.message : '批量导入失败');
    } finally {
      setImporting(false);
    }
  };

  const handleSaveUser = async (userId: number) => {
    const draft = drafts[userId];
    if (!draft) return;

    setSaveError('');
    setDeletingUserId(null);
    setSavingUserId(userId);
    try {
      await api.put(`/auth/users/${userId}`, {
        role: draft.role,
        editableSubprojectPermissions:
          draft.role === 'admin' ? [] : draft.editableSubprojectPermissions,
      });
      await onRefreshUsers();
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : '保存账户权限失败');
    } finally {
      setSavingUserId(null);
    }
  };

  const handleDeleteUser = async (userId: number) => {
    if (!window.confirm('确定要删除这个账户吗？删除后无法恢复。')) {
      return;
    }

    setDeleteError('');
    setSavingUserId(null);
    setDeletingUserId(userId);
    try {
      await api.delete(`/auth/users/${userId}`);
      if (selectedUserId === userId) {
        setSelectedUserId(null);
      }
      await onRefreshUsers();
    } catch (error) {
      setDeleteError(error instanceof Error ? error.message : '删除账户失败');
    } finally {
      setDeletingUserId(null);
    }
  };

  const renderPermissionEditor = (
    permissions: EditableSubprojectPermission[],
    onChange: (next: EditableSubprojectPermission[]) => void
  ) => (
    <div className="space-y-3">
      {permissionProjects.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-5 text-xs text-slate-400">
          当前还没有项目。请先创建项目，再给账户分配可编辑子项权限。
        </div>
      ) : (
        permissionProjects.map(project => {
          const selectedCount = project.subProjects.filter(subProject =>
            hasPermission(permissions, project.id, subProject.id)
          ).length;
          const totalCount = project.subProjects.length;

          return (
            <div
              key={project.id}
              className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-black text-slate-800">{project.label}</div>
                  <div className="mt-1 text-[11px] text-slate-400">
                    已选 {selectedCount} / {totalCount} 个可编辑子项
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onChange(
                      toggleProjectPermissions(
                        permissions,
                        project.id,
                        project.subProjects.map(subProject => subProject.id)
                      )
                    )
                  }
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  {selectedCount === totalCount && totalCount > 0
                    ? '清空本项目'
                    : '全选本项目'}
                </button>
              </div>

              <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-2">
                {project.subProjects.map(subProject => (
                  <label
                    key={subProject.id}
                    className="flex items-start gap-2 rounded-xl border border-slate-100 bg-white px-3 py-2 text-xs text-slate-700"
                  >
                    <input
                      type="checkbox"
                      checked={hasPermission(permissions, project.id, subProject.id)}
                      onChange={() =>
                        onChange(togglePermission(permissions, project.id, subProject.id))
                      }
                    />
                    <span>{subProject.label}</span>
                  </label>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );

  const renderPermissionSummary = (draft: UserDraft) => {
    const permissionSummary = summarizePermissions(draft.editableSubprojectPermissions);
    if (draft.role === 'admin') {
      return (
        <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
          管理员拥有所有项目与全部子项的编辑权限。
        </div>
      );
    }
    if (permissionSummary.length === 0) {
      return (
        <div className="text-xs text-slate-400">
          当前未分配可编辑子项，该账户登录后默认只能查看所有项目。
        </div>
      );
    }
    return (
      <div className="flex flex-wrap gap-2">
        {permissionSummary.map(label => (
          <span
            key={label}
            className="rounded-full border border-blue-100 bg-blue-50 px-3 py-1 text-[11px] font-bold text-blue-700"
          >
            {label}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-slate-800">创建账户</h3>
              <p className="mt-1 text-xs text-slate-500">
                新建账户默认密码为 123456。普通账户请勾选可编辑的具体子项；未勾选的项目和子项仍可查看，但不能修改。
              </p>
            </div>

            {createError ? (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {createError}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <input
                value={newUsername}
                onChange={event => setNewUsername(event.target.value)}
                placeholder="用户名"
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />

              <select
                value={newRole}
                onChange={event => {
                  const nextRole = event.target.value as 'admin' | 'user';
                  setNewRole(nextRole);
                  if (nextRole === 'admin') {
                    setNewPermissions([]);
                  }
                }}
                className="w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              >
                <option value="user">普通用户</option>
                <option value="admin">管理员</option>
              </select>
            </div>

            <div className="mt-4">
              {newRole === 'user' ? (
                renderPermissionEditor(newPermissions, setNewPermissions)
              ) : (
                <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                  管理员默认拥有所有项目和子项的查看、编辑与账户管理权限。
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={handleCreateUser}
              disabled={creating}
              className="mt-4 w-full rounded-2xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 disabled:opacity-50"
            >
              {creating ? '创建中...' : '创建账户'}
            </button>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <div>
              <h3 className="text-lg font-black text-slate-800">批量导入账户</h3>
              <p className="mt-1 text-xs text-slate-500">
                支持 .xlsx 和 .csv。列名请按“用户名-密码-账户类型-有权限的项目-有权限的子项”准备；子项可写多个，使用逗号、顿号、分号或换行分隔。
              </p>
            </div>

            {importError ? (
              <div className="mt-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
                {importError}
              </div>
            ) : null}

            {importResult ? (
              <div className="mt-4 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-xs text-emerald-700">
                <div>新建 {importResult.createdCount} 个账户，更新 {importResult.updatedCount} 个账户。</div>
                <div className="mt-1">失败 {importResult.errorCount} 条。</div>
                {importResult.errors.length > 0 ? (
                  <div className="mt-2 space-y-1 text-red-600">
                    {importResult.errors.map(error => (
                      <div key={error}>{error}</div>
                    ))}
                  </div>
                ) : null}
              </div>
            ) : null}

            <div className="mt-4 space-y-3">
              <input
                ref={importInputRef}
                type="file"
                accept=".xlsx,.csv,.txt"
                onChange={event => {
                  setImportFile(event.target.files?.[0] || null);
                  setImportError('');
                }}
                className="block w-full rounded-xl border border-slate-200 px-4 py-3 text-sm"
              />

              <div className="rounded-xl bg-slate-50 px-3 py-3 text-xs text-slate-500">
                示例：
                <div className="mt-1 font-mono text-[11px] text-slate-600">
                  用户名 | 密码 | 账户类型 | 有权限的项目 | 有权限的子项
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleImportUsers}
              disabled={importing}
              className="mt-4 w-full rounded-2xl border border-slate-200 bg-slate-900 py-3 text-sm font-bold text-white hover:bg-slate-800 disabled:opacity-50"
            >
              {importing ? '导入中...' : '开始导入'}
            </button>
          </div>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-black text-slate-800">已有账户与权限</h3>
              <p className="mt-1 text-xs text-slate-500">
                右侧改成列表 + 明细方式。先在列表里选中账户，再在右边查看和调整权限，不会再一人一卡片铺满整页。
              </p>
            </div>
            <button
              type="button"
              onClick={handleRefreshUsers}
              disabled={refreshingUsers}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 disabled:opacity-50"
            >
              {refreshingUsers ? '刷新中...' : '刷新账户列表'}
            </button>
          </div>

          {saveError ? (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              {saveError}
            </div>
          ) : null}

          {deleteError ? (
            <div className="mb-4 rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-xs text-red-600">
              {deleteError}
            </div>
          ) : null}

          {users.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">
              当前没有加载到任何账户。请点击右上角“刷新账户列表”再次获取。
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[300px_minmax(0,1fr)]">
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 text-xs font-bold text-slate-500">
                  账户列表
                </div>
                <div className="max-h-[70vh] overflow-y-auto">
                  {users.map(user => {
                    const draft = drafts[user.id] || {
                      role: user.role,
                      editableSubprojectPermissions: user.editableSubprojectPermissions || [],
                    };
                    const selected = user.id === selectedUserId;
                    const isSelf = user.id === currentUserId;
                    const summaryText =
                      draft.role === 'admin'
                        ? '全部权限'
                        : `${draft.editableSubprojectPermissions.length} 个子项`;

                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => setSelectedUserId(user.id)}
                        className={`flex w-full items-center justify-between gap-3 border-b border-slate-100 px-4 py-3 text-left transition-all ${
                          selected ? 'bg-blue-50' : 'bg-white hover:bg-slate-50'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="truncate text-sm font-black text-slate-800">
                              {user.username}
                            </span>
                            {isSelf ? (
                              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                当前
                              </span>
                            ) : null}
                          </div>
                          <div className="mt-1 text-[11px] text-slate-400">{summaryText}</div>
                        </div>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-600">
                          {draft.role === 'admin' ? '管理员' : '普通用户'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {selectedUser && selectedDraft ? (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black text-slate-800">
                          {selectedUser.username}
                        </span>
                        {selectedUser.id === currentUserId ? (
                          <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                            当前账户
                          </span>
                        ) : null}
                      </div>
                      <div className="mt-1 text-[11px] text-slate-400">
                        新建账户默认密码 123456，用户可在登录后自行修改。
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-3">
                      <select
                        value={selectedDraft.role}
                        disabled={selectedUser.id === currentUserId}
                        onChange={event =>
                          setDrafts(prev => ({
                            ...prev,
                            [selectedUser.id]: {
                              role: event.target.value as 'admin' | 'user',
                              editableSubprojectPermissions:
                                event.target.value === 'admin'
                                  ? []
                                  : selectedDraft.editableSubprojectPermissions,
                            },
                          }))
                        }
                        className="rounded-xl border border-slate-200 px-3 py-2 text-xs disabled:opacity-60"
                      >
                        <option value="user">普通用户</option>
                        <option value="admin">管理员</option>
                      </select>

                      <button
                        type="button"
                        onClick={() => handleSaveUser(selectedUser.id)}
                        disabled={
                          savingUserId === selectedUser.id ||
                          deletingUserId === selectedUser.id
                        }
                        className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 disabled:opacity-50"
                      >
                        {savingUserId === selectedUser.id ? '保存中...' : '保存权限'}
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUser(selectedUser.id)}
                        disabled={
                          selectedUser.id === currentUserId ||
                          savingUserId === selectedUser.id ||
                          deletingUserId === selectedUser.id
                        }
                        className="rounded-xl border border-rose-200 px-4 py-2 text-xs font-bold text-rose-600 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {deletingUserId === selectedUser.id ? '删除中...' : '删除账户'}
                      </button>
                    </div>
                  </div>

                  <div className="mt-4">
                    <div className="mb-2 text-xs font-bold text-slate-600">当前权限</div>
                    {renderPermissionSummary(selectedDraft)}
                  </div>

                  {selectedDraft.role === 'user' ? (
                    <div className="mt-4">
                      {renderPermissionEditor(
                        selectedDraft.editableSubprojectPermissions,
                        nextPermissions =>
                          setDrafts(prev => ({
                            ...prev,
                            [selectedUser.id]: {
                              ...selectedDraft,
                              editableSubprojectPermissions: nextPermissions,
                            },
                          }))
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AccountManagementView;
