/* 导航与品牌配置 —— GDS(George Design System)任务管理
 * 品牌默认 George Design(本系统名)。身份切换为演示用,不是权限控制。
 * 每个 leaf 的 page 指向 assets/pages/ 下的 html 文件(同目录,写文件名即可)。 */
window.GUI_NAV = {
  brand: 'George Design',
  logoText: 'G',
  tenant: 'GDS 任务管理',
  theme: '',
  identities: [
    { id: 'admin',  name: '王磊',     dept: '国内运营团队', role: '分单管理员' },
    { id: 'tom',    name: 'Tom Chen', dept: '设计一部',     role: '执行人员' },
    { id: 'anna',   name: 'Anna Li',  dept: '设计二部',     role: '执行人员' },
    { id: 'zhou',   name: '周杰',     dept: '设计三部',     role: '执行人员' },
    { id: 'review', name: '李总监',   dept: '设计中心',     role: '审核人' }
  ],
  primary: [
    {
      id: 'task', label: '任务管理', icon: 'layout',
      children: [
        { id: 'task-square', label: '任务广场', page: 'task-square.html' },
        { id: 'my-tasks',    label: '我的任务', page: 'my-tasks.html' }
      ]
    }
  ]
};
