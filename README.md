# SkillTrack — Employee Training & Compliance Platform (MERN)

Manages learning modules, assessments, certification tracking with expiry and renewal reminders, and performance analytics.

## Stack
- **MongoDB + Mongoose** — data models
- **Express + Node.js** — REST API, JWT auth, role-based access, `node-cron` reminder job, `nodemailer` emails
- **React (Vite) + React Router + Recharts** — client

## Quick start
Requirements: Node 18+, MongoDB running locally (or a MongoDB Atlas URI).

```bash
npm run install:all
cp server/.env.example server/.env      # edit MONGO_URI and JWT_SECRET
npm run seed                            # demo data (clears the database)
npm run dev                             # API on :5000, client on :5173
```

Demo logins (password `password123`): `admin@skilltrack.io`, `manager@skilltrack.io`, `priya@skilltrack.io`.

## Roles
| Role | Can do |
|---|---|
| Employee | Take modules, sit assessments, earn and renew certificates, see own dashboard and reminders |
| Manager | Everything above, plus analytics, certificate register and assignments **for their own department** |
| Admin | Organisation-wide analytics, create/edit/delete modules, assign to any department, change user roles, trigger reminders |

## How the core flows work
- **Learning modules**: content sections + multiple-choice questions. Reading sections moves progress to 90%; passing the assessment completes it (100%). Modules can be mandatory and targeted at departments; new employees are auto-enrolled in mandatory modules (due in 30 days).
- **Assessments**: graded server-side (correct answers are never sent to employees). Every attempt is stored with score, attempt number and time taken.
- **Certifications**: issued on pass, valid for `certificationValidityMonths` (0 = never expires). Status is computed as *active*, *expiring* (within `REMINDER_WINDOW_DAYS`) or *expired*. Retaking and passing renews the certificate and increments `renewalCount`. Certificates are printable / saveable as PDF.
- **Renewal reminders**: a cron job (`REMINDER_CRON`, default 09:00 daily) sends in-app notifications and emails for expiring/expired certificates and overdue training, at most once every 7 days per item. Without SMTP settings, emails are logged to the console. Admins can run it on demand from Analytics.
- **Analytics**: compliance rate (mandatory modules), completion by department, module pass rates and average scores, certificate status breakdown, 6-month activity trend, overdue list.

## API
| Method | Endpoint | Access |
|---|---|---|
| POST | `/api/auth/register`, `/api/auth/login` | public |
| GET | `/api/auth/me` | any |
| GET | `/api/modules`, `/api/modules/:id` | any |
| POST/PUT/DELETE | `/api/modules`, `/api/modules/:id` | admin |
| POST | `/api/modules/:id/enroll` | any |
| PATCH | `/api/modules/:id/progress` `{sectionIndex}` | any |
| POST | `/api/modules/:id/assign` `{department?, userIds?, dueDate?}` | admin, manager |
| POST | `/api/assessments/:moduleId/submit` `{answers:[idx]}` | any |
| GET | `/api/assessments/my` · `/api/assessments` | any · staff |
| GET | `/api/certifications/my` · `/api/certifications?status=` | any · staff |
| POST | `/api/certifications/run-reminders` | admin |
| GET/PATCH | `/api/notifications`, `/:id/read`, `/read-all` | any |
| GET | `/api/analytics/me` · `/api/analytics/overview` | any · staff |
| GET/PATCH | `/api/users`, `/api/users/departments`, `/api/users/:id` | staff · admin for PATCH |

## Project structure
```
server/
  config/db.js
  models/        User, Module, Enrollment, AssessmentResult, Certification, Notification
  routes/        auth, users, modules, assessments, certifications, notifications, analytics
  middleware/    auth (JWT + roles), error handling
  jobs/          reminders.js (cron)
  utils/         certStatus, mailer, token
  seed.js, server.js
client/src/
  pages/         Login, Register, Dashboard, Modules, ModuleDetail, Certifications,
                 Notifications, Analytics, People, ManageModules, ModuleForm
  components/    Layout, Certificate, ui
  context/       AuthContext
```

## Production notes
- Set a strong `JWT_SECRET` and `CLIENT_URL`; build the client with `npm run build --prefix client` and serve `client/dist` from a static host (set `VITE_API_URL` to the API origin).
- If you run multiple API instances, run the reminder job on only one (or move it to a separate worker).
