import { fmtDate } from '../format.js';

export default function Certificate({ cert, holder, onClose }) {
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal cert-modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-label="Certificate">
        <div className="certificate" id="printable-cert">
          <div className="cert-border">
            <p className="cert-org">SkillTrack Learning & Compliance</p>
            <h2 className="cert-title">Certificate of Completion</h2>
            <p className="cert-text">This certifies that</p>
            <p className="cert-name">{holder}</p>
            <p className="cert-text">has successfully completed the assessment for</p>
            <p className="cert-module">{cert.module?.title}</p>
            <div className="cert-meta">
              <div><span>Score</span>{cert.score ?? '—'}%</div>
              <div><span>Issued</span>{fmtDate(cert.issuedAt)}</div>
              <div><span>Valid until</span>{cert.expiresAt ? fmtDate(cert.expiresAt) : 'No expiry'}</div>
            </div>
            <div className="seal" aria-hidden="true"><span>Certified</span></div>
            <p className="cert-id">{cert.certificateId}</p>
          </div>
        </div>
        <div className="modal-actions no-print">
          <button className="btn" onClick={onClose}>Close</button>
          <button className="btn btn-primary" onClick={() => window.print()}>Print or save as PDF</button>
        </div>
      </div>
    </div>
  );
}
