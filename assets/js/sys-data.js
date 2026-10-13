/* 系统管理公共数据与权限逻辑(所有 demo 自动引用,固定三页:角色管理/用户管理/菜单管理)。
 * 菜单树默认从 window.GUI_NAV 自动生成(含自动追加的「系统管理」),demo 可在加载本文件前
 * 预置 window.SYS_DATA = { roles, users, menus } 覆盖默认。
 * 核心权限逻辑:用户绑定一个角色 → 用户在本系统获得该角色的权限(范围 scope + 可见菜单 menus)。
 * 全部虚构,运行期改动持久化到 localStorage。 */
(function () {
  var LS = 'sys-admin-v1';
  var SCOPES = ['无权限', '个人权限', '部门权限', '全权限'];

  // 从导航自动生成菜单树(目录=一级,菜单=二级;无子级的一级作为菜单)
  function menusFromNav() {
    var nav = window.GUI_NAV || {}, out = [], order = 0;
    (nav.primary || []).forEach(function (p) {
      var kids = (p.children || []).map(function (c, i) {
        return { id: c.id, title: c.label, type: '菜单', order: i + 1, path: '/' + p.id + '/' + c.id,
          component: (c.page || '').replace('.html', '') || 'View', status: '启用' };
      });
      out.push({ id: p.id, title: p.label, type: '目录', order: ++order,
        path: p.home ? '/' + p.id : '/' + p.id, component: 'LAYOUT', status: '启用', children: kids });
    });
    // 固定「系统管理」目录(shell.js 在导航里自动追加,这里同步补进菜单树)
    var hasSys = false;
    for (var i = 0; i < out.length; i++) if (out[i].id === 'sys') hasSys = true;
    if (!hasSys) out.push({ id: 'sys', title: '系统管理', type: '目录', order: ++order, path: '/sys', component: 'LAYOUT', status: '启用', children: [
      { id: 'sys-roles', title: '角色管理', type: '菜单', order: 1, path: '/sys/roles', component: 'sys-roles', status: '启用' },
      { id: 'sys-users', title: '用户管理', type: '菜单', order: 2, path: '/sys/users', component: 'sys-users', status: '启用' },
      { id: 'sys-menus', title: '菜单管理', type: '菜单', order: 3, path: '/sys/menus', component: 'sys-menus', status: '启用' }
    ] });
    return out;
  }

  function leaves(menus) {
    var ids = [];
    (menus || []).forEach(function (m) {
      if (m.children && m.children.length) m.children.forEach(function (c) { ids.push(c.id); });
      else ids.push(m.id);
    });
    return ids;
  }
  function titleMap(menus) {
    var map = {};
    (menus || []).forEach(function (m) { map[m.id] = m.title; (m.children || []).forEach(function (c) { map[c.id] = c.title; }); });
    return map;
  }

  // 默认数据(可被 window.SYS_DATA 覆盖)
  var preset = window.SYS_DATA || {};
  var menus = preset.menus || menusFromNav();
  var allLeaf = leaves(menus);
  var half = allLeaf.slice(0, Math.max(1, Math.ceil(allLeaf.length / 2)));
  var few = allLeaf.slice(0, Math.max(1, Math.ceil(allLeaf.length / 3)));

  var roles = preset.roles || [
    { id: 'super_admin', name: '超级管理员', code: 'super_admin', status: '启用', scope: '全权限', menus: allLeaf.slice(), remark: '全部角色关联的权限', created: '2023-04-04 07:28:37' },
    { id: 'developer',   name: '开发人员',   code: 'developer',   status: '启用', scope: '全权限', menus: allLeaf.slice(), remark: '全权限', created: '2023-04-04 07:28:37' },
    { id: 'admin_std',   name: '普通管理员', code: 'standardAdmin', status: '启用', scope: '部门权限', menus: half, remark: '部门级管理', created: '2026-07-02 11:22:14' },
    { id: 'inspector',   name: '质检员',     code: 'inspector',   status: '启用', scope: '部门权限', menus: half, remark: '质检相关模块', created: '2026-06-09 16:44:06' },
    { id: 'clerk',       name: '业务文员',   code: 'clerk',       status: '启用', scope: '个人权限', menus: few, remark: '仅处理分配给个人的数据', created: '2026-07-30 13:55:46' },
    { id: 'viewer',      name: '只读访客',   code: 'viewer',      status: '启用', scope: '个人权限', menus: few, remark: '只读', created: '2026-08-03 11:22:48' },
    { id: 'no_perm',     name: '无权限角色', code: 'no_perm',     status: '启用', scope: '无权限', menus: [], remark: '用于待审核账号/自动创建账号', created: '2026-04-13 17:24:58' }
  ];

  var depts = ['后端支持', '前端支持', '设计一部', '设计二部', '设计三部', '运营部', 'AI设计平台', '质检中心'];
  var users = preset.users || (function () {
    var names = ['朱耀深', '许楹辉', '陈璐汶', '叶大成', '许献祖', '汪宏翀', '黄敏堂', '武俊彪', '梁金荣', '黄昊慕', '龙金统', '陈靖军', '李阳', '陈金楼'];
    var roleCycle = ['developer', 'developer', 'developer', 'developer', 'inspector', 'clerk', 'admin_std', 'inspector', 'clerk', 'viewer', 'no_perm', 'viewer', 'developer', 'no_perm'];
    return names.map(function (n, i) {
      return { id: 41300 + i, name: n, dept: depts[i % depts.length], roleId: roleCycle[i % roleCycle.length],
        account_status: (i === 13 ? '停用' : '启用'), employee_status: (i === 13 ? '离职' : '在职') };
    });
  })();

  function save(state) { try { localStorage.setItem(LS, JSON.stringify(state)); } catch (e) {} }
  function load() {
    try { var raw = localStorage.getItem(LS); if (raw) { var s = JSON.parse(raw); if (s && s.roles && s.users && s.menus) return s; } } catch (e) {}
    return { roles: JSON.parse(JSON.stringify(roles)), users: JSON.parse(JSON.stringify(users)), menus: JSON.parse(JSON.stringify(menus)) };
  }

  window.SYS = {
    SCOPES: SCOPES,
    defaults: { roles: roles, users: users, menus: menus },
    leaves: leaves, titleMap: titleMap,
    load: load, save: save,
    reset: function () { try { localStorage.removeItem(LS); } catch (e) {} },
    roleById: function (state, id) { return (state.roles || []).filter(function (r) { return r.id === id; })[0] || null; },
    // 核心:用户绑定角色 → 获得该角色权限
    effective: function (state, user) {
      var role = window.SYS.roleById(state, user && user.roleId);
      if (!role) return { role: null, scope: '无权限', menus: [], count: 0 };
      return { role: role, scope: role.scope, menus: role.menus || [], count: (role.menus || []).length };
    }
  };
})();
