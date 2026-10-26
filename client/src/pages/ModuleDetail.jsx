import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { useAuth } from '../context/AuthContext.jsx';
import { Alert, Category, Progress, Status } from '../components/ui.jsx';
import Certificate from '../components/Certificate.jsx';
import { fmtDate, relativeDue } from '../format.js';

export default function ModuleDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const [mod, setMod] = useState(null);
  const [error, setError] = useState('');
  const [active, setActive] = useState(0);
  const [mode, setMode] = useState('learn'); // learn | quiz | result
  const [answers, setAnswers] = useState([]);
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [showCert, setShowCert] = useState(false);
  const startedAt = useRef(null);

  const load = () =>
    api.get(`/modules/${id}`).then((r) => {
      setMod(r.data);
      const read = r.data.enrollment?.sectionsRead || [];
      const firstUnread = r.data.sections.findIndex((_, i) => !read.includes(i));
      setActive(firstUnread === -1 ? 0 : firstUnread);
    }).catch((e) => setError(errMsg(e)));

  useEffect(() => { load(); }, [id]);

  if (error && !mod) return <Alert>{error}</Alert>;
  if (!mod) return <p className="muted">Loading module…</p>;

  const enr = mod.enrollment;
  const read = enr?.sectionsRead || [];
  const allRead = mod.sections.length === 0 || read.length >= mod.sections.length || enr?.status === 'completed';
  const cert = mod.certification;

  const markRead = async () => {
    try {
      const r = await api.patch(`/modules/${id}/progress`, { sectionIndex: active });
      setMod({ ...mod, enrollment: r.data });
      if (active < mod.sections.length - 1) setActive(active + 1);
    } catch (e) { setError(errMsg(e)); }
  };

  const startQuiz = () => {
    setAnswers(Array(mod.questions.length).fill(null));
    startedAt.current = Date.now();
    setMode('quiz');
    window.scrollTo(0, 0);
  };

  const submit = async () => {
    setSubmitting(true); setError('');
    try {
      const r = await api.post(`/assessments/${id}/submit`, {
        answers,
        timeTakenSeconds: Math.round((Date.now() - startedAt.current) / 1000),
      });
      setResult(r.data);
      setMode('result');
      window.scrollTo(0, 0);
      load();
    } catch (e) { setError(errMsg(e)); }
    finally { setSubmitting(false); }
  };

  const answered = answers.filter((a) => a !== null).length;

  return (
    <>
      <p className="crumb"><Link to="/modules">Training modules</Link></p>
      <header className="page-head module-head">
        <div>
          <div className="module-tags">
            <Category value={mod.category} />
            {mod.isMandatory && <span className="tag-req">Required</span>}
          </div>
          <h1>{mod.title}</h1>
          <p className="lede">{mod.description}</p>
        </div>
        <aside className="module-facts">
          <dl>
            <dt>Status</dt><dd><Status value={enr?.status || 'not-started'} /></dd>
            <dt>Deadline</dt><dd>{enr?.dueDate ? `${fmtDate(enr.dueDate)} (${relativeDue(enr.dueDate)})` : 'None'}</dd>
            <dt>Pass mark</dt><dd>{mod.passingScore}%</dd>
            <dt>Certificate</dt>
            <dd>
              {cert ? (
                <button className="link" onClick={() => setShowCert(true)}>
                  <Status value={cert.status} /> until {cert.expiresAt ? fmtDate(cert.expiresAt) : 'no expiry'}
                </button>
              ) : mod.certificationValidityMonths ? `Valid ${mod.certificationValidityMonths} months` : 'Does not expire'}
            </dd>
          </dl>
          <Progress value={enr?.progress || 0} />
        </aside>
      </header>
      <Alert>{error}</Alert>

      {mode === 'learn' && (
        <div className="learn">
          <ol className="steps">
            {mod.sections.map((s, i) => (
              <li key={s._id || i}>
                <button className={`${i === active ? 'active' : ''} ${read.includes(i) ? 'done' : ''}`} onClick={() => setActive(i)}>
                  <span className="step-num">{read.includes(i) ? '✓' : i + 1}</span>{s.heading}
                </button>
              </li>
            ))}
            <li>
              <button className={`assess-step ${allRead ? '' : 'locked'}`} disabled={!allRead || !mod.questions.length} onClick={startQuiz}>
                <span className="step-num">?</span>Assessment
              </button>
            </li>
          </ol>

          <article className="reader">
            {mod.sections[active] ? (
              <>
                <h2>{mod.sections[active].heading}</h2>
                {mod.sections[active].body.split('\n').map((p, i) => <p key={i}>{p}</p>)}
                <div className="reader-actions">
                  {!read.includes(active) ? (
                    <button className="btn btn-primary" onClick={markRead}>Mark as read</button>
                  ) : active < mod.sections.length - 1 ? (
                    <button className="btn" onClick={() => setActive(active + 1)}>Next section</button>
                  ) : null}
                  {allRead && mod.questions.length > 0 && (
                    <button className="btn btn-primary" onClick={startQuiz}>
                      {enr?.status === 'completed' ? (cert && cert.status !== 'active' ? 'Retake to renew' : 'Retake assessment') : 'Start assessment'}
                    </button>
                  )}
                </div>
              </>
            ) : <p className="muted">This module has no reading content.</p>}
          </article>
        </div>
      )}

      {mode === 'quiz' && (
        <section className="quiz">
          <div className="quiz-bar">
            <span>{answered} of {mod.questions.length} answered</span>
            <button className="btn" onClick={() => setMode('learn')}>Back to reading</button>
          </div>
          <ol className="questions">
            {mod.questions.map((q, qi) => (
              <li key={q._id || qi}>
                <fieldset>
                  <legend>{q.question}</legend>
                  {q.options.map((opt, oi) => (
                    <label key={oi} className={`option ${answers[qi] === oi ? 'picked' : ''}`}>
                      <input type="radio" name={`q${qi}`} checked={answers[qi] === oi}
                        onChange={() => setAnswers(answers.map((a, i) => (i === qi ? oi : a)))} />
                      {opt}
                    </label>
                  ))}
                </fieldset>
              </li>
            ))}
          </ol>
          <button className="btn btn-primary" disabled={submitting || answered < mod.questions.length} onClick={submit}>
            {submitting ? 'Submitting…' : answered < mod.questions.length ? `Answer all questions to submit` : 'Submit answers'}
          </button>
        </section>
      )}

      {mode === 'result' && result && (
        <section className="result">
          <div className={`result-head ${result.passed ? 'ok' : 'bad'}`}>
            <span className="result-score">{result.score}%</span>
            <div>
              <h2>{result.passed ? 'Passed' : 'Not passed this time'}</h2>
              <p>
                {result.correct} of {result.total} correct · pass mark {result.passingScore}% · attempt #{result.attemptNumber}
              </p>
              {result.certification && (
                <p>Certificate {result.certification.renewalCount ? 'renewed' : 'issued'}{result.certification.expiresAt ? `, valid until ${fmtDate(result.certification.expiresAt)}` : ''}.</p>
              )}
            </div>
            <div className="result-actions">
              {result.certification && <button className="btn btn-primary" onClick={() => setShowCert(true)}>View certificate</button>}
              {!result.passed && <button className="btn btn-primary" onClick={startQuiz}>Try again</button>}
              <button className="btn" onClick={() => setMode('learn')}>Back to module</button>
            </div>
          </div>
          <ol className="questions review">
            {result.review.map((r, i) => (
              <li key={i} className={r.correct ? 'right' : 'wrong'}>
                <p className="q">{r.question}</p>
                <p className="small">Your answer: {r.selected !== null ? r.options[r.selected] : 'No answer'}</p>
                {!r.correct && <p className="small">Correct answer: <strong>{r.options[r.correctIndex]}</strong></p>}
              </li>
            ))}
          </ol>
        </section>
      )}

      {showCert && (cert || result?.certification) && (
        <Certificate cert={{ ...(cert || result.certification), module: { title: mod.title } }} holder={user.name} onClose={() => setShowCert(false)} />
      )}
    </>
  );
}
