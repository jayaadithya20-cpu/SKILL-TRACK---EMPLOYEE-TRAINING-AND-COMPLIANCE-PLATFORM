import cron from 'node-cron';
import Certification from '../models/Certification.js';
import Enrollment from '../models/Enrollment.js';
import Notification from '../models/Notification.js';
import { sendEmail } from '../utils/mailer.js';
import { DAY, windowDays } from '../utils/certStatus.js';

// Sends certification-renewal and overdue-training reminders.
// Each item is reminded at most once every 7 days.
export async function runReminders() {
  const now = new Date();
  const horizon = new Date(now.getTime() + windowDays() * DAY);
  const resendBefore = new Date(now.getTime() - 7 * DAY);
  const notRecentlyReminded = { $or: [{ lastReminderSentAt: null }, { lastReminderSentAt: { $lt: resendBefore } }] };

  const certs = await Certification.find({ expiresAt: { $ne: null, $lte: horizon }, ...notRecentlyReminded })
    .populate('user', 'name email isActive')
    .populate('module', 'title');

  let certReminders = 0;
  for (const c of certs) {
    if (!c.user?.isActive || !c.module) continue;
    const expired = c.expiresAt < now;
    const days = Math.ceil(Math.abs(c.expiresAt - now) / DAY);
    const message = expired
      ? `Your "${c.module.title}" certification expired ${days} day(s) ago. Retake the assessment to renew it.`
      : `Your "${c.module.title}" certification expires in ${days} day(s). Retake the assessment to renew it.`;
    await Notification.create({ user: c.user._id, type: expired ? 'expired' : 'renewal', message, link: `/modules/${c.module._id}` });
    await sendEmail({ to: c.user.email, subject: expired ? 'Certification expired' : 'Certification renewal due', text: `Hi ${c.user.name},\n\n${message}` });
    c.lastReminderSentAt = now;
    await c.save();
    certReminders++;
  }

  const overdue = await Enrollment.find({ status: { $ne: 'completed' }, dueDate: { $lt: now }, ...notRecentlyReminded })
    .populate('user', 'name email isActive')
    .populate('module', 'title');

  let overdueReminders = 0;
  for (const e of overdue) {
    if (!e.user?.isActive || !e.module) continue;
    const message = `"${e.module.title}" was due on ${e.dueDate.toDateString()}. Please complete it as soon as possible.`;
    await Notification.create({ user: e.user._id, type: 'overdue', message, link: `/modules/${e.module._id}` });
    await sendEmail({ to: e.user.email, subject: 'Training overdue', text: `Hi ${e.user.name},\n\n${message}` });
    e.lastReminderSentAt = now;
    await e.save();
    overdueReminders++;
  }

  console.log(`[reminders] ${certReminders} renewal, ${overdueReminders} overdue`);
  return { certReminders, overdueReminders, ranAt: now };
}

export function startReminderJob() {
  const schedule = process.env.REMINDER_CRON || '0 9 * * *';
  cron.schedule(schedule, () => runReminders().catch((e) => console.error('Reminder job failed', e)));
  console.log(`Reminder job scheduled: ${schedule}`);
}
