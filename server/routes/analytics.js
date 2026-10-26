import { Router } from 'express';
import User from '../models/User.js';
import Module from '../models/Module.js';
import Enrollment from '../models/Enrollment.js';
import AssessmentResult from '../models/AssessmentResult.js';
import Certification from '../models/Certification.js';
import { protect, authorize } from '../middleware/auth.js';
import { ah } from '../middleware/error.js';
import { certStatus } from '../utils/certStatus.js';

const router = Router();
router.use(protect);

const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);

// Personal dashboard
router.get('/me', ah(async (req, res) => {
  const uid = req.user._id;
  const now = new Date();
  const [enrollments, results, certs] = await Promise.all([
    Enrollment.find({ user: uid }).populate('module', 'title category isMandatory').lean(),
    AssessmentResult.find({ user: uid }).populate('module', 'title').sort('-createdAt').lean(),
    Certification.find({ user: uid }).populate('module', 'title').lean(),
  ]);
  const live = enrollments.filter((e) => e.module);
  const completed = live.filter((e) => e.status === 'completed');
  const overdue = live.filter((e) => e.status !== 'completed' && e.dueDate && new Date(e.dueDate) < now);
  const certsWithStatus = certs.filter((c) => c.module).map((c) => ({ ...c, status: certStatus(c.expiresAt) }));
  const mandatory = live.filter((e) => e.module.isMandatory);

  res.json({
    stats: {
      assigned: live.length,
      completed: completed.length,
      inProgress: live.filter((e) => e.status === 'in-progress').length,
      overdue: overdue.length,
      completionRate: pct(completed.length, live.length),
      complianceRate: pct(mandatory.filter((e) => e.status === 'completed').length, mandatory.length),
      averageScore: results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : null,
      activeCerts: certsWithStatus.filter((c) => c.status !== 'expired').length,
      expiringCerts: certsWithStatus.filter((c) => c.status === 'expiring').length,
      expiredCerts: certsWithStatus.filter((c) => c.status === 'expired').length,
    },
    upcoming: live
      .filter((e) => e.status !== 'completed' && e.dueDate)
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 6),
    renewals: certsWithStatus
      .filter((c) => c.status !== 'active')
      .sort((a, b) => new Date(a.expiresAt) - new Date(b.expiresAt)),
    recentResults: results.filter((r) => r.module).slice(0, 6),
  });
}));

// Organisation analytics (managers see their own department)
router.get('/overview', authorize('admin', 'manager'), ah(async (req, res) => {
  const now = new Date();
  const userFilter = { role: 'employee', isActive: true };
  if (req.user.role === 'manager') userFilter.department = req.user.department;
  const users = await User.find(userFilter).select('name department').lean();
  const ids = users.map((u) => u._id);
  const userById = new Map(users.map((u) => [String(u._id), u]));

  const [enrollments, results, certs, modules] = await Promise.all([
    Enrollment.find({ user: { $in: ids } }).lean(),
    AssessmentResult.find({ user: { $in: ids } }).lean(),
    Certification.find({ user: { $in: ids } }).lean(),
    Module.find().select('title category isMandatory').lean(),
  ]);
  const moduleById = new Map(modules.map((m) => [String(m._id), m]));
  const live = enrollments.filter((e) => moduleById.has(String(e.module)));
  const completed = live.filter((e) => e.status === 'completed');
  const overdue = live.filter((e) => e.status !== 'completed' && e.dueDate && e.dueDate < now);

  // Department completion
  const deptMap = {};
  for (const e of live) {
    const d = userById.get(String(e.user))?.department || 'Unknown';
    deptMap[d] ??= { department: d, assigned: 0, completed: 0, overdue: 0 };
    deptMap[d].assigned++;
    if (e.status === 'completed') deptMap[d].completed++;
    else if (e.dueDate && e.dueDate < now) deptMap[d].overdue++;
  }
  const byDepartment = Object.values(deptMap)
    .map((d) => ({ ...d, completionRate: pct(d.completed, d.assigned) }))
    .sort((a, b) => a.completionRate - b.completionRate);

  // Module performance
  const modStats = {};
  for (const e of live) {
    const k = String(e.module);
    modStats[k] ??= { moduleId: k, title: moduleById.get(k).title, enrolled: 0, completed: 0, attempts: 0, passes: 0, scoreSum: 0 };
    modStats[k].enrolled++;
    if (e.status === 'completed') modStats[k].completed++;
  }
  for (const r of results) {
    const k = String(r.module);
    if (!modStats[k]) continue;
    modStats[k].attempts++;
    modStats[k].scoreSum += r.score;
    if (r.passed) modStats[k].passes++;
  }
  const byModule = Object.values(modStats).map(({ scoreSum, ...m }) => ({
    ...m,
    completionRate: pct(m.completed, m.enrolled),
    averageScore: m.attempts ? Math.round(scoreSum / m.attempts) : 0,
    passRate: pct(m.passes, m.attempts),
  }));

  // Certification status
  const certBreakdown = { active: 0, expiring: 0, expired: 0 };
  for (const c of certs) certBreakdown[certStatus(c.expiresAt, now)]++;

  // Completions over the last 6 months
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({ key: `${d.getFullYear()}-${d.getMonth()}`, label: d.toLocaleString('en', { month: 'short' }), completions: 0, assessments: 0 });
  }
  const monthIdx = new Map(months.map((m, i) => [m.key, i]));
  const bucket = (date) => monthIdx.get(`${date.getFullYear()}-${date.getMonth()}`);
  for (const e of completed) {
    const i = e.completedAt && bucket(new Date(e.completedAt));
    if (i !== undefined && i !== null && i !== false) months[i].completions++;
  }
  for (const r of results) {
    const i = bucket(new Date(r.createdAt));
    if (i !== undefined) months[i].assessments++;
  }

  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + r.score, 0) / results.length) : 0;
  const mandatoryEnr = live.filter((e) => moduleById.get(String(e.module)).isMandatory);

  res.json({
    totals: {
      employees: users.length,
      modules: modules.length,
      enrollments: live.length,
      completionRate: pct(completed.length, live.length),
      complianceRate: pct(mandatoryEnr.filter((e) => e.status === 'completed').length, mandatoryEnr.length),
      averageScore: avgScore,
      passRate: pct(results.filter((r) => r.passed).length, results.length),
      overdue: overdue.length,
    },
    byDepartment,
    byModule,
    certBreakdown,
    trend: months.map(({ key, ...m }) => m),
    overdueList: overdue
      .sort((a, b) => a.dueDate - b.dueDate)
      .slice(0, 15)
      .map((e) => ({
        _id: e._id,
        employee: userById.get(String(e.user))?.name,
        department: userById.get(String(e.user))?.department,
        module: moduleById.get(String(e.module))?.title,
        dueDate: e.dueDate,
        progress: e.progress,
      })),
  });
}));

export default router;
