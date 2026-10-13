/* ============================================================
 * George-UI-V3 外壳脚本 (纯原生 JS,无框架依赖)
 * 作用:为每个 .html 页面注入统一的顶栏 + 一/二级导航 + 内容区外壳,
 *       并提供抽屉 / toast / 二级收起 等交互。
 * 多页:导航项为 <a href="xxx.html">,双击 index.html 后页面可互相跳转。
 * 全部相对路径,file:// 直接打开即可运行,无需任何服务器。
 * 用法:页面 <body data-page="叶子ID">,正文放入 <template id="page-content">。
 * 导航在 nav-config.js 的 window.GUI_NAV 中定义。
 * ============================================================ */
(function () {
  'use strict';

  // 内置图标(inline SVG,避免额外图片请求;需要更多图标时追加即可)
  var ICON = {
    layout:  '<path d="M3 4h18v4H3zM3 10h8v10H3zM13 10h8v10h-8z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    list:    '<path d="M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    card:    '<path d="M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    detail:  '<path d="M5 3h9l5 5v13H5zM14 3v5h5" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    form:    '<path d="M4 5h16M4 10h16M4 15h10" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    box:     '<path d="M3 7l9-4 9 4-9 4zM3 7v10l9 4 9-4V7" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    user:    '<circle cx="12" cy="8" r="4" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M4 20a8 8 0 0116 0" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    bell:    '<path d="M6 9a6 6 0 1112 0c0 5 2 6 2 6H4s2-1 2-6zM10 20a2 2 0 004 0" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    search:  '<circle cx="11" cy="11" r="6" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M20 20l-4-4" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    collapse:'<path d="M15 6l-6 6 6 6M9 6v12" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round"/>',
    close:   '<path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    apps:    '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    refresh: '<path d="M20 11a8 8 0 10-2 5m2 3v-5h-5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/>',
    theme:   '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 4v16" stroke="currentColor" stroke-width="1.6"/>',
    moon:    '<path d="M20 14a8 8 0 11-10-10 7 7 0 0010 10z" fill="none" stroke="currentColor" stroke-width="1.6"/>',
    gear:    '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2" stroke="currentColor" stroke-width="1.4"/>',
    filter:  '<path d="M3 5h18l-7 8v5l-4 2v-7z" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linejoin="round"/>',
    check:   '<path d="M5 12l4 4 10-10" stroke="currentColor" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    back:    '<path d="M15 6l-6 6 6 6" stroke="currentColor" stroke-width="1.8" fill="none" stroke-linecap="round" stroke-linejoin="round"/>',
    expand:  '<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" stroke="currentColor" stroke-width="1.6" fill="none" stroke-linecap="round" stroke-linejoin="round"/>'
  };
  function svg(name) {
    return '<svg viewBox="0 0 24 24">' + (ICON[name] || ICON.box) + '</svg>';
  }

  function h(tag, attrs, html) {
    var el = document.createElement(tag);
    if (attrs) for (var k in attrs) {
      if (k === 'class') el.className = attrs[k];
      else if (k === 'html') el.innerHTML = attrs[k];
      else el.setAttribute(k, attrs[k]);
    }
    if (html != null) el.innerHTML = html;
    return el;
  }

  var Shell = {};

  // 固定「系统管理」导航(所有 demo 自动引用:角色管理 / 用户管理 / 菜单管理)
  var SYS_PRIMARY = {
    id: 'sys', label: '系统管理', icon: 'gear', children: [
      { id: 'sys-roles', label: '角色管理', page: 'sys-roles.html' },
      { id: 'sys-users', label: '用户管理', page: 'sys-users.html' },
      { id: 'sys-menus', label: '菜单管理', page: 'sys-menus.html' }
    ]
  };

  Shell.render = function () {
    var cfg = window.GUI_NAV || { brand: 'George Design', primary: [] };
    cfg.primary = cfg.primary || [];
    // 自动把「系统管理」追加到末尾(除非 demo 已自定义同名一级)
    var hasSys = false;
    for (var si = 0; si < cfg.primary.length; si++) if (cfg.primary[si].id === 'sys') hasSys = true;
    if (!hasSys) cfg.primary = cfg.primary.concat([SYS_PRIMARY]);
    var activeLeaf = document.body.getAttribute('data-page') || '';
    if (cfg.theme) document.documentElement.setAttribute('data-theme', cfg.theme);

    // 找到当前激活的一级 + 其下的二级
    var activePrimary = null;
    cfg.primary.forEach(function (p) {
      (p.children || []).forEach(function (c) { if (c.id === activeLeaf) activePrimary = p; });
      if (p.id === activeLeaf) activePrimary = p;
    });
    if (!activePrimary) activePrimary = cfg.primary[0] || null;
    var hasSecondary = activePrimary && activePrimary.children && activePrimary.children.length;

    var shell = h('div', { class: 'sys-shell' });
    shell.setAttribute('data-secondary', hasSecondary ? 'expanded' : 'none');

    /* ---------- 顶部操作区 ---------- */
    var top = h('div', { class: 'sys-top' });
    var brand = h('div', { class: 'sys-brand' },
      '<span class="logo">' + (cfg.logoText || 'G') + '</span><span>' + cfg.brand + '</span>');

    // 工作页签:刷新 + 当前打开的页面(可关闭)
    var worktabs = h('div', { class: 'sys-worktabs' });
    worktabs.appendChild(h('button', { class: 'sys-icon-btn', title: '刷新', onclick: '' }, svg('refresh')));
    var curLeafLabel = (activePrimary && (activePrimary.children || []).filter(function (c) { return c.id === activeLeaf; })[0] || {}).label
      || (activePrimary ? activePrimary.label : '首页');
    var wt = h('div', { class: 'sys-worktab active' }, '<span>' + curLeafLabel + '</span><span class="x">×</span>');
    worktabs.appendChild(wt);
    worktabs.querySelector('.sys-icon-btn').addEventListener('click', function () { location.reload(); });

    var tools = h('div', { class: 'sys-tools' });
    if (cfg.tenant) tools.appendChild(h('span', { class: 'sys-tenant' }, '◈ ' + cfg.tenant));
    ['apps', 'search', 'bell', 'theme', 'moon'].forEach(function (ic) {
      var titles = { apps: '应用', search: '搜索', bell: '通知', theme: '主题', moon: '深色模式' };
      var b = h('button', { class: 'sys-icon-btn', title: titles[ic] }, svg(ic));
      b.addEventListener('click', function () { Shell.toast(titles[ic] + '(演示)'); });
      tools.appendChild(b);
    });
    // 固定「系统设置」齿轮:直达系统管理(角色管理)
    var sysGear = h('button', { class: 'sys-icon-btn', title: '系统设置' }, svg('gear'));
    sysGear.addEventListener('click', function () { location.href = 'sys-roles.html'; });
    tools.appendChild(sysGear);
    // 身份切换(演示用,不是权限控制)
    if (cfg.identities && cfg.identities.length) {
      var cur = Shell.currentIdentity();
      var ident = h('button', { class: 'sys-identity', title: '切换演示身份' },
        '<span class="avatar">' + (cur.name || '演').slice(0, 1) + '</span><span>' + cur.name + ' · ' + cur.role + '</span>');
      ident.addEventListener('click', function (e) { e.stopPropagation(); Shell._identityMenu(ident, cfg.identities); });
      tools.appendChild(ident);
    } else {
      tools.appendChild(h('button', { class: 'sys-identity' }, '<span class="avatar">演</span><span>演示账号</span>'));
    }
    top.appendChild(brand); top.appendChild(worktabs); top.appendChild(tools);

    /* ---------- 一级导航 ---------- */
    var primary = h('div', { class: 'sys-primary' });
    var pItems = h('div', { class: 'sys-primary-items' });
    cfg.primary.forEach(function (p) {
      var href = p.home || (p.children && p.children[0] && p.children[0].page) || p.page || '#';
      var a = h('a', { class: 'sys-primary-item' + (p === activePrimary ? ' active' : ''), href: href },
        svg(p.icon) + '<span>' + p.label + '</span>');
      pItems.appendChild(a);
    });
    primary.appendChild(pItems);
    primary.appendChild(h('div', { class: 'sys-env' }, '演示环境'));

    /* ---------- 二/三级导航 (无下级则不渲染,R072/R075) ---------- */
    var secondary = h('div', { class: 'sys-secondary' });
    if (hasSecondary) {
      var head = h('div', { style: 'display:flex;align-items:center;justify-content:space-between' });
      head.appendChild(h('h2', null, activePrimary.label));
      var collapseBtn = h('button', { class: 'sys-icon-btn', title: '收起导航', style: 'width:28px;height:28px' }, svg('collapse'));
      collapseBtn.addEventListener('click', function () {
        var cur = shell.getAttribute('data-secondary');
        shell.setAttribute('data-secondary', cur === 'collapsed' ? 'expanded' : 'collapsed');
      });
      head.appendChild(collapseBtn);
      secondary.appendChild(head);
      activePrimary.children.forEach(function (c) {
        var a = h('a', { class: 'sys-leaf' + (c.id === activeLeaf ? ' active' : ''), href: c.page || '#' }, c.label);
        secondary.appendChild(a);
      });
    }

    /* ---------- 内容区:注入页面正文 ---------- */
    var content = h('div', { class: 'sys-content' });
    var page = h('div', { class: 'sys-page' });
    var tpl = document.getElementById('page-content');
    if (tpl) page.appendChild(tpl.content.cloneNode(true));
    content.appendChild(page);

    /* ---------- 浮层容器(抽屉/弹窗) ---------- */
    var overlay = h('div', { class: 'sys-overlay', id: 'sys-overlay' });
    overlay.appendChild(h('div', { class: 'mask' }));
    overlay.querySelector('.mask').addEventListener('click', Shell.closeDrawer);

    shell.appendChild(top); shell.appendChild(primary); shell.appendChild(secondary);
    shell.appendChild(content); shell.appendChild(overlay);

    document.body.appendChild(shell);
    Shell._content = content;
    document.addEventListener('click', function () { var m = document.querySelector('.ident-menu'); if (m) m.remove(); });

    if (typeof window.onShellReady === 'function') window.onShellReady(Shell);
  };

  /* ---------- 身份(演示切换,存 localStorage) ---------- */
  Shell.currentIdentity = function () {
    var cfg = window.GUI_NAV || {};
    var list = cfg.identities || [{ id: 'guest', name: '演示账号', role: '访客' }];
    var id = null;
    try { id = localStorage.getItem('gui-identity'); } catch (e) {}
    return list.filter(function (x) { return x.id === id; })[0] || list[0];
  };
  Shell._identityMenu = function (anchor, list) {
    var old = document.querySelector('.ident-menu'); if (old) { old.remove(); return; }
    var menu = h('div', { class: 'ident-menu', style: 'position:fixed;z-index:200;background:#fff;border:1px solid var(--g-border);border-radius:8px;box-shadow:var(--g-shadow-pop);min-width:200px;padding:4px' });
    var r = anchor.getBoundingClientRect();
    menu.style.top = (r.bottom + 6) + 'px'; menu.style.right = '12px';
    var curId = Shell.currentIdentity().id;
    list.forEach(function (u) {
      var item = h('div', { style: 'padding:8px 10px;border-radius:6px;cursor:pointer;' + (u.id === curId ? 'background:var(--g-brand-gray);' : '') },
        '<div style="font-size:12px;color:var(--g-text)">' + u.name + '</div><div style="font-size:10px;color:var(--g-text-weak)">' + (u.dept ? u.dept + ' · ' : '') + u.role + '</div>');
      item.addEventListener('mouseenter', function () { if (u.id !== curId) item.style.background = 'var(--g-fill-hover)'; });
      item.addEventListener('mouseleave', function () { if (u.id !== curId) item.style.background = ''; });
      item.addEventListener('click', function () { try { localStorage.setItem('gui-identity', u.id); } catch (e) {} location.reload(); });
      menu.appendChild(item);
    });
    document.body.appendChild(menu);
  };

  /* ---------- 抽屉 ---------- */
  Shell.openDrawer = function (opts) {
    opts = opts || {};
    var overlay = document.getElementById('sys-overlay');
    var old = overlay.querySelector('.drawer'); if (old) old.remove();
    var drawer = h('div', { class: 'drawer' });
    var head = h('div', { class: 'drawer-head' });
    head.appendChild(h('h3', null, opts.title || '详情'));
    var x = h('button', { class: 'sys-icon-btn', title: '关闭', style: 'width:28px;height:28px' }, svg('close'));
    x.addEventListener('click', Shell.closeDrawer);
    head.appendChild(x);
    var body = h('div', { class: 'drawer-body' }, opts.body || '');
    var foot = h('div', { class: 'drawer-foot' });
    (opts.actions || [{ text: '关闭', onClick: Shell.closeDrawer }]).forEach(function (a) {
      var b = h('button', { class: 'btn' + (a.primary ? ' primary' : '') }, a.text);
      b.addEventListener('click', function () { a.onClick && a.onClick(); });
      foot.appendChild(b);
    });
    drawer.appendChild(head); drawer.appendChild(body); drawer.appendChild(foot);
    overlay.appendChild(drawer);
    overlay.classList.add('open');
    if (typeof opts.onOpen === 'function') opts.onOpen(body);
    return body;
  };
  Shell.closeDrawer = function () {
    var overlay = document.getElementById('sys-overlay');
    if (overlay) overlay.classList.remove('open');
  };

  /* ---------- 审批流面板(左侧弹出的宽面板:左=详情,右=审批节点) ----------
   * opts: {
   *   title, subtitle,
   *   sections: [{ title, cols, items: [[k, v, wide?], ...] }],
   *   nodes:    [{ name, time, actor, role, duration, note, status, action }],
   *             status: done=已通过 / skipped=已跳过 / current=待审批 / pending=未开始
   *   actions:  [{ text, type('primary'|'danger'|''), onClick }]   // 右下操作栏
   * }
   */
  Shell.openApproval = function (opts) {
    opts = opts || {};
    var overlay = document.getElementById('sys-overlay');
    var old = overlay.querySelector('.drawer'); if (old) old.remove();

    var statusText = { done: '已通过', skipped: '已跳过', current: '待审批', pending: '未开始' };
    var panel = h('div', { class: 'drawer approval' });

    // 头部:返回 + 标题
    var head = h('div', { class: 'drawer-head' });
    var left = h('div', { style: 'display:flex;align-items:center;gap:10px;min-width:0' });
    var backBtn = h('button', { class: 'sys-icon-btn', title: '返回', style: 'width:28px;height:28px' }, svg('back'));
    backBtn.addEventListener('click', Shell.closeDrawer);
    left.appendChild(backBtn);
    left.appendChild(h('h3', { style: 'overflow:hidden;text-overflow:ellipsis;white-space:nowrap' },
      (opts.title || '审批详情') + (opts.subtitle ? ' <span style="color:var(--g-text-weak);font-weight:400;font-size:12px">· ' + opts.subtitle + '</span>' : '')));
    var x = h('button', { class: 'sys-icon-btn', title: '关闭', style: 'width:28px;height:28px' }, svg('close'));
    x.addEventListener('click', Shell.closeDrawer);
    head.appendChild(left); head.appendChild(x);

    // 主体:两栏
    var flow = h('div', { class: 'approval-flow' });

    // 左:详情(分组信息)
    var main = h('div', { class: 'af-main' });
    (opts.sections || []).forEach(function (sec) {
      var block = h('div', { class: 'af-section' });
      block.appendChild(h('div', { class: 'section-head' }, '<h3>' + sec.title + '</h3>'));
      var grid = h('div', { class: 'info-grid' });
      grid.style.setProperty('--info-cols', sec.cols || 3);
      (sec.items || []).forEach(function (kv) {
        var v = (kv[1] != null && kv[1] !== '') ? kv[1] : '-';
        grid.appendChild(h('div', { class: 'info-item' + (kv[2] ? ' wide' : '') },
          '<div class="k">' + kv[0] + '</div><div class="v">' + v + '</div>'));
      });
      block.appendChild(grid);
      main.appendChild(block);
    });

    // 右:审批节点(流程记录时间线)
    var side = h('div', { class: 'af-side' });
    side.appendChild(h('div', { class: 'section-head' }, '<h3>流程记录</h3>'));
    var list = h('div', { class: 'flow-list af-nodes' });
    (opts.nodes || []).forEach(function (n) {
      var item = h('div', { class: 'flow-item node-' + (n.status || 'pending') });
      var statusBadge = n.status && n.status !== 'current'
        ? '<span class="node-badge ' + n.status + '">' + (statusText[n.status] || '') + '</span>' : '';
      var html = '<div class="flow-head"><span class="f-title">' + n.name + '</span><span class="f-time">' + (n.time || '-') + '</span></div>';
      html += '<div class="flow-actor"><span class="avatar">' + (n.actor || '·').slice(0, 1) + '</span>' +
        (n.actor || '-') + (n.role ? ' · ' + n.role : '') +
        (n.duration ? '<span class="f-dur">' + n.duration + '</span>' : '') + statusBadge + '</div>';
      if (n.note) html += '<div class="flow-note">' + n.note + '</div>';
      item.innerHTML = html;
      // 当前节点内嵌操作入口(更多)
      if (n.status === 'current' && n.action) {
        var inline = h('div', { class: 'node-inline-ops' });
        var more = h('button', { class: 'link-btn' }, '更多 ▾');
        more.addEventListener('click', function () { Shell.toast('更多操作(演示):加签 / 查看附件'); });
        inline.appendChild(more);
        item.appendChild(inline);
      }
      list.appendChild(item);
    });
    side.appendChild(list);

    // 右下:审批操作栏
    var acts = h('div', { class: 'af-actions' });
    (opts.actions || [
      { text: '驳回', type: 'danger', onClick: function () { Shell.toast('已驳回(演示)', 'error'); Shell.closeDrawer(); } },
      { text: '转交', type: '', onClick: function () { Shell.toast('已转交(演示)'); } },
      { text: '同意', type: 'primary', onClick: function () { Shell.toast('审批已通过(演示)', 'success'); Shell.closeDrawer(); } }
    ]).forEach(function (a) {
      var cls = 'btn' + (a.type === 'primary' ? ' primary' : (a.type === 'danger' ? ' danger-outline' : ''));
      var b = h('button', { class: cls }, a.text);
      b.addEventListener('click', function () { a.onClick && a.onClick(); });
      acts.appendChild(b);
    });
    side.appendChild(acts);

    flow.appendChild(main); flow.appendChild(side);
    panel.appendChild(head); panel.appendChild(flow);
    overlay.appendChild(panel);
    overlay.classList.add('open');
    return panel;
  };

  /* ---------- 居中弹窗 modal(详情速览 / 表单 / 二次确认 / 版本记录等) ----------
   * 固定居中、带遮罩、内部滚动、最高层级,相对"视口"居中——不受内容区布局影响,杜绝错位。
   * opts: {
   *   title, size('sm'|'md'|'lg'|'xl'|'full', 默认 md),
   *   body: 字符串 HTML 或 DOM 节点(二选一;也可用 onOpen 回填),
   *   actions: [{ text, type('primary'|'danger'|''), onClick }](传 null 则无底部栏),
   *   fullscreenable(默认 true,显示全屏切换), maskClosable(默认 true), onOpen(body){}
   * }
   * 返回 body 元素,便于继续填充。
   */
  Shell.openModal = function (opts) {
    opts = opts || {};
    Shell.closeModal();
    var wrap = h('div', { class: 'modal-wrap', id: 'sys-modal' });
    var mask = h('div', { class: 'modal-mask' });
    if (opts.maskClosable !== false) mask.addEventListener('click', Shell.closeModal);
    var modal = h('div', { class: 'modal size-' + (opts.size || 'md') });

    var head = h('div', { class: 'modal-head' });
    head.appendChild(h('h3', null, opts.title || '弹窗'));
    var tools = h('div', { class: 'modal-head-tools' });
    if (opts.fullscreenable !== false) {
      var fs = h('button', { class: 'sys-icon-btn', title: '全屏', style: 'width:28px;height:28px' }, svg('expand'));
      fs.addEventListener('click', function () { modal.classList.toggle('full'); });
      tools.appendChild(fs);
    }
    var x = h('button', { class: 'sys-icon-btn', title: '关闭', style: 'width:28px;height:28px' }, svg('close'));
    x.addEventListener('click', Shell.closeModal);
    tools.appendChild(x);
    head.appendChild(tools);

    var body = h('div', { class: 'modal-body' });
    if (typeof opts.body === 'string') body.innerHTML = opts.body;
    else if (opts.body) body.appendChild(opts.body);

    modal.appendChild(head); modal.appendChild(body);

    if (opts.actions !== null) {
      var foot = h('div', { class: 'modal-foot' });
      (opts.actions || [{ text: '关闭', onClick: Shell.closeModal }]).forEach(function (a) {
        var cls = 'btn' + (a.type === 'primary' ? ' primary' : (a.type === 'danger' ? ' danger-outline' : ''));
        var b = h('button', { class: cls }, a.text);
        b.addEventListener('click', function () { a.onClick && a.onClick(); });
        foot.appendChild(b);
      });
      modal.appendChild(foot);
    }

    wrap.appendChild(mask); wrap.appendChild(modal);
    document.body.appendChild(wrap);
    requestAnimationFrame(function () { wrap.classList.add('open'); });
    if (typeof opts.onOpen === 'function') opts.onOpen(body);
    Shell._modalEsc = function (e) { if (e.key === 'Escape') Shell.closeModal(); };
    document.addEventListener('keydown', Shell._modalEsc);
    return body;
  };
  Shell.closeModal = function () {
    var w = document.getElementById('sys-modal');
    if (w) w.remove();
    if (Shell._modalEsc) { document.removeEventListener('keydown', Shell._modalEsc); Shell._modalEsc = null; }
  };

  /* ---------- toast ---------- */
  Shell.toast = function (msg, type) {
    var t = h('div', { class: 'g-toast ' + (type || '') }, msg);
    document.body.appendChild(t);
    requestAnimationFrame(function () { t.classList.add('show'); });
    setTimeout(function () { t.classList.remove('show'); setTimeout(function () { t.remove(); }, 250); }, 1800);
  };

  window.Shell = Shell;
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', Shell.render);
  else Shell.render();
})();
