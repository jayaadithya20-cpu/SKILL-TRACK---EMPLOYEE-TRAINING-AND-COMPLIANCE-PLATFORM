// Populates the database with demo users, modules, enrollments, results and certifications.
// Run: npm run seed   (WARNING: clears existing data)
import 'dotenv/config';
import mongoose from 'mongoose';
import connectDB from './config/db.js';
import User from './models/User.js';
import Module from './models/Module.js';
import Enrollment from './models/Enrollment.js';
import AssessmentResult from './models/AssessmentResult.js';
import Certification from './models/Certification.js';
import Notification from './models/Notification.js';
import { DAY, addMonths } from './utils/certStatus.js';

const daysAgo = (n) => new Date(Date.now() - n * DAY);
const daysAhead = (n) => new Date(Date.now() + n * DAY);

const modules = [
  {
    title: 'Data Protection & Privacy Essentials',
    description: 'How to handle personal data lawfully, spot breaches, and report them on time.',
    category: 'compliance', durationMinutes: 40, isMandatory: true, certificationValidityMonths: 12,
    sections: [
      { heading: 'What counts as personal data', body: 'Personal data is any information that identifies a person directly or indirectly: names, emails, ID numbers, location data, and online identifiers such as IP addresses.' },
      { heading: 'Lawful processing', body: 'Collect only what you need, for a stated purpose, and keep it only as long as necessary. Consent must be specific, informed and freely given.' },
      { heading: 'Breach reporting', body: 'If you suspect a breach, report it to the Data Protection Officer immediately. Regulators typically expect notification within 72 hours of discovery.' },
    ],
    questions: [
      { question: 'Which of these is personal data?', options: ['Company revenue', 'An employee\'s IP address', 'Office floor plan', 'Product price list'], correctIndex: 1 },
      { question: 'Within how many hours must a breach usually be reported to the regulator?', options: ['24', '48', '72', '168'], correctIndex: 2 },
      { question: 'Data minimisation means…', options: ['Compressing files', 'Collecting only the data you need', 'Deleting all data yearly', 'Encrypting everything'], correctIndex: 1 },
      { question: 'You suspect a breach. What do you do first?', options: ['Wait to confirm', 'Tell colleagues', 'Report to the DPO', 'Delete the data'], correctIndex: 2 },
    ],
  },
  {
    title: 'Workplace Health & Safety',
    description: 'Hazard recognition, emergency procedures and incident reporting.',
    category: 'safety', durationMinutes: 30, isMandatory: true, certificationValidityMonths: 24,
    sections: [
      { heading: 'Identifying hazards', body: 'Hazards include trip risks, faulty electrical equipment, poor ergonomics and blocked fire exits. Report them through the safety portal.' },
      { heading: 'Emergency procedures', body: 'Know your nearest exit and assembly point. Never use lifts during a fire evacuation.' },
    ],
    questions: [
      { question: 'During a fire evacuation you should…', options: ['Use the lift', 'Use the stairs', 'Collect belongings first', 'Wait at your desk'], correctIndex: 1 },
      { question: 'A blocked fire exit should be…', options: ['Ignored', 'Reported immediately', 'Reported at month end', 'Moved by yourself only'], correctIndex: 1 },
    ],
  },
  {
    title: 'Anti-Bribery & Code of Conduct',
    description: 'Gifts, hospitality, conflicts of interest and how to raise concerns.',
    category: 'compliance', durationMinutes: 25, isMandatory: true, certificationValidityMonths: 12,
    sections: [
      { heading: 'Gifts and hospitality', body: 'Gifts above the policy threshold must be declared in the gifts register. Never accept cash or cash equivalents.' },
      { heading: 'Speaking up', body: 'Use the confidential whistleblowing line. Retaliation against anyone raising a concern in good faith is prohibited.' },
    ],
    questions: [
      { question: 'A supplier offers you a gift card. You should…', options: ['Accept it', 'Decline it', 'Accept and share it', 'Accept after the deal'], correctIndex: 1 },
      { question: 'Retaliation against whistleblowers is…', options: ['Allowed if justified', 'Prohibited', 'Up to managers', 'Only reviewed by HR'], correctIndex: 1 },
    ],
  },
  {
    title: 'Secure Coding Fundamentals',
    description: 'Input validation, injection attacks, secrets management and dependency hygiene.',
    category: 'technical', durationMinutes: 60, isMandatory: false, departments: ['Engineering'], certificationValidityMonths: 18,
    sections: [
      { heading: 'Validate all input', body: 'Treat every external input as untrusted. Validate type, length and format on the server, not only on the client.' },
      { heading: 'Injection', body: 'Use parameterised queries or an ORM. Never build queries with string concatenation of user input.' },
      { heading: 'Secrets', body: 'Store secrets in a vault or environment variables, never in source control.' },
    ],
    questions: [
      { question: 'Best defence against SQL injection?', options: ['Client-side validation', 'Parameterised queries', 'Hiding errors', 'Rate limiting'], correctIndex: 1 },
      { question: 'Where should API keys live?', options: ['In the repo', 'In a secrets manager / env vars', 'In comments', 'In the frontend bundle'], correctIndex: 1 },
      { question: 'Server-side validation is…', options: ['Optional', 'Required even with client validation', 'Only for admins', 'Slower so skip it'], correctIndex: 1 },
    ],
  },
  {
    title: 'Giving Effective Feedback',
    description: 'A practical model for feedback that is specific, timely and actionable.',
    category: 'soft-skills', durationMinutes: 20, isMandatory: false, certificationValidityMonths: 0,
    sections: [
      { heading: 'Situation, behaviour, impact', body: 'Describe the situation, the observable behaviour, and its impact. Avoid judging personality.' },
    ],
    questions: [
      { question: 'Good feedback focuses on…', options: ['Personality', 'Observable behaviour', 'Rumours', 'Past years'], correctIndex: 1 },
    ],
  },
];

async function seed() {
  await connectDB();
  await Promise.all([User, Module, Enrollment, AssessmentResult, Certification, Notification].map((M) => M.deleteMany({})));

  const admin = await User.create({ name: 'Anita Rao', email: 'admin@skilltrack.io', password: 'password123', role: 'admin', department: 'HR', jobTitle: 'L&D Lead' });
  await User.create({ name: 'Vikram Shah', email: 'manager@skilltrack.io', password: 'password123', role: 'manager', department: 'Engineering', jobTitle: 'Engineering Manager' });

  const people = [
    ['Priya Nair', 'priya@skilltrack.io', 'Engineering', 'Backend Developer'],
    ['Arjun Mehta', 'arjun@skilltrack.io', 'Engineering', 'Frontend Developer'],
    ['Kavya Iyer', 'kavya@skilltrack.io', 'Sales', 'Account Executive'],
    ['Rahul Verma', 'rahul@skilltrack.io', 'Sales', 'Sales Associate'],
    ['Meera Pillai', 'meera@skilltrack.io', 'Finance', 'Analyst'],
    ['Sanjay Kumar', 'sanjay@skilltrack.io', 'Operations', 'Ops Coordinator'],
  ];
  const employees = [];
  for (const [name, email, department, jobTitle] of people) {
    employees.push(await User.create({ name, email, password: 'password123', department, jobTitle }));
  }

  const mods = await Module.insertMany(modules.map((m) => ({ ...m, createdBy: admin._id })));

  // Deterministic pseudo-random so demo data is stable
  let seedN = 7;
  const rand = () => ((seedN = (seedN * 9301 + 49297) % 233280) / 233280);

  for (const emp of employees) {
    for (const mod of mods) {
      const applies = !mod.departments.length || mod.departments.includes(emp.department);
      if (!applies || (!mod.isMandatory && rand() < 0.4)) continue;

      const roll = rand();
      const dueDate = mod.isMandatory ? daysAhead(Math.round(rand() * 40) - 15) : undefined;

      if (roll < 0.55) {
        // Completed: give it a result and a certificate, some near or past expiry
        const completedAt = daysAgo(Math.round(rand() * 170) + 5);
        const score = 70 + Math.round(rand() * 30);
        await Enrollment.create({ user: emp._id, module: mod._id, status: 'completed', progress: 100, sectionsRead: mod.sections.map((_, i) => i), dueDate, completedAt });
        if (rand() < 0.4) {
          await AssessmentResult.create({ user: emp._id, module: mod._id, score: 40 + Math.round(rand() * 25), passed: false, attemptNumber: 1, totalQuestions: mod.questions.length, createdAt: new Date(completedAt - 2 * DAY) });
        }
        await AssessmentResult.create({ user: emp._id, module: mod._id, score, passed: true, attemptNumber: 1, totalQuestions: mod.questions.length, createdAt: completedAt });
        let expiresAt = mod.certificationValidityMonths ? addMonths(completedAt, mod.certificationValidityMonths) : null;
        const twist = rand();
        if (expiresAt && twist < 0.2) expiresAt = daysAhead(Math.round(rand() * 25) + 2); // expiring soon
        else if (expiresAt && twist < 0.3) expiresAt = daysAgo(Math.round(rand() * 20) + 1); // expired
        await Certification.create({
          user: emp._id, module: mod._id, score, issuedAt: completedAt, expiresAt,
          certificateId: `CERT-${completedAt.getFullYear()}-${Math.floor(rand() * 0xffffffff).toString(16).toUpperCase().padStart(8, '0')}`,
        });
      } else if (roll < 0.8) {
        await Enrollment.create({ user: emp._id, module: mod._id, status: 'in-progress', progress: 30, sectionsRead: [0], dueDate });
      } else {
        await Enrollment.create({ user: emp._id, module: mod._id, dueDate });
      }
    }
  }

  console.log('\nSeed complete. All passwords: password123');
  console.log('  admin@skilltrack.io   (admin)');
  console.log('  manager@skilltrack.io (manager, Engineering)');
  console.log('  priya@skilltrack.io   (employee, Engineering)\n');
  await mongoose.disconnect();
}

seed().catch((e) => { console.error(e); process.exit(1); });
