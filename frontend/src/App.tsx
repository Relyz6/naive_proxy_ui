import { useCallback, useState, useEffect, useMemo } from "react";
import { QRCodeSVG } from "qrcode.react";
import "./App.css";

import { userService } from "./api/userService";
import type { User } from "./types/user";
import { useToast } from "./hooks/useToast";
import { 
  Users, 
  BookOpen, 
  Copy, 
  Trash2, 
  Power, 
  Eye, 
  EyeOff, 
  Plus,
  Shield,
  Activity,
  LogOut,
  Search,
  ArrowDownAZ,
  ArrowUpZA,
  Filter,
  Hash,
  RefreshCw,
  Settings,
  X,
  QrCode
} from "lucide-react";

type Lang = "ru" | "eu";
type SortType = "id" | "asc" | "desc" | "status";

const dict = {
  ru: {
    loginTitle: "Вход в панель",
    loginBtn: "Войти",
    create: "Создать пользователя",
    delete: "Удалить",
    copy: "Копировать",
    loading: "Загрузка...",
    userCreated: "Пользователь успешно создан",
    copied: "Скопировано в буфер обмена",
    cannotDelete: "Нельзя удалить последнего пользователя",
    prefix: "Префикс (напр. user)",
    lang: "RU",
    dashboard: "Дашборд",
    users: "Пользователи",
    docs: "API Документация",
    active: "Активен",
    disabled: "Отключен",
    enable: "Включить",
    disable: "Отключить",
    statusToggled: "Статус изменен",
    logout: "Выйти",
    searchPlaceholder: "Поиск пользователей...",
    sortAsc: "А-Я",
    sortDesc: "Я-А",
    sortStatus: "По статусу",
    sortId: "По номеру",
    updateBtn: "Обновить",
    updateStarted: "Обновление запущено, страница перезагрузится через 15 секунд...",
    settingsTitle: "Настройки панели",
    newPassword: "Новый пароль",
    changePasswordBtn: "Изменить пароль",
    passwordChanged: "Пароль изменён! Выполняется выход...",
    error: "Произошла ошибка"
  },
  eu: {
    loginTitle: "Panel Login",
    loginBtn: "Login",
    create: "Create User",
    delete: "Delete",
    copy: "Copy",
    loading: "Loading...",
    userCreated: "User created successfully",
    copied: "Copied to clipboard",
    cannotDelete: "Cannot delete the last user",
    prefix: "Prefix (e.g. user)",
    lang: "EU",
    dashboard: "Dashboard",
    users: "Users",
    docs: "API Docs",
    active: "Active",
    disabled: "Disabled",
    enable: "Enable",
    disable: "Disable",
    statusToggled: "Status toggled",
    logout: "Logout",
    searchPlaceholder: "Search users...",
    sortAsc: "A-Z",
    sortDesc: "Z-A",
    sortStatus: "By Status",
    sortId: "By ID",
    updateBtn: "Update",
    updateStarted: "Update started, page will reload in 15 seconds...",
    settingsTitle: "Panel Settings",
    newPassword: "New Password",
    changePasswordBtn: "Change Password",
    passwordChanged: "Password changed! Logging out...",
    error: "An error occurred"
  },
};

export default function App() {
  const [lang, setLang] = useState<Lang>(
    () => (localStorage.getItem("lang") as Lang) || "ru",
  );

  const t = dict[lang];

  const switchLang = () => {
    setLang((prev) => {
      const next = prev === "ru" ? "eu" : "ru";
      localStorage.setItem("lang", next);
      return next;
    });
  };

  const [users, setUsers] = useState<User[]>([]);
  const [auth, setAuth] = useState(false);
  const [password, setPassword] = useState(
    () => localStorage.getItem("admin_password") || "",
  );

  const [prefix, setPrefix] = useState("user");
  const [loading, setLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [visibleLinks, setVisibleLinks] = useState<Record<string, boolean>>({});
  
  const [searchQuery, setSearchQuery] = useState("");
  const [sortType, setSortType] = useState<SortType>("id");
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [newAdminPassword, setNewAdminPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [linkProtocol, setLinkProtocol] = useState<"naive" | "tt">("naive");
  const [qrCodeLink, setQrCodeLink] = useState<string | null>(null);

  const { toasts, push } = useToast();

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const data = await userService.getUsers();
      setUsers(data);
    } catch (err) {
      if ((err as any)?.response?.status === 401) {
        setAuth(false);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (auth) {
      loadUsers();
    }
  }, [auth, loadUsers]);

  const login = () => {
    if (!password) return;
    localStorage.setItem("admin_password", password);
    setAuth(true);
  };

  const logout = () => {
    localStorage.removeItem("admin_password");
    setPassword("");
    setAuth(false);
  };

  const createUser = async () => {
    setCreating(true);
    try {
      await userService.createUser(prefix);
      push(t.userCreated, "success");
      await loadUsers();
      setPrefix("user");
    } catch (err: any) {
      const msg = err.response?.data?.detail || t.error;
      push(msg, "error");
    } finally {
      setCreating(false);
    }
  };

  const deleteUser = async (id: string) => {
    if (users.length <= 1) {
      push(t.cannotDelete, "error");
      return;
    }
    try {
      await userService.deleteUser(id);
      push(t.delete, "success");
      await loadUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || t.error;
      push(msg, "error");
    }
  };

  const toggleStatus = async (id: string, currentEnabled: boolean) => {
    try {
      await userService.toggleUser(id, !currentEnabled);
      push(t.statusToggled, "success");
      await loadUsers();
    } catch (err: any) {
      const msg = err.response?.data?.detail || "Error toggling status";
      push(msg, "error");
    }
  };

  const copy = async (id: string, directLink?: string) => {
    try {
      if (directLink) {
        navigator.clipboard.writeText(directLink);
        push(t.copied, "success");
        return;
      }
      const data = await userService.getUserLink(id) as any;
      const targetLink = linkProtocol === 'tt' ? (data.tt_link || data.link) : data.link;
      navigator.clipboard.writeText(targetLink);
      push(t.copied, "success");
    } catch {
      push("Failed to fetch link", "error");
    }
  };

  const toggleLink = (id: string) => {
    setVisibleLinks((p) => ({ ...p, [id]: !p[id] }));
  };

  const maskLink = (link?: string) => {
    if (!link) return "";
    try {
      const cleaned = link.replace("naive+", "");
      const url = new URL(cleaned);
      const hostParts = url.hostname.split(".");
      let maskedHost = "***";
      if (hostParts.length >= 2) {
        maskedHost = `${hostParts[0]}.***`;
      }
      return `naive+https://***@${maskedHost}${url.port ? `:${url.port}` : ""}`;
    } catch {
      return "hidden";
    }
  };

  const handleUpdate = async () => {
    try {
      setIsUpdating(true);
      await userService.updateSystem();
      push(t.updateStarted, "success");
      setTimeout(() => {
        window.location.reload();
      }, 15000);
    } catch {
      push(t.error, "error");
      setIsUpdating(false);
    }
  };

  const handleChangePassword = async () => {
    if (!newAdminPassword) return;
    try {
      setIsChangingPassword(true);
      await userService.changePassword(newAdminPassword);
      push(t.passwordChanged, "success");
      setIsSettingsOpen(false);
      setNewAdminPassword("");
      setTimeout(() => {
        logout();
      }, 1500);
    } catch {
      push(t.error, "error");
      setIsChangingPassword(false);
    }
  };

  const processedUsers = useMemo(() => {
    let result = [...users];

    if (searchQuery.trim() !== "") {
      const q = searchQuery.toLowerCase();
      result = result.filter(u => u.login.toLowerCase().includes(q));
    }

    result.sort((a, b) => {
      if (sortType === "id") {
        return a.seq_id - b.seq_id;
      } else if (sortType === "asc") {
        return a.login.localeCompare(b.login);
      } else if (sortType === "desc") {
        return b.login.localeCompare(a.login);
      } else {
        if (a.enabled === b.enabled) return a.seq_id - b.seq_id;
        return a.enabled ? -1 : 1;
      }
    });

    return result;
  }, [users, searchQuery, sortType]);

  if (!auth) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(120,119,198,0.3),rgba(255,255,255,0))]">
        <div className="panel w-[380px] p-8 space-y-6 animate-fade-in border-indigo-500/20">
          <div className="flex flex-col items-center gap-3">
            <div className="w-16 h-16 bg-indigo-500/20 rounded-2xl flex items-center justify-center">
              <Shield className="w-8 h-8 text-indigo-400" />
            </div>
            <h1 className="text-2xl font-bold tracking-tight text-white">{t.loginTitle}</h1>
          </div>
          <div className="space-y-4">
            <input
              type="password"
              className="input w-full text-center"
              placeholder="Admin Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && login()}
            />
            <button className="btn primary w-full py-3" onClick={login}>
              {t.loginBtn}
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeUsersCount = users.filter(u => u.enabled).length;

  return (
    <div className="min-h-screen bg-slate-950 flex text-slate-200">
      {/* Sidebar */}
      <aside className="w-64 border-r border-slate-800 bg-slate-900/50 flex flex-col">
        <div className="h-16 flex items-center gap-3 px-6 border-b border-slate-800">
          <Shield className="text-indigo-500 w-6 h-6" />
          <span className="font-bold text-lg text-white tracking-wide">NAIVE PANEL</span>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-xl bg-indigo-500/10 text-indigo-400 font-medium">
            <Users className="w-5 h-5" />
            {t.users}
          </a>
          <a href="/api/docs" target="_blank" className="flex items-center gap-3 px-4 py-3 rounded-xl hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 transition-colors">
            <BookOpen className="w-5 h-5" />
            {t.docs}
          </a>
        </nav>

        <div className="p-4 border-t border-slate-800">
          <button onClick={logout} className="flex w-full items-center gap-3 px-4 py-3 rounded-xl hover:bg-red-500/10 text-red-400 transition-colors">
            <LogOut className="w-5 h-5" />
            {t.logout}
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col max-h-screen overflow-hidden">
        {/* Header */}
        <header className="h-16 border-b border-slate-800 flex items-center justify-between px-8 bg-slate-900/30 backdrop-blur-md z-10">
          <h2 className="text-xl font-semibold">{t.dashboard}</h2>
          <div className="flex items-center gap-3">
            <button
              onClick={handleUpdate}
              disabled={isUpdating}
              className="flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 font-medium rounded-lg transition-all border border-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
              title={t.updateBtn}
            >
              <RefreshCw className={`w-4 h-4 ${isUpdating ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">{t.updateBtn}</span>
            </button>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="flex items-center justify-center w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
            <button className="btn ghost border border-slate-800 text-xs px-3 py-1.5" onClick={switchLang}>
              {t.lang}
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-8 space-y-8">
          
          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="panel p-6 flex items-center gap-4 bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="w-12 h-12 rounded-full bg-indigo-500/20 flex items-center justify-center">
                <Users className="text-indigo-400 w-6 h-6" />
              </div>
              <div>
                <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Total Users</div>
                <div className="text-3xl font-bold mt-1">{users.length}</div>
              </div>
            </div>
            
            <div className="panel p-6 flex items-center gap-4 bg-gradient-to-br from-slate-900 to-slate-800">
              <div className="w-12 h-12 rounded-full bg-emerald-500/20 flex items-center justify-center">
                <Activity className="text-emerald-400 w-6 h-6" />
              </div>
              <div>
                <div className="text-sm text-slate-400 font-medium uppercase tracking-wider">Active Users</div>
                <div className="text-3xl font-bold mt-1">{activeUsersCount}</div>
              </div>
            </div>
          </div>

          {/* Users Section */}
          <div className="space-y-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-center gap-4 mt-4 lg:mt-0">
                <input
                  className="input flex-1 lg:w-64 bg-slate-900"
                  value={prefix}
                  onChange={(e) => setPrefix(e.target.value)}
                  placeholder={t.prefix}
                />
                <button className="btn primary" onClick={createUser} disabled={creating}>
                  <Plus className="w-4 h-4" />
                  {creating ? t.loading : t.create}
                </button>
              </div>

              <div className="flex items-center gap-3 w-full lg:w-auto">
                <div className="relative flex-1 lg:w-64">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    className="input w-full pl-10 bg-slate-900"
                    placeholder={t.searchPlaceholder}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                  <button 
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${linkProtocol === 'naive' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setLinkProtocol('naive')}
                  >
                    NaiveProxy
                  </button>
                  <button 
                    className={`px-3 py-1.5 text-xs font-bold rounded-md transition-colors ${linkProtocol === 'tt' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setLinkProtocol('tt')}
                  >
                    TrustTunnel
                  </button>
                </div>
                <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
                  <button 
                    className={`p-2 rounded-md transition-colors ${sortType === 'id' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setSortType('id')}
                    title={t.sortId}
                  >
                    <Hash className="w-4 h-4" />
                  </button>
                  <button 
                    className={`p-2 rounded-md transition-colors ${sortType === 'asc' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setSortType('asc')}
                    title={t.sortAsc}
                  >
                    <ArrowDownAZ className="w-4 h-4" />
                  </button>
                  <button 
                    className={`p-2 rounded-md transition-colors ${sortType === 'desc' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setSortType('desc')}
                    title={t.sortDesc}
                  >
                    <ArrowUpZA className="w-4 h-4" />
                  </button>
                  <button 
                    className={`p-2 rounded-md transition-colors ${sortType === 'status' ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'}`}
                    onClick={() => setSortType('status')}
                    title={t.sortStatus}
                  >
                    <Filter className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="panel bg-slate-900/50 divide-y divide-slate-800/50">
              {loading && users.length === 0 ? (
                <div className="p-8 text-center text-slate-500">{t.loading}</div>
              ) : processedUsers.length === 0 ? (
                 <div className="p-8 text-center text-slate-500">Ничего не найдено</div>
              ) : (
                processedUsers.map((u) => (
                  <div key={u.id} className="p-5 flex flex-col lg:flex-row items-center justify-between gap-4 hover:bg-slate-800/30 transition-colors animate-fade-in">
                    
                    <div className="flex items-center gap-4 w-full lg:w-auto">
                      <div className={`w-2 h-2 rounded-full shadow-lg ${u.enabled ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-red-500 shadow-red-500/50'}`} />
                      <div className="font-mono text-lg text-slate-500">#{u.seq_id}</div>
                      <div className="font-mono text-lg">{u.login}</div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${u.enabled ? 'text-emerald-400 border-emerald-400/30 bg-emerald-400/10' : 'text-red-400 border-red-400/30 bg-red-400/10'}`}>
                        {u.enabled ? t.active : t.disabled}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto overflow-hidden">
                      <div className="text-sm font-mono text-slate-500 bg-slate-950 px-3 py-1.5 rounded-lg border border-slate-800 truncate max-w-[200px] xl:max-w-md">
                        {visibleLinks[u.id] ? (linkProtocol === 'tt' ? (u.tt_link || u.link) : u.link) : maskLink(linkProtocol === 'tt' ? (u.tt_link || u.link) : u.link)}
                      </div>
                      <button className="btn ghost p-2" onClick={() => toggleLink(u.id)} title="Toggle Visibility">
                        {visibleLinks[u.id] ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>

                    <div className="flex items-center gap-2 w-full lg:w-auto">
                      <button className="btn ghost p-2" onClick={() => copy(u.id, linkProtocol === 'tt' ? (u.tt_link || u.link || '') : (u.link || ''))} title={t.copy}>
                        <Copy className="w-4 h-4" />
                      </button>
                      <button className="btn ghost p-2" onClick={() => setQrCodeLink(linkProtocol === 'tt' ? (u.tt_link || u.link || '') : (u.link || ''))} title="QR Code">
                        <QrCode className="w-4 h-4" />
                      </button>

                      <button 
                        className={`btn p-2 border ${u.enabled ? 'hover:bg-amber-500/10 text-amber-500 border-amber-500/20 hover:border-amber-500' : 'hover:bg-emerald-500/10 text-emerald-500 border-emerald-500/20 hover:border-emerald-500'}`} 
                        onClick={() => toggleStatus(u.id, u.enabled)}
                        title={u.enabled ? t.disable : t.enable}
                      >
                        <Power className="w-4 h-4" />
                      </button>

                      <button className="btn danger p-2" onClick={() => deleteUser(u.id)} title={t.delete}>
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                  </div>
                ))
              )}
            </div>
          </div>

        </div>
      </main>

      {/* QR Code Modal */}
      {qrCodeLink && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8 shadow-2xl animate-fade-in flex flex-col items-center gap-6">
            <div className="flex w-full justify-between items-center mb-2">
              <h3 className="text-xl font-semibold text-white">QR Code</h3>
              <button
                onClick={() => setQrCodeLink(null)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="bg-white p-4 rounded-xl">
              <QRCodeSVG value={qrCodeLink} size={256} />
            </div>
            <div className="text-sm text-slate-400 font-mono break-all max-w-sm text-center">
              {qrCodeLink}
            </div>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md shadow-2xl animate-fade-in">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-semibold text-white">{t.settingsTitle}</h3>
              <button
                onClick={() => setIsSettingsOpen(false)}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-400 mb-1">{t.newPassword}</label>
                <input
                  type="password"
                  className="input w-full bg-slate-950"
                  value={newAdminPassword}
                  onChange={(e) => setNewAdminPassword(e.target.value)}
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="p-6 border-t border-slate-800 flex justify-end">
              <button
                onClick={handleChangePassword}
                disabled={isChangingPassword || !newAdminPassword}
                className="btn primary"
              >
                {isChangingPassword ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Settings className="w-4 h-4" />}
                {t.changePasswordBtn}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notifications */}
      <div className="fixed bottom-6 right-6 flex flex-col gap-3 z-50">
        {toasts.map((t) => (
          <div key={t.id} className="panel px-4 py-3 text-sm flex items-center gap-3 animate-fade-in border-l-4" style={{borderLeftColor: t.type === 'error' ? '#ef4444' : '#6366f1'}}>
            {t.text}
          </div>
        ))}
      </div>
    </div>
  );
}
