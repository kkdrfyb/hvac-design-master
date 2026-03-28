PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;
CREATE TABLE migrations (
    domain TEXT,
    step INTEGER,
    migration TEXT
);
INSERT INTO migrations VALUES('KeyValueStore',0,'CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;');
INSERT INTO migrations VALUES('WorkspaceDb',0,unistr('CREATE TABLE workspaces (\u000a  workspace_id INTEGER PRIMARY KEY,\u000a  workspace_location BLOB UNIQUE,\u000a  dock_visible INTEGER,\u000a  dock_anchor TEXT,\u000a  dock_pane INTEGER,\u000a  left_sidebar_open INTEGER,\u000a  timestamp TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,\u000a  FOREIGN KEY (dock_pane) REFERENCES panes (pane_id)\u000a) STRICT;\u000aCREATE TABLE pane_groups (\u000a  group_id INTEGER PRIMARY KEY,\u000a  workspace_id INTEGER NOT NULL,\u000a  parent_group_id INTEGER,\u000a  position INTEGER,\u000a  axis TEXT NOT NULL,\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE,\u000a  FOREIGN KEY (parent_group_id) REFERENCES pane_groups (group_id) ON DELETE CASCADE\u000a) STRICT;\u000aCREATE TABLE panes (\u000a  pane_id INTEGER PRIMARY KEY,\u000a  workspace_id INTEGER NOT NULL,\u000a  active INTEGER NOT NULL,\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE\u000a) STRICT;\u000aCREATE TABLE center_panes (\u000a  pane_id INTEGER PRIMARY KEY,\u000a  parent_group_id INTEGER,\u000a  position INTEGER,\u000a  FOREIGN KEY (pane_id) REFERENCES panes (pane_id) ON DELETE CASCADE,\u000a  FOREIGN KEY (parent_group_id) REFERENCES pane_groups (group_id) ON DELETE CASCADE\u000a) STRICT;\u000aCREATE TABLE items (\u000a  item_id INTEGER NOT NULL,\u000a  workspace_id INTEGER NOT NULL,\u000a  pane_id INTEGER NOT NULL,\u000a  kind TEXT NOT NULL,\u000a  position INTEGER NOT NULL,\u000a  active INTEGER NOT NULL,\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE,\u000a  FOREIGN KEY (pane_id) REFERENCES panes (pane_id) ON DELETE CASCADE,\u000a  PRIMARY KEY (item_id, workspace_id)\u000a) STRICT;'));
INSERT INTO migrations VALUES('WorkspaceDb',1,unistr('ALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN window_state TEXT;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN window_x REAL;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN window_y REAL;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN window_width REAL;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN window_height REAL;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN display BLOB;'));
INSERT INTO migrations VALUES('WorkspaceDb',2,unistr('CREATE TABLE workspaces_2 (\u000a  workspace_id INTEGER PRIMARY KEY,\u000a  workspace_location BLOB UNIQUE,\u000a  dock_visible INTEGER,\u000a  dock_anchor TEXT,\u000a  dock_pane INTEGER,\u000a  left_sidebar_open INTEGER,\u000a  timestamp TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,\u000a  window_state TEXT,\u000a  window_x REAL,\u000a  window_y REAL,\u000a  window_width REAL,\u000a  window_height REAL,\u000a  display BLOB\u000a) STRICT;\u000aINSERT INTO\u000a  workspaces_2\u000aSELECT\u000a  *\u000aFROM\u000a  workspaces;\u000aDROP TABLE workspaces;\u000aALTER TABLE\u000a  workspaces_2 RENAME TO workspaces;'));
INSERT INTO migrations VALUES('WorkspaceDb',3,unistr('ALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN left_dock_visible INTEGER;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN left_dock_active_panel TEXT;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN right_dock_visible INTEGER;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN right_dock_active_panel TEXT;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN bottom_dock_visible INTEGER;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN bottom_dock_active_panel TEXT;'));
INSERT INTO migrations VALUES('WorkspaceDb',4,unistr('ALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN left_dock_zoom INTEGER;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN right_dock_zoom INTEGER;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN bottom_dock_zoom INTEGER;'));
INSERT INTO migrations VALUES('WorkspaceDb',5,unistr('ALTER TABLE\u000a  pane_groups\u000aADD\u000a  COLUMN flexes TEXT;'));
INSERT INTO migrations VALUES('WorkspaceDb',6,unistr('ALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN fullscreen INTEGER;'));
INSERT INTO migrations VALUES('WorkspaceDb',7,unistr('ALTER TABLE\u000a  items\u000aADD\u000a  COLUMN preview INTEGER;'));
INSERT INTO migrations VALUES('WorkspaceDb',8,unistr('ALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN centered_layout INTEGER;'));
INSERT INTO migrations VALUES('WorkspaceDb',9,unistr('CREATE TABLE remote_projects (\u000a  remote_project_id INTEGER NOT NULL UNIQUE,\u000a  path TEXT,\u000a  dev_server_name TEXT\u000a);\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN remote_project_id INTEGER;\u000aALTER TABLE\u000a  workspaces RENAME COLUMN workspace_location TO local_paths;'));
INSERT INTO migrations VALUES('WorkspaceDb',10,unistr('DROP TABLE remote_projects;\u000aCREATE TABLE dev_server_projects (\u000a  id INTEGER NOT NULL UNIQUE,\u000a  path TEXT,\u000a  dev_server_name TEXT\u000a);\u000aALTER TABLE\u000a  workspaces DROP COLUMN remote_project_id;\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN dev_server_project_id INTEGER;'));
INSERT INTO migrations VALUES('WorkspaceDb',11,unistr('ALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN local_paths_order BLOB;'));
INSERT INTO migrations VALUES('WorkspaceDb',12,unistr('ALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN session_id TEXT DEFAULT NULL;'));
INSERT INTO migrations VALUES('WorkspaceDb',13,unistr('ALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN window_id INTEGER DEFAULT NULL;'));
INSERT INTO migrations VALUES('WorkspaceDb',14,unistr('ALTER TABLE\u000a  panes\u000aADD\u000a  COLUMN pinned_count INTEGER DEFAULT 0;'));
INSERT INTO migrations VALUES('WorkspaceDb',15,unistr('CREATE TABLE ssh_projects (\u000a  id INTEGER PRIMARY KEY,\u000a  host TEXT NOT NULL,\u000a  port INTEGER,\u000a  path TEXT NOT NULL,\u000a  user TEXT\u000a);\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN ssh_project_id INTEGER REFERENCES ssh_projects (id) ON DELETE CASCADE;'));
INSERT INTO migrations VALUES('WorkspaceDb',16,unistr('ALTER TABLE\u000a  ssh_projects RENAME COLUMN path TO paths;'));
INSERT INTO migrations VALUES('WorkspaceDb',17,unistr('CREATE TABLE toolchains (\u000a  workspace_id INTEGER,\u000a  worktree_id INTEGER,\u000a  language_name TEXT NOT NULL,\u000a  name TEXT NOT NULL,\u000a  path TEXT NOT NULL,\u000a  PRIMARY KEY (workspace_id, worktree_id, language_name)\u000a);'));
INSERT INTO migrations VALUES('WorkspaceDb',18,unistr('ALTER TABLE\u000a  toolchains\u000aADD\u000a  COLUMN raw_json TEXT DEFAULT "{}";'));
INSERT INTO migrations VALUES('WorkspaceDb',19,unistr('CREATE TABLE breakpoints (\u000a  workspace_id INTEGER NOT NULL,\u000a  path TEXT NOT NULL,\u000a  breakpoint_location INTEGER NOT NULL,\u000a  kind INTEGER NOT NULL,\u000a  log_message TEXT,\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE\u000a);'));
INSERT INTO migrations VALUES('WorkspaceDb',20,unistr('ALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN local_paths_array TEXT;\u000aCREATE UNIQUE INDEX local_paths_array_uq ON workspaces (local_paths_array);\u000aALTER TABLE\u000a  workspaces\u000aADD\u000a  COLUMN local_paths_order_array TEXT;'));
INSERT INTO migrations VALUES('WorkspaceDb',21,unistr('ALTER TABLE\u000a  breakpoints\u000aADD\u000a  COLUMN state INTEGER DEFAULT (0) NOT NULL'));
INSERT INTO migrations VALUES('WorkspaceDb',22,unistr('ALTER TABLE\u000a  breakpoints DROP COLUMN kind'));
INSERT INTO migrations VALUES('WorkspaceDb',23,unistr('ALTER TABLE\u000a  toolchains\u000aADD\u000a  COLUMN relative_worktree_path TEXT DEFAULT "" NOT NULL'));
INSERT INTO migrations VALUES('WorkspaceDb',24,unistr('ALTER TABLE\u000a  breakpoints\u000aADD\u000a  COLUMN condition TEXT;\u000aALTER TABLE\u000a  breakpoints\u000aADD\u000a  COLUMN hit_condition TEXT;'));
INSERT INTO migrations VALUES('WorkspaceDb',25,unistr('CREATE TABLE toolchains2 (\u000a  workspace_id INTEGER,\u000a  worktree_id INTEGER,\u000a  language_name TEXT NOT NULL,\u000a  name TEXT NOT NULL,\u000a  path TEXT NOT NULL,\u000a  raw_json TEXT NOT NULL,\u000a  relative_worktree_path TEXT NOT NULL,\u000a  PRIMARY KEY (\u000a    workspace_id,\u000a    worktree_id,\u000a    language_name,\u000a    relative_worktree_path\u000a  )\u000a) STRICT;\u000aINSERT INTO\u000a  toolchains2\u000aSELECT\u000a  *\u000aFROM\u000a  toolchains;\u000aDROP TABLE toolchains;\u000aALTER TABLE\u000a  toolchains2 RENAME TO toolchains;'));
INSERT INTO migrations VALUES('WorkspaceDb',26,unistr('CREATE TABLE ssh_connections (\u000a  id INTEGER PRIMARY KEY,\u000a  host TEXT NOT NULL,\u000a  port INTEGER,\u000a  user TEXT\u000a);\u000aINSERT INTO\u000a  ssh_connections (host, port, user)\u000aSELECT\u000a  DISTINCT host,\u000a  port,\u000a  user\u000aFROM\u000a  ssh_projects;\u000aCREATE TABLE workspaces_2 (\u000a  workspace_id INTEGER PRIMARY KEY,\u000a  paths TEXT,\u000a  paths_order TEXT,\u000a  ssh_connection_id INTEGER REFERENCES ssh_connections (id),\u000a  timestamp TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,\u000a  window_state TEXT,\u000a  window_x REAL,\u000a  window_y REAL,\u000a  window_width REAL,\u000a  window_height REAL,\u000a  display BLOB,\u000a  left_dock_visible INTEGER,\u000a  left_dock_active_panel TEXT,\u000a  right_dock_visible INTEGER,\u000a  right_dock_active_panel TEXT,\u000a  bottom_dock_visible INTEGER,\u000a  bottom_dock_active_panel TEXT,\u000a  left_dock_zoom INTEGER,\u000a  right_dock_zoom INTEGER,\u000a  bottom_dock_zoom INTEGER,\u000a  fullscreen INTEGER,\u000a  centered_layout INTEGER,\u000a  session_id TEXT,\u000a  window_id INTEGER\u000a) STRICT;\u000aINSERT INTO\u000a  workspaces_2\u000aSELECT\u000a  workspaces.workspace_id,\u000a  CASE\u000a    WHEN ssh_projects.id IS NOT NULL THEN ssh_projects.paths\u000a    ELSE CASE\u000a      WHEN workspaces.local_paths_array IS NULL\u000a      OR workspaces.local_paths_array = "" THEN NULL\u000a      ELSE replace (\u000a        workspaces.local_paths_array,\u000a        '','',\u000a        CHAR (10)\u000a      )\u000a    END\u000a  END as paths,\u000a  CASE\u000a    WHEN ssh_projects.id IS NOT NULL THEN ""\u000a    ELSE workspaces.local_paths_order_array\u000a  END as paths_order,\u000a  CASE\u000a    WHEN ssh_projects.id IS NOT NULL THEN (\u000a      SELECT\u000a        ssh_connections.id\u000a      FROM\u000a        ssh_connections\u000a      WHERE\u000a        ssh_connections.host IS ssh_projects.host\u000a        AND ssh_connections.port IS ssh_projects.port\u000a        AND ssh_connections.user IS ssh_projects.user\u000a    )\u000a    ELSE NULL\u000a  END as ssh_connection_id,\u000a  workspaces.timestamp,\u000a  workspaces.window_state,\u000a  workspaces.window_x,\u000a  workspaces.window_y,\u000a  workspaces.window_width,\u000a  workspaces.window_height,\u000a  workspaces.display,\u000a  workspaces.left_dock_visible,\u000a  workspaces.left_dock_active_panel,\u000a  workspaces.right_dock_visible,\u000a  workspaces.right_dock_active_panel,\u000a  workspaces.bottom_dock_visible,\u000a  workspaces.bottom_dock_active_panel,\u000a  workspaces.left_dock_zoom,\u000a  workspaces.right_dock_zoom,\u000a  workspaces.bottom_dock_zoom,\u000a  workspaces.fullscreen,\u000a  workspaces.centered_layout,\u000a  workspaces.session_id,\u000a  workspaces.window_id\u000aFROM\u000a  workspaces\u000a  LEFT JOIN ssh_projects ON workspaces.ssh_project_id = ssh_projects.id;\u000aDELETE FROM\u000a  workspaces_2\u000aWHERE\u000a  workspace_id NOT IN (\u000a    SELECT\u000a      MAX (workspace_id)\u000a    FROM\u000a      workspaces_2\u000a    GROUP BY\u000a      ssh_connection_id,\u000a      paths\u000a  );\u000aDROP TABLE ssh_projects;\u000aDROP TABLE workspaces;\u000aALTER TABLE\u000a  workspaces_2 RENAME TO workspaces;\u000aCREATE UNIQUE INDEX ix_workspaces_location ON workspaces (ssh_connection_id, paths);'));
INSERT INTO migrations VALUES('WorkspaceDb',27,unistr('UPDATE\u000a  workspaces\u000aSET\u000a  paths =CASE\u000a    WHEN substr (paths, 1, 2) = ''['' || ''"''\u000a    AND substr (paths, -2, 2) = ''"'' || '']'' THEN replace (\u000a      substr (paths, 3, length (paths) -4),\u000a      ''"'' || '','' || ''"'',\u000a      CHAR (10)\u000a    )\u000a    ELSE replace (paths, '','', CHAR (10))\u000a  END\u000aWHERE\u000a  paths IS NOT NULL'));
INSERT INTO migrations VALUES('WorkspaceDb',28,unistr('CREATE TABLE remote_connections (\u000a  id INTEGER PRIMARY KEY,\u000a  kind TEXT NOT NULL,\u000a  host TEXT,\u000a  port INTEGER,\u000a  user TEXT,\u000a  distro TEXT\u000a);\u000aCREATE TABLE workspaces_2 (\u000a  workspace_id INTEGER PRIMARY KEY,\u000a  paths TEXT,\u000a  paths_order TEXT,\u000a  remote_connection_id INTEGER REFERENCES remote_connections (id),\u000a  timestamp TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,\u000a  window_state TEXT,\u000a  window_x REAL,\u000a  window_y REAL,\u000a  window_width REAL,\u000a  window_height REAL,\u000a  display BLOB,\u000a  left_dock_visible INTEGER,\u000a  left_dock_active_panel TEXT,\u000a  right_dock_visible INTEGER,\u000a  right_dock_active_panel TEXT,\u000a  bottom_dock_visible INTEGER,\u000a  bottom_dock_active_panel TEXT,\u000a  left_dock_zoom INTEGER,\u000a  right_dock_zoom INTEGER,\u000a  bottom_dock_zoom INTEGER,\u000a  fullscreen INTEGER,\u000a  centered_layout INTEGER,\u000a  session_id TEXT,\u000a  window_id INTEGER\u000a) STRICT;\u000aINSERT INTO\u000a  remote_connections\u000aSELECT\u000a  id,\u000a  "ssh" as kind,\u000a  host,\u000a  port,\u000a  user,\u000a  NULL as distro\u000aFROM\u000a  ssh_connections;\u000aINSERT INTO\u000a  workspaces_2\u000aSELECT\u000a  workspace_id,\u000a  paths,\u000a  paths_order,\u000a  ssh_connection_id as remote_connection_id,\u000a  timestamp,\u000a  window_state,\u000a  window_x,\u000a  window_y,\u000a  window_width,\u000a  window_height,\u000a  display,\u000a  left_dock_visible,\u000a  left_dock_active_panel,\u000a  right_dock_visible,\u000a  right_dock_active_panel,\u000a  bottom_dock_visible,\u000a  bottom_dock_active_panel,\u000a  left_dock_zoom,\u000a  right_dock_zoom,\u000a  bottom_dock_zoom,\u000a  fullscreen,\u000a  centered_layout,\u000a  session_id,\u000a  window_id\u000aFROM\u000a  workspaces;\u000aDROP TABLE workspaces;\u000aALTER TABLE\u000a  workspaces_2 RENAME TO workspaces;\u000aCREATE UNIQUE INDEX ix_workspaces_location ON workspaces (remote_connection_id, paths);'));
INSERT INTO migrations VALUES('WorkspaceDb',29,unistr('CREATE TABLE user_toolchains (\u000a  remote_connection_id INTEGER,\u000a  workspace_id INTEGER NOT NULL,\u000a  worktree_id INTEGER NOT NULL,\u000a  relative_worktree_path TEXT NOT NULL,\u000a  language_name TEXT NOT NULL,\u000a  name TEXT NOT NULL,\u000a  path TEXT NOT NULL,\u000a  raw_json TEXT NOT NULL,\u000a  PRIMARY KEY (\u000a    workspace_id,\u000a    worktree_id,\u000a    relative_worktree_path,\u000a    language_name,\u000a    name,\u000a    path,\u000a    raw_json\u000a  )\u000a) STRICT;'));
INSERT INTO migrations VALUES('WorkspaceDb',30,'DROP TABLE ssh_connections;');
INSERT INTO migrations VALUES('WorkspaceDb',31,unistr('ALTER TABLE\u000a  remote_connections\u000aADD\u000a  COLUMN name TEXT;\u000aALTER TABLE\u000a  remote_connections\u000aADD\u000a  COLUMN container_id TEXT;'));
INSERT INTO migrations VALUES('WorkspaceDb',32,unistr('CREATE TABLE IF NOT EXISTS trusted_worktrees (\u000a  trust_id INTEGER PRIMARY KEY AUTOINCREMENT,\u000a  absolute_path TEXT,\u000a  user_name TEXT,\u000a  host_name TEXT\u000a) STRICT;'));
INSERT INTO migrations VALUES('WorkspaceDb',33,unistr('CREATE TABLE toolchains2 (\u000a  workspace_id INTEGER,\u000a  worktree_root_path TEXT NOT NULL,\u000a  language_name TEXT NOT NULL,\u000a  name TEXT NOT NULL,\u000a  path TEXT NOT NULL,\u000a  raw_json TEXT NOT NULL,\u000a  relative_worktree_path TEXT NOT NULL,\u000a  PRIMARY KEY (\u000a    workspace_id,\u000a    worktree_root_path,\u000a    language_name,\u000a    relative_worktree_path\u000a  )\u000a) STRICT;\u000aINSERT\u000a  OR REPLACE INTO toolchains2\u000aSELECT\u000a  toolchains.workspace_id,\u000a  paths,\u000a  language_name,\u000a  name,\u000a  path,\u000a  raw_json,\u000a  relative_worktree_path\u000aFROM\u000a  toolchains\u000a  INNER JOIN workspaces ON toolchains.workspace_id = workspaces.workspace_id\u000a  AND instr (paths, ''\\n'') = 0;\u000aDROP TABLE toolchains;\u000aALTER TABLE\u000a  toolchains2 RENAME TO toolchains;'));
INSERT INTO migrations VALUES('WorkspaceDb',34,unistr('CREATE TABLE user_toolchains2 (\u000a  remote_connection_id INTEGER,\u000a  workspace_id INTEGER NOT NULL,\u000a  worktree_root_path TEXT NOT NULL,\u000a  relative_worktree_path TEXT NOT NULL,\u000a  language_name TEXT NOT NULL,\u000a  name TEXT NOT NULL,\u000a  path TEXT NOT NULL,\u000a  raw_json TEXT NOT NULL,\u000a  PRIMARY KEY (\u000a    workspace_id,\u000a    worktree_root_path,\u000a    relative_worktree_path,\u000a    language_name,\u000a    name,\u000a    path,\u000a    raw_json\u000a  )\u000a) STRICT;\u000aINSERT\u000a  OR REPLACE INTO user_toolchains2\u000aSELECT\u000a  user_toolchains.remote_connection_id,\u000a  user_toolchains.workspace_id,\u000a  paths,\u000a  relative_worktree_path,\u000a  language_name,\u000a  name,\u000a  path,\u000a  raw_json\u000aFROM\u000a  user_toolchains\u000a  INNER JOIN workspaces ON user_toolchains.workspace_id = workspaces.workspace_id\u000a  AND instr (paths, ''\\n'') = 0;\u000aDROP TABLE user_toolchains;\u000aALTER TABLE\u000a  user_toolchains2 RENAME TO user_toolchains;'));
INSERT INTO migrations VALUES('WorkspaceDb',35,unistr('ALTER TABLE\u000a  remote_connections\u000aADD\u000a  COLUMN use_podman BOOLEAN;'));
INSERT INTO migrations VALUES('OnboardingPagesDb',0,unistr('CREATE TABLE onboarding_pages (\u000a  workspace_id INTEGER,\u000a  item_id INTEGER UNIQUE,\u000a  page_number INTEGER,\u000a  PRIMARY KEY (workspace_id, item_id),\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE\u000a) STRICT;'));
INSERT INTO migrations VALUES('OnboardingPagesDb',1,unistr('CREATE TABLE onboarding_pages_2 (\u000a  workspace_id INTEGER,\u000a  item_id INTEGER UNIQUE,\u000a  PRIMARY KEY (workspace_id, item_id),\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE\u000a) STRICT;\u000aINSERT INTO\u000a  onboarding_pages_2\u000aSELECT\u000a  workspace_id,\u000a  item_id\u000aFROM\u000a  onboarding_pages;\u000aDROP TABLE onboarding_pages;\u000aALTER TABLE\u000a  onboarding_pages_2 RENAME TO onboarding_pages;'));
INSERT INTO migrations VALUES('VimDb',0,unistr('CREATE TABLE vim_marks (\u000a  workspace_id INTEGER,\u000a  mark_name TEXT,\u000a  path BLOB,\u000a  value TEXT\u000a);\u000aCREATE UNIQUE INDEX idx_vim_marks ON vim_marks (workspace_id, mark_name, path);'));
INSERT INTO migrations VALUES('VimDb',1,unistr('CREATE TABLE vim_global_marks_paths (\u000a  workspace_id INTEGER,\u000a  mark_name TEXT,\u000a  path BLOB\u000a);\u000aCREATE UNIQUE INDEX idx_vim_global_marks_paths ON vim_global_marks_paths (workspace_id, mark_name);'));
INSERT INTO migrations VALUES('TerminalDb',0,unistr('CREATE TABLE terminals (\u000a  workspace_id INTEGER,\u000a  item_id INTEGER UNIQUE,\u000a  working_directory BLOB,\u000a  PRIMARY KEY (workspace_id, item_id),\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE\u000a) STRICT;'));
INSERT INTO migrations VALUES('TerminalDb',1,unistr('CREATE TABLE terminals2 (\u000a  workspace_id INTEGER,\u000a  item_id INTEGER,\u000a  working_directory BLOB,\u000a  PRIMARY KEY (workspace_id, item_id),\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE\u000a) STRICT;\u000aINSERT INTO\u000a  terminals2 (workspace_id, item_id, working_directory)\u000aSELECT\u000a  workspace_id,\u000a  item_id,\u000a  working_directory\u000aFROM\u000a  terminals;\u000aDROP TABLE terminals;\u000aALTER TABLE\u000a  terminals2 RENAME TO terminals;'));
INSERT INTO migrations VALUES('TerminalDb',2,unistr('ALTER TABLE\u000a  terminals\u000aADD\u000a  COLUMN working_directory_path TEXT;\u000aUPDATE\u000a  terminals\u000aSET\u000a  working_directory_path = CAST (working_directory AS TEXT);'));
INSERT INTO migrations VALUES('TerminalDb',3,unistr('ALTER TABLE\u000a  terminals\u000aADD\u000a  COLUMN custom_title TEXT;'));
INSERT INTO migrations VALUES('WelcomePagesDb',0,unistr('CREATE TABLE welcome_pages (\u000a  workspace_id INTEGER,\u000a  item_id INTEGER UNIQUE,\u000a  is_open INTEGER DEFAULT FALSE,\u000a  PRIMARY KEY (workspace_id, item_id),\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE\u000a) STRICT;'));
INSERT INTO migrations VALUES('EditorDb',0,unistr('CREATE TABLE editors (\u000a  item_id INTEGER NOT NULL,\u000a  workspace_id INTEGER NOT NULL,\u000a  path BLOB NOT NULL,\u000a  PRIMARY KEY (item_id, workspace_id),\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE\u000a) STRICT;'));
INSERT INTO migrations VALUES('EditorDb',1,unistr('ALTER TABLE\u000a  editors\u000aADD\u000a  COLUMN scroll_top_row INTEGER NOT NULL DEFAULT 0;\u000aALTER TABLE\u000a  editors\u000aADD\u000a  COLUMN scroll_horizontal_offset REAL NOT NULL DEFAULT 0;\u000aALTER TABLE\u000a  editors\u000aADD\u000a  COLUMN scroll_vertical_offset REAL NOT NULL DEFAULT 0;'));
INSERT INTO migrations VALUES('EditorDb',2,unistr('CREATE TABLE new_editors_tmp (\u000a  item_id INTEGER NOT NULL,\u000a  workspace_id INTEGER NOT NULL,\u000a  path BLOB,\u000a  scroll_top_row INTEGER NOT NULL DEFAULT 0,\u000a  scroll_horizontal_offset REAL NOT NULL DEFAULT 0,\u000a  scroll_vertical_offset REAL NOT NULL DEFAULT 0,\u000a  contents TEXT,\u000a  language TEXT,\u000a  PRIMARY KEY (item_id, workspace_id),\u000a  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE\u000a) STRICT;\u000aINSERT INTO\u000a  new_editors_tmp (\u000a    item_id,\u000a    workspace_id,\u000a    path,\u000a    scroll_top_row,\u000a    scroll_horizontal_offset,\u000a    scroll_vertical_offset\u000a  )\u000aSELECT\u000a  item_id,\u000a  workspace_id,\u000a  path,\u000a  scroll_top_row,\u000a  scroll_horizontal_offset,\u000a  scroll_vertical_offset\u000aFROM\u000a  editors;\u000aDROP TABLE editors;\u000aALTER TABLE\u000a  new_editors_tmp RENAME TO editors;'));
INSERT INTO migrations VALUES('EditorDb',3,unistr('ALTER TABLE\u000a  editors\u000aADD\u000a  COLUMN mtime_seconds INTEGER DEFAULT NULL;\u000aALTER TABLE\u000a  editors\u000aADD\u000a  COLUMN mtime_nanos INTEGER DEFAULT NULL;'));
INSERT INTO migrations VALUES('EditorDb',4,unistr('CREATE TABLE editor_selections (\u000a  item_id INTEGER NOT NULL,\u000a  editor_id INTEGER NOT NULL,\u000a  workspace_id INTEGER NOT NULL,\u000a  start INTEGER NOT NULL,\u000aend INTEGER NOT NULL,\u000aPRIMARY KEY (item_id),\u000aFOREIGN KEY (editor_id, workspace_id) REFERENCES editors (item_id, workspace_id) ON DELETE CASCADE\u000a) STRICT;'));
INSERT INTO migrations VALUES('EditorDb',5,unistr('ALTER TABLE\u000a  editors\u000aADD\u000a  COLUMN buffer_path TEXT;\u000aUPDATE\u000a  editors\u000aSET\u000a  buffer_path = CAST (path AS TEXT);'));
INSERT INTO migrations VALUES('EditorDb',6,unistr('CREATE TABLE editor_folds (\u000a  item_id INTEGER NOT NULL,\u000a  editor_id INTEGER NOT NULL,\u000a  workspace_id INTEGER NOT NULL,\u000a  start INTEGER NOT NULL,\u000aend INTEGER NOT NULL,\u000aPRIMARY KEY (item_id),\u000aFOREIGN KEY (editor_id, workspace_id) REFERENCES editors (item_id, workspace_id) ON DELETE CASCADE\u000a) STRICT;'));
INSERT INTO migrations VALUES('EditorDb',7,unistr('ALTER TABLE\u000a  editor_folds\u000aADD\u000a  COLUMN start_fingerprint TEXT;\u000aALTER TABLE\u000a  editor_folds\u000aADD\u000a  COLUMN end_fingerprint TEXT;'));
INSERT INTO migrations VALUES('KeyValueStore',1,unistr('CREATE TABLE IF NOT EXISTS scoped_kv_store (\u000a  namespace TEXT NOT NULL,\u000a  key TEXT NOT NULL,\u000a  value TEXT NOT NULL,\u000a  PRIMARY KEY (namespace, key)\u000a) STRICT;'));
INSERT INTO migrations VALUES('EditorDb',8,unistr('CREATE TABLE file_folds (\u000a  workspace_id INTEGER NOT NULL,\u000a  path TEXT NOT NULL,\u000a  start INTEGER NOT NULL,\u000aend INTEGER NOT NULL,\u000astart_fingerprint TEXT,\u000aend_fingerprint TEXT,\u000aFOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE,\u000aPRIMARY KEY (workspace_id, path, start)\u000a);'));
CREATE TABLE kv_store (key TEXT PRIMARY KEY, value TEXT NOT NULL) STRICT;
INSERT INTO kv_store VALUES('installation_id','2dc4ddff-9da2-43d3-a56e-76c5c31afc37');
INSERT INTO kv_store VALUES('first_open','false');
INSERT INTO kv_store VALUES('agent_panel__last_used_external_agent','{"agent":"native_agent"}');
INSERT INTO kv_store VALUES('dismissed-trial-upsell','1');
INSERT INTO kv_store VALUES('default_dock_state','{"left":{"visible":false,"active_panel":null,"zoom":false},"right":{"visible":false,"active_panel":null,"zoom":false},"bottom":{"visible":false,"active_panel":null,"zoom":false}}');
INSERT INTO kv_store VALUES('OutlinePanel-"4"','{"width":null,"active":false}');
INSERT INTO kv_store VALUES('default_window_bounds','["78692035-3a04-52f3-a2bf-1133155ae828",{"Windowed":{"x":-22,"y":692,"width":1536,"height":864}}]');
INSERT INTO kv_store VALUES('session_id','80e58aaa-3312-4b30-a58d-1f862838cc71');
CREATE TABLE pane_groups (
  group_id INTEGER PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  parent_group_id INTEGER,
  position INTEGER,
  axis TEXT NOT NULL, flexes TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (parent_group_id) REFERENCES pane_groups (group_id) ON DELETE CASCADE
) STRICT;
CREATE TABLE panes (
  pane_id INTEGER PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  active INTEGER NOT NULL, pinned_count INTEGER DEFAULT 0,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;
INSERT INTO panes VALUES(2,2,1,0);
INSERT INTO panes VALUES(3,4,1,0);
CREATE TABLE center_panes (
  pane_id INTEGER PRIMARY KEY,
  parent_group_id INTEGER,
  position INTEGER,
  FOREIGN KEY (pane_id) REFERENCES panes (pane_id) ON DELETE CASCADE,
  FOREIGN KEY (parent_group_id) REFERENCES pane_groups (group_id) ON DELETE CASCADE
) STRICT;
INSERT INTO center_panes VALUES(2,NULL,NULL);
INSERT INTO center_panes VALUES(3,NULL,NULL);
CREATE TABLE items (
  item_id INTEGER NOT NULL,
  workspace_id INTEGER NOT NULL,
  pane_id INTEGER NOT NULL,
  kind TEXT NOT NULL,
  position INTEGER NOT NULL,
  active INTEGER NOT NULL, preview INTEGER,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE,
  FOREIGN KEY (pane_id) REFERENCES panes (pane_id) ON DELETE CASCADE,
  PRIMARY KEY (item_id, workspace_id)
) STRICT;
INSERT INTO items VALUES(21474837287,2,2,'Editor',0,0,1);
INSERT INTO items VALUES(4294967444,4,3,'Editor',0,1,0);
INSERT INTO items VALUES(12884902176,4,3,'Editor',1,0,0);
CREATE TABLE dev_server_projects (
  id INTEGER NOT NULL UNIQUE,
  path TEXT,
  dev_server_name TEXT
);
CREATE TABLE breakpoints (
  workspace_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  breakpoint_location INTEGER NOT NULL,
  log_message TEXT, state INTEGER DEFAULT (0) NOT NULL, condition TEXT, hit_condition TEXT,
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE TABLE remote_connections (
  id INTEGER PRIMARY KEY,
  kind TEXT NOT NULL,
  host TEXT,
  port INTEGER,
  user TEXT,
  distro TEXT
, name TEXT, container_id TEXT, use_podman BOOLEAN);
CREATE TABLE IF NOT EXISTS "workspaces" (
  workspace_id INTEGER PRIMARY KEY,
  paths TEXT,
  paths_order TEXT,
  remote_connection_id INTEGER REFERENCES remote_connections (id),
  timestamp TEXT DEFAULT CURRENT_TIMESTAMP NOT NULL,
  window_state TEXT,
  window_x REAL,
  window_y REAL,
  window_width REAL,
  window_height REAL,
  display BLOB,
  left_dock_visible INTEGER,
  left_dock_active_panel TEXT,
  right_dock_visible INTEGER,
  right_dock_active_panel TEXT,
  bottom_dock_visible INTEGER,
  bottom_dock_active_panel TEXT,
  left_dock_zoom INTEGER,
  right_dock_zoom INTEGER,
  bottom_dock_zoom INTEGER,
  fullscreen INTEGER,
  centered_layout INTEGER,
  session_id TEXT,
  window_id INTEGER
) STRICT;
INSERT INTO workspaces VALUES(2,'D:\office_toolbox','0',NULL,'2026-02-22 04:25:14','Maximized',537.0,313.0,1536.0,864.0,X'786920353a0452f3a2bf1133155ae828',1,'Project Panel',0,NULL,0,NULL,0,0,0,NULL,NULL,'7f16cb80-245c-4d37-888a-76ecb1e13f91',4294967297);
INSERT INTO workspaces VALUES(4,'','',NULL,'2026-03-21 12:23:04','Windowed',0.0,692.0,1536.0,864.0,X'786920353a0452f3a2bf1133155ae828',0,NULL,0,NULL,0,NULL,0,0,0,NULL,NULL,'80ef0e6a-d425-4274-9a89-df90a07e14bb',4294967297);
CREATE TABLE trusted_worktrees (
  trust_id INTEGER PRIMARY KEY AUTOINCREMENT,
  absolute_path TEXT,
  user_name TEXT,
  host_name TEXT
) STRICT;
CREATE TABLE IF NOT EXISTS "toolchains" (
  workspace_id INTEGER,
  worktree_root_path TEXT NOT NULL,
  language_name TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  relative_worktree_path TEXT NOT NULL,
  PRIMARY KEY (
    workspace_id,
    worktree_root_path,
    language_name,
    relative_worktree_path
  )
) STRICT;
CREATE TABLE IF NOT EXISTS "user_toolchains" (
  remote_connection_id INTEGER,
  workspace_id INTEGER NOT NULL,
  worktree_root_path TEXT NOT NULL,
  relative_worktree_path TEXT NOT NULL,
  language_name TEXT NOT NULL,
  name TEXT NOT NULL,
  path TEXT NOT NULL,
  raw_json TEXT NOT NULL,
  PRIMARY KEY (
    workspace_id,
    worktree_root_path,
    relative_worktree_path,
    language_name,
    name,
    path,
    raw_json
  )
) STRICT;
CREATE TABLE IF NOT EXISTS "onboarding_pages" (
  workspace_id INTEGER,
  item_id INTEGER UNIQUE,
  PRIMARY KEY (workspace_id, item_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE
) STRICT;
CREATE TABLE vim_marks (
  workspace_id INTEGER,
  mark_name TEXT,
  path BLOB,
  value TEXT
);
CREATE TABLE vim_global_marks_paths (
  workspace_id INTEGER,
  mark_name TEXT,
  path BLOB
);
CREATE TABLE IF NOT EXISTS "terminals" (
  workspace_id INTEGER,
  item_id INTEGER,
  working_directory BLOB, working_directory_path TEXT, custom_title TEXT,
  PRIMARY KEY (workspace_id, item_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE
) STRICT;
CREATE TABLE welcome_pages (
  workspace_id INTEGER,
  item_id INTEGER UNIQUE,
  is_open INTEGER DEFAULT FALSE,
  PRIMARY KEY (workspace_id, item_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE
) STRICT;
CREATE TABLE IF NOT EXISTS "editors" (
  item_id INTEGER NOT NULL,
  workspace_id INTEGER NOT NULL,
  path BLOB,
  scroll_top_row INTEGER NOT NULL DEFAULT 0,
  scroll_horizontal_offset REAL NOT NULL DEFAULT 0,
  scroll_vertical_offset REAL NOT NULL DEFAULT 0,
  contents TEXT,
  language TEXT, mtime_seconds INTEGER DEFAULT NULL, mtime_nanos INTEGER DEFAULT NULL, buffer_path TEXT,
  PRIMARY KEY (item_id, workspace_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE
) STRICT;
INSERT INTO editors VALUES(21474836814,2,X'443a5c6f66666963655f746f6f6c626f785c6478665f7365617263682e6a73',225,0.0,0.0,NULL,NULL,1766239785,129172100,'D:\office_toolbox\dxf_search.js');
INSERT INTO editors VALUES(21474837287,2,X'443a5c6f66666963655f746f6f6c626f785ce69599e7a88b2e6d64',0,0.0,0.0,NULL,NULL,1766309549,547129600,'D:\office_toolbox\教程.md');
INSERT INTO editors VALUES(4294967444,4,NULL,0,0.0,0.0,'546545','Plain Text',NULL,NULL,NULL);
INSERT INTO editors VALUES(4294967583,4,X'443a5c707974686f6e5c687661632d64657369676e2d6d61737465722d6d61696e5ce997aee9a2982e6d64',0,0.0,0.0,NULL,NULL,1774020651,7000400,'D:\python\hvac-design-master-main\问题.md');
INSERT INTO editors VALUES(12884902176,4,X'443a5c707974686f6e5c687661632d64657369676e2d6d61737465722d6d61696e5ce997aee9a2982e6d64',0,0.0,0.0,NULL,NULL,1774020651,7000400,'D:\python\hvac-design-master-main\问题.md');
CREATE TABLE editor_selections (
  item_id INTEGER NOT NULL,
  editor_id INTEGER NOT NULL,
  workspace_id INTEGER NOT NULL,
  start INTEGER NOT NULL,
end INTEGER NOT NULL,
PRIMARY KEY (item_id),
FOREIGN KEY (editor_id, workspace_id) REFERENCES editors (item_id, workspace_id) ON DELETE CASCADE
) STRICT;
INSERT INTO editor_selections VALUES(1,21474837287,2,607,607);
INSERT INTO editor_selections VALUES(3,4294967583,4,359,359);
INSERT INTO editor_selections VALUES(4,4294967444,4,6,6);
CREATE TABLE editor_folds (
  item_id INTEGER NOT NULL,
  editor_id INTEGER NOT NULL,
  workspace_id INTEGER NOT NULL,
  start INTEGER NOT NULL,
end INTEGER NOT NULL, start_fingerprint TEXT, end_fingerprint TEXT,
PRIMARY KEY (item_id),
FOREIGN KEY (editor_id, workspace_id) REFERENCES editors (item_id, workspace_id) ON DELETE CASCADE
) STRICT;
CREATE TABLE scoped_kv_store (
  namespace TEXT NOT NULL,
  key TEXT NOT NULL,
  value TEXT NOT NULL,
  PRIMARY KEY (namespace, key)
) STRICT;
INSERT INTO scoped_kv_store VALUES('agent_panel','3','{"width":400.0,"selected_agent":"NativeAgent","last_active_thread":{"session_id":"797d2475-119f-4e5a-9611-a2b480a0b74f","agent_type":"NativeAgent","title":null,"cwd":null}}');
INSERT INTO scoped_kv_store VALUES('multi_workspace_state','4294967297','{"active_workspace_id":4,"sidebar_open":false}');
CREATE TABLE file_folds (
  workspace_id INTEGER NOT NULL,
  path TEXT NOT NULL,
  start INTEGER NOT NULL,
end INTEGER NOT NULL,
start_fingerprint TEXT,
end_fingerprint TEXT,
FOREIGN KEY (workspace_id) REFERENCES workspaces (workspace_id) ON DELETE CASCADE ON UPDATE CASCADE,
PRIMARY KEY (workspace_id, path, start)
);
CREATE UNIQUE INDEX ix_workspaces_location ON workspaces (remote_connection_id, paths);
CREATE UNIQUE INDEX idx_vim_marks ON vim_marks (workspace_id, mark_name, path);
CREATE UNIQUE INDEX idx_vim_global_marks_paths ON vim_global_marks_paths (workspace_id, mark_name);
COMMIT;
