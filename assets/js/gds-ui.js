/* GDS 共享交互:审批流(左详情+右时间线)、上传结果 Modal、推送/驳回二次确认。
 * 依赖 data.js(window.GDS / window.DEMO_DATA)与 shell.js(window.Shell)。
 * 所有改动经 window.GDS.update 持久化,afterChange() 让页面重渲染。 */
(function () {
  var D = window.DEMO_DATA;

  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]; }); }
  function cur() { return window.Shell.currentIdentity(); }
  function isAdmin() { return cur().role === '分单管理员'; }
  function isReviewer() { return cur().role === '审核人'; }
  function isAssignee(t) { return cur().id === t.assignee_id; }

  // 左栏分组信息(基础 / 任务 / 分单与执行)
  function sections(t) {
    return [
      { title: '基础信息', cols: 3, items: [
        ['项目编号', t.task_no], ['设计单号', t.design_no], ['项目 ID', t.project_id],
        ['项目名', t.project_name, true], ['客户名', t.customer_name], ['部门', t.department]
      ] },
      { title: '任务信息', cols: 3, items: [
        ['任务类型·区域', t.task_type + ' · ' + t.region], ['来源', t.source], ['紧急度', t.urgency],
        ['赏金', t.reward.toFixed(1) + ' WF'], ['状态', t.status], ['CRM 派单时间', t.created_at]
      ] },
      { title: '分单与执行', cols: 3, items: [
        ['执行人员', t.assignee_name], ['审核人', t.reviewer_name], ['分单时间', t.assign_time],
        ['期望完成', t.expected_complete_time], ['上传时间', t.uploaded_at],
        ['审核时间', t.reviewed_at], ['推送 CRM', t.pushed_at]
      ] }
    ];
  }

  // 右栏流程节点(按字段 + 审核开关自动生成状态)
  function nodes(t) {
    var reviewOn = window.GDS.reviewOn();
    var admin = '王磊';
    var list = [];
    list.push({ name: '① CRM 派单', time: t.created_at, actor: 'CRM', role: '海外端', status: 'done' });
    list.push({ name: '② 分单管理员分单', time: t.assign_time, actor: admin, role: '分单管理员',
      status: t.assign_time ? 'done' : (t.status === '待分派' ? 'current' : 'pending') });
    list.push({ name: '③ 执行人员上传结果', time: t.uploaded_at, actor: t.assignee_name, role: '执行人员',
      status: t.uploaded_at ? 'done' : (t.assign_time && !t.uploaded_at ? 'current' : 'pending') });
    if (reviewOn) {
      list.push({ name: '④ 审核人审核', time: t.reviewed_at, actor: t.reviewer_name, role: '审核人',
        status: t.reviewed_at ? 'done' : (t.uploaded_at && !t.reviewed_at ? 'current' : 'pending') });
    } else {
      list.push({ name: '④ 审核人审核', time: '', actor: t.reviewer_name, role: '审核人', status: 'skipped' });
    }
    var pushReady = (reviewOn ? t.reviewed_at : t.uploaded_at);
    list.push({ name: (reviewOn ? '⑤' : '④') + ' 推送 CRM', time: t.pushed_at, actor: admin, role: '分单管理员',
      status: t.pushed_at ? 'done' : (pushReady && !t.pushed_at ? 'current' : 'pending'), action: pushReady && !t.pushed_at });
    return list;
  }

  // 底部操作栏:随状态 + 当前身份变化
  function actions(Shell, t, afterChange) {
    var reviewOn = window.GDS.reviewOn();
    var acts = [];
    var go = function () { afterChange && afterChange(); };
    if (t.status === '待分派') {
      if (isAdmin()) {
        acts.push({ text: '编辑分单', type: '', onClick: function () { location.href = 'assignment.html?mode=edit&id=' + t.task_id; } });
        acts.push({ text: '分单', type: 'primary', onClick: function () { location.href = 'assignment.html?mode=new&id=' + t.task_id; } });
      }
    } else if (t.status === '已分派') {
      if (isAssignee(t)) acts.push({ text: '上传处理结果', type: 'primary', onClick: function () { openUpload(Shell, t, go); } });
    } else if (t.status === '待审核' && reviewOn) {
      if (isAdmin() || isReviewer()) {
        acts.push({ text: '驳回', type: 'danger', onClick: function () { confirmReject(Shell, t, go); } });
        acts.push({ text: '通过并推送 CRM', type: 'primary', onClick: function () { confirmPush(Shell, t, go, true); } });
      }
    } else if (t.status === '待推送') {
      if (isAdmin() || isReviewer()) acts.push({ text: '推送 CRM', type: 'primary', onClick: function () { confirmPush(Shell, t, go, false); } });
    }
    if (!acts.length) acts.push({ text: '关闭', type: '', onClick: Shell.closeDrawer });
    return acts;
  }

  // 打开任务审批浮层(左详情 + 右时间线)
  function openReview(Shell, t, afterChange) {
    Shell.openApproval({
      title: t.project_name, subtitle: t.design_no,
      sections: sections(t), nodes: nodes(t),
      actions: actions(Shell, t, afterChange)
    });
  }

  // 上传处理结果 Modal(处理说明必填 + 文件占位)
  function openUpload(Shell, t, afterChange) {
    var reviewOn = window.GDS.reviewOn();
    var tip = reviewOn ? '提交后进入「待审核」,由审核人确认后推送 CRM。' : '当前关闭审核,提交后直接进入「待推送」。';
    Shell.openModal({
      title: '上传处理结果 · ' + t.design_no, size: 'md',
      body: '<form id="up-form" class="form-grid" style="--form-cols:1">' +
        '<div class="form-item"><div class="f-label">处理说明 <span class="req">*</span></div>' +
        '<textarea class="field" id="up-note" rows="4" maxlength="500" placeholder="请描述本次处理内容、与客户要求的对应关系(≤500 字)"></textarea>' +
        '<div class="f-tip" id="up-note-tip"></div></div>' +
        '<div class="form-item"><div class="f-label">上传文件 <span class="req">*</span></div>' +
        '<div class="upload-dnd" id="up-drop">点击或拖拽文件到此(演示环境不真正上传)<br><span id="up-file" style="color:var(--g-brand-dark)"></span></div>' +
        '<div class="f-tip" id="up-file-tip"></div></div>' +
        '<div class="f-tip" style="color:var(--g-text-weak)">ℹ ' + tip + '</div>' +
      '</form>',
      actions: [
        { text: '取消', onClick: Shell.closeModal },
        { text: '提交', type: 'primary', onClick: function () {
          var note = (document.getElementById('up-note').value || '').trim();
          var fileEl = document.getElementById('up-file');
          var okNote = !!note, okFile = !!(fileEl && fileEl.textContent);
          document.getElementById('up-form').querySelectorAll('.form-item').forEach(function (fi) { fi.classList.remove('error'); });
          if (!okNote) { var n = document.getElementById('up-note').closest('.form-item'); n.classList.add('error'); document.getElementById('up-note-tip').textContent = '请填写处理说明'; }
          if (!okFile) { var f = document.getElementById('up-drop').closest('.form-item'); f.classList.add('error'); document.getElementById('up-file-tip').textContent = '请至少选择一个文件(演示)'; }
          if (!okNote || !okFile) return;
          var now = nowStr();
          window.GDS.update(t.task_id, {
            note: note, uploaded_at: now, status: reviewOn ? '待审核' : '待推送',
            uploaded_files: [{ name: fileEl.textContent, size: '2.0 MB', time: now }]
          });
          Shell.closeModal(); Shell.closeDrawer();
          Shell.toast('已上传,状态更新为「' + (reviewOn ? '待审核' : '待推送') + '」', 'success');
          afterChange && afterChange();
        } }
      ],
      onOpen: function () {
        var drop = document.getElementById('up-drop');
        drop.addEventListener('click', function () { document.getElementById('up-file').textContent = t.design_no + '-result.zip'; });
      }
    });
  }

  // 推送 CRM 二次确认(fromReview: 待审核→通过并推送)
  function confirmPush(Shell, t, afterChange, fromReview) {
    Shell.openModal({
      title: '推送结果到 CRM', size: 'sm', fullscreenable: false,
      body: '<p style="margin:4px 0 10px">将把任务 <b>' + esc(t.design_no) + '</b> 的处理结果(状态 + 文件)推送回 CRM,推送后状态变为「已完成」。</p>' +
        '<p style="color:var(--g-text-weak);font-size:12px">客户 ' + esc(t.customer_name || '-') + ' · ' + esc(t.region) + ' · 赏金 ' + t.reward.toFixed(1) + ' WF</p>',
      actions: [
        { text: '取消', onClick: Shell.closeModal },
        { text: '确认推送', type: 'primary', onClick: function () {
          var now = nowStr(), patch = { status: '已完成', pushed_at: now };
          if (fromReview) patch.reviewed_at = now;
          window.GDS.update(t.task_id, patch);
          Shell.closeModal(); Shell.closeDrawer();
          Shell.toast('已推送 CRM,任务完成', 'success');
          afterChange && afterChange();
        } }
      ]
    });
  }

  // 驳回二次确认(待审核 → 回到已分派)
  function confirmReject(Shell, t, afterChange) {
    Shell.openModal({
      title: '驳回上传结果', size: 'sm', fullscreenable: false,
      body: '<p style="margin:4px 0 10px">驳回后任务 <b>' + esc(t.design_no) + '</b> 回到「已分派」,执行人员需重新上传。</p>' +
        '<div class="form-item"><div class="f-label">驳回原因</div><textarea class="field" id="rj-reason" rows="3" placeholder="选填,会记录到流程"></textarea></div>',
      actions: [
        { text: '取消', onClick: Shell.closeModal },
        { text: '确认驳回', type: 'danger', onClick: function () {
          window.GDS.update(t.task_id, { status: '已分派', uploaded_at: '', uploaded_files: [] });
          Shell.closeModal(); Shell.closeDrawer();
          Shell.toast('已驳回,任务回到「已分派」', 'error');
          afterChange && afterChange();
        } }
      ]
    });
  }

  function nowStr() {
    var d = new Date(), p = function (n) { return (n < 10 ? '0' : '') + n; };
    return d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + ' ' + p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
  }

  window.GDS_UI = {
    esc: esc, isAdmin: isAdmin, isReviewer: isReviewer, isAssignee: isAssignee,
    sections: sections, nodes: nodes, openReview: openReview,
    openUpload: openUpload, confirmPush: confirmPush, confirmReject: confirmReject, nowStr: nowStr
  };
})();
