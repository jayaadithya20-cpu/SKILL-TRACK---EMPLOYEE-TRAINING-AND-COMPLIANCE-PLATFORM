import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { errMsg } from '../api.js';
import { Alert } from '../components/ui.jsx';
import { CATEGORIES, categoryLabel } from '../format.js';

const blank = {
  title: '', description: '', category: 'compliance', durationMinutes: 30,
  isMandatory: false, departments: [], passingScore: 70, certificationValidityMonths: 12,
  isPublished: true,
  sections: [{ heading: '', body: '' }],
  questions: [{ question: '', options: ['', ''], correctIndex: 0 }],
};

export default function ModuleForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const [form, setForm] = useState(blank);
  const [deptText, setDeptText] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!id) return;
    api.get(`/modules/${id}`).then((r) => {
      setForm({ ...blank, ...r.data });
      setDeptText(r.data.departments.join(', '));
    }).catch((e) => setError(errMsg(e)));
  }, [id]);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setItem = (key, i, patch) => set(key, form[key].map((x, j) => (j === i ? { ...x, ...patch } : x)));
  const removeItem = (key, i) => set(key, form[key].filter((_, j) => j !== i));

  const save = async (e) => {
    e.preventDefault();
    setSaving(true); setError('');
    const { enrollment, certification, _id, __v, createdAt, updatedAt, createdBy, ...rest } = form; // eslint-disable-line no-unused-vars
    const payload = {
      ...rest,
      departments: deptText.split(',').map((d) => d.trim()).filter(Boolean),
      durationMinutes: Number(form.durationMinutes),
      passingScore: Number(form.passingScore),
      certificationValidityMonths: Number(form.certificationValidityMonths),
    };
    try {
      if (id) await api.put(`/modules/${id}`, payload);
      else await api.post('/modules', payload);
      nav('/manage');
    } catch (err) { setError(errMsg(err)); }
    finally { setSaving(false); }
  };

  return (
    <form onSubmit={save} className="module-form">
      <p className="crumb"><Link to="/manage">Manage modules</Link></p>
      <header className="page-head row">
        <h1>{id ? 'Edit module' : 'New module'}</h1>
        <button className="btn btn-primary" disabled={saving}>{saving ? 'Saving…' : id ? 'Save changes' : 'Create module'}</button>
      </header>
      <Alert>{error}</Alert>

      <section className="panel form-grid">
        <label className="span-2">Title<input required value={form.title} onChange={(e) => set('title', e.target.value)} /></label>
        <label className="span-2">Description<textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} /></label>
        <label>Category
          <select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{categoryLabel(c)}</option>)}
          </select>
        </label>
        <label>Duration (minutes)<input type="number" min={1} value={form.durationMinutes} onChange={(e) => set('durationMinutes', e.target.value)} /></label>
        <label>Pass mark (%)<input type="number" min={0} max={100} value={form.passingScore} onChange={(e) => set('passingScore', e.target.value)} /></label>
        <label>Certificate valid for (months, 0 = never expires)<input type="number" min={0} value={form.certificationValidityMonths} onChange={(e) => set('certificationValidityMonths', e.target.value)} /></label>
        <label className="span-2">Departments (comma separated, leave empty for everyone)<input value={deptText} onChange={(e) => setDeptText(e.target.value)} placeholder="Engineering, Sales" /></label>
        <label className="check"><input type="checkbox" checked={form.isMandatory} onChange={(e) => set('isMandatory', e.target.checked)} /> Mandatory for the selected departments</label>
        <label className="check"><input type="checkbox" checked={form.isPublished} onChange={(e) => set('isPublished', e.target.checked)} /> Published (visible to employees)</label>
      </section>

      <section className="panel">
        <div className="row"><h3>Learning content</h3><button type="button" className="btn btn-sm" onClick={() => set('sections', [...form.sections, { heading: '', body: '' }])}>Add section</button></div>
        {form.sections.map((s, i) => (
          <div key={i} className="editor-item">
            <div className="row">
              <strong>Section {i + 1}</strong>
              {form.sections.length > 1 && <button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem('sections', i)}>Remove</button>}
            </div>
            <label>Heading<input required value={s.heading} onChange={(e) => setItem('sections', i, { heading: e.target.value })} /></label>
            <label>Content<textarea required rows={4} value={s.body} onChange={(e) => setItem('sections', i, { body: e.target.value })} /></label>
          </div>
        ))}
      </section>

      <section className="panel">
        <div className="row"><h3>Assessment questions</h3><button type="button" className="btn btn-sm" onClick={() => set('questions', [...form.questions, { question: '', options: ['', ''], correctIndex: 0 }])}>Add question</button></div>
        {form.questions.map((q, i) => (
          <div key={i} className="editor-item">
            <div className="row">
              <strong>Question {i + 1}</strong>
              <button type="button" className="btn btn-sm btn-danger" onClick={() => removeItem('questions', i)}>Remove</button>
            </div>
            <label>Question<input required value={q.question} onChange={(e) => setItem('questions', i, { question: e.target.value })} /></label>
            <p className="small muted">Select the correct answer with the radio button.</p>
            {q.options.map((opt, oi) => (
              <div key={oi} className="option-edit">
                <input type="radio" name={`correct-${i}`} checked={q.correctIndex === oi} onChange={() => setItem('questions', i, { correctIndex: oi })} aria-label={`Mark option ${oi + 1} correct`} />
                <input required value={opt} placeholder={`Option ${oi + 1}`}
                  onChange={(e) => setItem('questions', i, { options: q.options.map((o, k) => (k === oi ? e.target.value : o)) })} />
                {q.options.length > 2 && (
                  <button type="button" className="btn btn-sm" onClick={() => setItem('questions', i, {
                    options: q.options.filter((_, k) => k !== oi),
                    correctIndex: q.correctIndex >= oi && q.correctIndex > 0 ? q.correctIndex - 1 : q.correctIndex,
                  })}>Remove</button>
                )}
              </div>
            ))}
            {q.options.length < 6 && <button type="button" className="btn btn-sm" onClick={() => setItem('questions', i, { options: [...q.options, ''] })}>Add option</button>}
          </div>
        ))}
      </section>
    </form>
  );
}
