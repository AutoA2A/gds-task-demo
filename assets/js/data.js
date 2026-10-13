/* GDS 任务管理 演示数据(全部虚构)。来源:product-requirements.md v1.0。
 * 13 条任务贯穿 待分派 → 已分派 → 待审核/待推送 → 已完成 的状态机。
 * 页面只做本地 JS 过滤/渲染;演示版把运行期改动持久化到 localStorage。 */
(function () {
  // 执行人员(分单下拉只能选这三位)
  var EXECUTORS = [
    { id: 'tom',  name: 'Tom Chen', dept: '设计一部' },
    { id: 'anna', name: 'Anna Li',  dept: '设计二部' },
    { id: 'zhou', name: '周杰',     dept: '设计三部' }
  ];
  var REVIEWER = '李总监';

  // 状态 / 紧急度 → 标签色(见 PRD 12.4;套件提供 success/info/error/warning/neutral)
  var statusTag = {
    '待分派': 'neutral', '已分派': 'info', '待审核': 'warning',
    '待推送': 'warning', '已完成': 'success', '已驳回': 'error'
  };
  var urgencyTag = { '普通': 'neutral', '紧急': 'error', '加急': 'warning' };
  var urgencyRank = { '加急': 0, '紧急': 1, '普通': 2 };

  var tasks = [
    { task_id:'T001', task_no:'PI0057352', design_no:'XF57352-7176', project_id:57352, project_name:'ALI Owner Tedy Villa 外立面洗图', customer_name:'Tedy', department:'设计一部', task_type:'洗图', source:'CRM', urgency:'加急', region:'北美', status:'待分派', assignee_id:'', assignee_name:'', reviewer_name:'', expected_complete_time:'', reward:2600, note:'客户要求 48h 内交付,置顶优先。', created_at:'2026-10-13 09:12:00', assign_time:'', uploaded_at:'', reviewed_at:'', pushed_at:'', uploaded_files:[] },
    { task_id:'T002', task_no:'PI0057348', design_no:'XF57348-7102', project_id:57348, project_name:'Berlin Showroom 现场勘尺', customer_name:'K. Weber', department:'设计二部', task_type:'勘尺', source:'CRM', urgency:'普通', region:'欧洲', status:'待分派', assignee_id:'', assignee_name:'', reviewer_name:'', expected_complete_time:'', reward:1600, note:'', created_at:'2026-10-13 08:40:00', assign_time:'', uploaded_at:'', reviewed_at:'', pushed_at:'', uploaded_files:[] },
    { task_id:'T003', task_no:'PI0057341', design_no:'XF57341-7055', project_id:57341, project_name:'Dubai Mall 展厅 3D 建模', customer_name:'Al Habtoor', department:'设计三部', task_type:'3D', source:'OMS', urgency:'紧急', region:'中东', status:'待分派', assignee_id:'', assignee_name:'', reviewer_name:'', expected_complete_time:'', reward:6800, note:'大客户,7 天内交付。', created_at:'2026-10-12 17:20:00', assign_time:'', uploaded_at:'', reviewed_at:'', pushed_at:'', uploaded_files:[] },

    { task_id:'T004', task_no:'PI0057330', design_no:'XF57330-6988', project_id:57330, project_name:'LA Residence 客厅岩板洗图', customer_name:'Johnson', department:'设计一部', task_type:'洗图', source:'CRM', urgency:'紧急', region:'北美', status:'已分派', assignee_id:'tom', assignee_name:'Tom Chen', reviewer_name:REVIEWER, expected_complete_time:'2026-10-16 18:00', reward:1900, note:'注意色温与原图一致。', created_at:'2026-10-11 10:05:00', assign_time:'2026-10-12 09:30:00', uploaded_at:'', reviewed_at:'', pushed_at:'', uploaded_files:[] },
    { task_id:'T005', task_no:'PI0057322', design_no:'XF57322-6950', project_id:57322, project_name:'Sydney Office 平面布置图', customer_name:'M. Taylor', department:'设计二部', task_type:'平面', source:'CRM', urgency:'普通', region:'亚太', status:'已分派', assignee_id:'anna', assignee_name:'Anna Li', reviewer_name:REVIEWER, expected_complete_time:'2026-10-20 18:00', reward:1400, note:'', created_at:'2026-10-10 15:40:00', assign_time:'2026-10-11 11:10:00', uploaded_at:'', reviewed_at:'', pushed_at:'', uploaded_files:[] },
    { task_id:'T006', task_no:'PI0057315', design_no:'XF57315-6901', project_id:57315, project_name:'Munich Flagship 中庭 3D', customer_name:'BMW Welt', department:'设计三部', task_type:'3D', source:'CRM', urgency:'加急', region:'欧洲', status:'已分派', assignee_id:'zhou', assignee_name:'周杰', reviewer_name:REVIEWER, expected_complete_time:'2026-10-15 12:00', reward:5200, note:'VIP 客户,优先处理。', created_at:'2026-10-10 09:00:00', assign_time:'2026-10-10 14:20:00', uploaded_at:'', reviewed_at:'', pushed_at:'', uploaded_files:[] },

    { task_id:'T007', task_no:'PI0057301', design_no:'XF57301-6840', project_id:57301, project_name:'Toronto Loft 墙板洗图', customer_name:'Smith', department:'设计一部', task_type:'洗图', source:'CRM', urgency:'普通', region:'北美', status:'待审核', assignee_id:'tom', assignee_name:'Tom Chen', reviewer_name:REVIEWER, expected_complete_time:'2026-10-14 18:00', reward:1200, note:'已按客户要求调整反射。', created_at:'2026-10-08 10:00:00', assign_time:'2026-10-08 15:00:00', uploaded_at:'2026-10-12 16:30:00', reviewed_at:'', pushed_at:'', uploaded_files:[ {name:'toronto-loft-final.jpg', size:'4.2 MB', time:'2026-10-12 16:30'}, {name:'说明-调整记录.pdf', size:'320 KB', time:'2026-10-12 16:30'} ] },
    { task_id:'T008', task_no:'PI0057294', design_no:'XF57294-6799', project_id:57294, project_name:'Doha Suite 平面方案', customer_name:'Qatari Diar', department:'设计二部', task_type:'平面', source:'OMS', urgency:'紧急', region:'中东', status:'待审核', assignee_id:'anna', assignee_name:'Anna Li', reviewer_name:REVIEWER, expected_complete_time:'2026-10-13 18:00', reward:1800, note:'', created_at:'2026-10-07 09:30:00', assign_time:'2026-10-07 13:00:00', uploaded_at:'2026-10-12 11:05:00', reviewed_at:'', pushed_at:'', uploaded_files:[ {name:'doha-suite-plan.pdf', size:'2.1 MB', time:'2026-10-12 11:05'} ] },

    { task_id:'T009', task_no:'PI0057288', design_no:'XF57288-6760', project_id:57288, project_name:'Melbourne House 现场勘尺', customer_name:'G. Nguyen', department:'设计三部', task_type:'勘尺', source:'CRM', urgency:'普通', region:'亚太', status:'待推送', assignee_id:'zhou', assignee_name:'周杰', reviewer_name:REVIEWER, expected_complete_time:'2026-10-12 18:00', reward:1300, note:'勘尺数据已核对无误。', created_at:'2026-10-06 10:00:00', assign_time:'2026-10-06 14:00:00', uploaded_at:'2026-10-11 17:40:00', reviewed_at:'', pushed_at:'', uploaded_files:[ {name:'melbourne-measure.zip', size:'860 KB', time:'2026-10-11 17:40'} ] },

    { task_id:'T010', task_no:'PI0057270', design_no:'XF57270-6688', project_id:57270, project_name:'NYC Penthouse 整案 3D', customer_name:'R. Cohen', department:'设计一部', task_type:'3D', source:'CRM', urgency:'加急', region:'北美', status:'已完成', assignee_id:'tom', assignee_name:'Tom Chen', reviewer_name:REVIEWER, expected_complete_time:'2026-10-09 18:00', reward:7200, note:'客户二次确认通过。', created_at:'2026-10-02 09:00:00', assign_time:'2026-10-02 11:00:00', uploaded_at:'2026-10-07 16:00:00', reviewed_at:'2026-10-08 10:20:00', pushed_at:'2026-10-08 10:40:00', uploaded_files:[ {name:'nyc-penthouse-3d.zip', size:'18.6 MB', time:'2026-10-07 16:00'} ] },
    { task_id:'T011', task_no:'PI0057262', design_no:'XF57262-6650', project_id:57262, project_name:'Paris Atelier 洗图', customer_name:'L. Martin', department:'设计二部', task_type:'洗图', source:'CRM', urgency:'普通', region:'欧洲', status:'已完成', assignee_id:'anna', assignee_name:'Anna Li', reviewer_name:REVIEWER, expected_complete_time:'2026-10-08 18:00', reward:1100, note:'', created_at:'2026-10-01 10:00:00', assign_time:'2026-10-01 14:00:00', uploaded_at:'2026-10-05 15:00:00', reviewed_at:'2026-10-06 09:30:00', pushed_at:'2026-10-06 09:50:00', uploaded_files:[ {name:'paris-atelier.jpg', size:'3.8 MB', time:'2026-10-05 15:00'} ] },
    { task_id:'T012', task_no:'PI0057255', design_no:'XF57255-6610', project_id:57255, project_name:'Auckland Store 平面', customer_name:'H. Wilson', department:'设计三部', task_type:'平面', source:'OMS', urgency:'紧急', region:'亚太', status:'已完成', assignee_id:'zhou', assignee_name:'周杰', reviewer_name:REVIEWER, expected_complete_time:'2026-10-06 18:00', reward:1700, note:'', created_at:'2026-09-29 09:00:00', assign_time:'2026-09-29 13:00:00', uploaded_at:'2026-10-03 11:00:00', reviewed_at:'2026-10-04 10:00:00', pushed_at:'2026-10-04 10:15:00', uploaded_files:[ {name:'auckland-plan.pdf', size:'1.6 MB', time:'2026-10-03 11:00'} ] },
    { task_id:'T013', task_no:'PI0057240', design_no:'XF57240-6555', project_id:57240, project_name:'Riyadh Office 勘尺', customer_name:'KAFD', department:'设计一部', task_type:'勘尺', source:'CRM', urgency:'普通', region:'中东', status:'已完成', assignee_id:'tom', assignee_name:'Tom Chen', reviewer_name:REVIEWER, expected_complete_time:'2026-10-05 18:00', reward:1500, note:'', created_at:'2026-09-27 10:00:00', assign_time:'2026-09-27 15:00:00', uploaded_at:'2026-10-01 16:00:00', reviewed_at:'2026-10-02 09:00:00', pushed_at:'2026-10-02 09:20:00', uploaded_files:[ {name:'riyadh-measure.zip', size:'740 KB', time:'2026-10-01 16:00'} ] }
  ];

  window.DEMO_DATA = {
    tasks: tasks,
    executors: EXECUTORS,
    reviewer: REVIEWER,
    statusTag: statusTag,
    urgencyTag: urgencyTag,
    urgencyRank: urgencyRank
  };

  /* ---------- 运行期状态:持久化到 localStorage(演示版) ---------- */
  var LS_DATA = 'gds-tasks-v1';
  var LS_REVIEW = 'gds-review-mode';

  window.GDS = {
    // 读取(带本地改动合并);外部清空则回落到初始 13 条
    load: function () {
      try {
        var raw = localStorage.getItem(LS_DATA);
        if (raw) { var arr = JSON.parse(raw); if (arr && arr.length) return arr; }
      } catch (e) {}
      return JSON.parse(JSON.stringify(tasks));
    },
    save: function (arr) { try { localStorage.setItem(LS_DATA, JSON.stringify(arr)); } catch (e) {} },
    reset: function () { try { localStorage.removeItem(LS_DATA); } catch (e) {} },
    get: function (id) { return window.GDS.load().filter(function (t) { return t.task_id === id; })[0]; },
    update: function (id, patch) {
      var arr = window.GDS.load();
      for (var i = 0; i < arr.length; i++) if (arr[i].task_id === id) { for (var k in patch) arr[i][k] = patch[k]; }
      window.GDS.save(arr); return arr;
    },
    // 审核模式开关(默认开启)
    reviewOn: function () {
      try { var v = localStorage.getItem(LS_REVIEW); return v === null ? true : v === '1'; } catch (e) { return true; }
    },
    setReview: function (on) { try { localStorage.setItem(LS_REVIEW, on ? '1' : '0'); } catch (e) {} }
  };
})();
