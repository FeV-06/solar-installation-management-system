import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, Zap } from 'lucide-react';
import { ApiError } from '../api/errors';
import { fetchSurvey, reviewSurvey, surveyKey, SURVEYS_KEY, type Survey } from '../api/surveys';
import { Icon } from '../components/Icon';
import { FormNotice } from '../components/SubmitButton';
import { formatMoment } from '../lib/dates';
import { idFrom } from '../lib/ids';
import { cityLine } from '../leads/view';
import { useCurrentUser } from '../session/session';
import { NotFound } from '../states/States';
import { QueryView } from '../states/QueryView';
import { SurveyChip } from './SurveyChip';
import { ScheduleForm } from './ScheduleForm';
import { ReportForm } from './ReportForm';

export function SurveyPage() {
  const { role } = useCurrentUser();
  const id = idFrom(useParams().id);
  const base = role === 'Admin' ? '/surveys' : '/my-work';
  const query = useQuery({ queryKey: surveyKey(id ?? 0), queryFn: ({ signal }) => fetchSurvey(id!, signal), enabled: id !== null });
  const back = { to: base, label: role === 'Admin' ? 'Back to surveys' : 'Back to my work' };
  if (id === null) return <NotFound noun="survey" back={back} />;
  return <QueryView query={query} what="this survey" notFound={<NotFound noun="survey" back={back} />}>
    {survey => <SurveyView key={survey.id} survey={survey} isAdmin={role === 'Admin'} base={base} />}
  </QueryView>;
}

function SurveyView({ survey, isAdmin, base }: { survey: Survey; isAdmin: boolean; base: string }) {
  const [editingSchedule, setEditingSchedule] = useState(false);
  return <>
    <div className="page-head"><Link className="btn btn-quiet btn-sm back" to={base}><Icon icon={ArrowLeft} />{isAdmin ? 'Surveys' : 'My work'}</Link>
      <div className="row"><h1 className="a-title" id="page-title" tabIndex={-1}>Site survey <SurveyChip status={survey.status} /></h1></div>
    </div>
    <p className="page-intro">{survey.customerName} · {survey.address.street}, {cityLine(survey.address)}</p>
    <div className="rec-grid">
      <div className="rec-card"><h2 className="a-heading">Visit</h2><dl className="kv">
        <dt>Appointment</dt><dd>{formatMoment(survey.scheduledAt)}</dd><dt>Technician</dt><dd>{survey.technicianName}</dd>
        <dt>Customer</dt><dd>{isAdmin ? <Link to={`/customers/${survey.customerId}`}>{survey.customerName}</Link> : survey.customerName}</dd>
        <dt>Phone</dt><dd><a href={`tel:${survey.customerPhone.replace(/[^\d+]/g, '')}`}>{survey.customerPhone}</a></dd>
        <dt>Site</dt><dd>{survey.address.street}<br />{cityLine(survey.address)}</dd>
      </dl>{isAdmin && <Link className="link" to={`/installations/${survey.installationId}`}>Open installation</Link>}</div>
      <div className="rec-card"><h2 className="a-heading">Progress</h2><dl className="kv">
        <dt>Scheduled</dt><dd>{formatMoment(survey.createdAt)}</dd>
        <dt>Report</dt><dd>{survey.submittedAt ? `Submitted ${formatMoment(survey.submittedAt)}` : 'Not submitted yet'}</dd>
        <dt>Review</dt><dd>{survey.reviewedAt ? `${survey.status} ${formatMoment(survey.reviewedAt)}` : 'Awaiting review'}</dd>
      </dl>{isAdmin && survey.status === 'Scheduled' && !editingSchedule && <button className="btn btn-secondary" type="button" onClick={() => setEditingSchedule(true)}>Change appointment</button>}</div>
    </div>
    {editingSchedule && <ScheduleForm installationId={survey.installationId} existing={survey} onCancel={() => setEditingSchedule(false)} />}
    {survey.status === 'Scheduled' && !isAdmin && <ReportForm survey={survey} />}
    {survey.status === 'Scheduled' && isAdmin && <div className="notice tone-info survey-followup"><p className="notice-title">Waiting for the site report</p><p>{survey.technicianName} will submit the measurements after the visit. You can review them here once submitted.</p></div>}
    {survey.status !== 'Scheduled' && <ReportDetails survey={survey} />}
    {isAdmin && survey.status === 'Submitted' && <ReviewForm survey={survey} />}
    {survey.status === 'Rejected' && <div className="notice tone-warning survey-followup"><p className="notice-title">Survey rejected</p><p>{survey.reviewNotes || 'No review notes were provided.'}</p>{isAdmin && <div className="actions"><Link className="btn btn-secondary btn-sm" to={`/installations/${survey.installationId}`}>Schedule another visit</Link></div>}</div>}
    {survey.status === 'Approved' && (
      <div className="notice tone-positive survey-followup">
        <p className="notice-title">Survey approved</p>
        <p>The system quotation and exact Bill of Materials (BOM) have been automatically generated for this installation.</p>
        {isAdmin && (
          <div className="actions">
            <Link className="btn btn-secondary btn-sm" to={`/installations/${survey.installationId}`}>
              View quote and BOM
            </Link>
          </div>
        )}
      </div>
    )}
    {survey.status === 'Approved' && !isAdmin && (
      <section className="survey-panel" aria-labelledby="commissioning-title">
        <div className="section-title">
          <h2 className="a-heading" id="commissioning-title">Field commissioning and handover</h2>
          <span className="a-label">On-site checklist</span>
        </div>
        <p className="a-body">
          On-site crew work checklist: test measured generation, capture 3-angle photo proofs, and obtain customer screen sign-off.
        </p>
        <div className="survey-actions">
          <Link
            to={`/installations/${survey.installationId}/commission`}
            className="btn btn-primary"
          >
            <Icon icon={Zap} />
            <span>Open commissioning form</span>
          </Link>
        </div>
      </section>
    )}
  </>;
}

function ReportDetails({ survey }: { survey: Survey }) {
  return <section className="survey-panel" aria-labelledby="report-details"><h2 className="a-heading" id="report-details">Site report</h2>
    <dl className="survey-measurements">
      <div><dt>Shadow-free area</dt><dd>{survey.shadowFreeRoofAreaSquareMetres} m²</dd></div>
      <div><dt>Monthly bill</dt><dd>{survey.monthlyBillRupees === null ? 'Not recorded' : new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(survey.monthlyBillRupees)}</dd></div>
      <div><dt>Grid connection</dt><dd>{survey.gridSuitable === null ? 'Not recorded' : survey.gridSuitable ? 'Suitable' : 'Not suitable'}</dd></div>
      <div><dt>Roof direction</dt><dd>{survey.roofDirectionDegrees}° from north</dd></div>
      <div><dt>Roof tilt</dt><dd>{survey.roofTiltDegrees}°</dd></div>
      <div><dt>Cable distance</dt><dd>{survey.cableDistanceMetres} m</dd></div>
    </dl>
    {survey.notes && <p className="survey-notes"><b>Technician notes</b><br />{survey.notes}</p>}
    {survey.reviewNotes && survey.status !== 'Rejected' && <p className="survey-notes"><b>Review notes</b><br />{survey.reviewNotes}</p>}
  </section>;
}

function ReviewForm({ survey }: { survey: Survey }) {
  const client = useQueryClient();
  const [decision, setDecision] = useState<'approve' | 'reject' | null>(null);
  const [notes, setNotes] = useState('');
  const [notice, setNotice] = useState<string | null>(null);
  const mutation = useMutation({ mutationFn: (approved: boolean) => reviewSurvey(survey.id, approved, notes.trim() || null) });
  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending || !decision) return;
    if (decision === 'reject' && !notes.trim()) { setNotice('Add a reason so the team knows what to revisit.'); return; }
    setNotice(null);
    try {
      await mutation.mutateAsync(decision === 'approve');
      await Promise.all([client.invalidateQueries({ queryKey: SURVEYS_KEY }), client.invalidateQueries({ queryKey: ['installation', survey.installationId] }), client.invalidateQueries({ queryKey: ['customers'] })]);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'Could not save the review. Try again.');
      if (error instanceof ApiError && error.kind === 'conflict') void client.invalidateQueries({ queryKey: SURVEYS_KEY });
    }
  };
  return <section className="survey-panel" aria-labelledby="review-heading"><h2 className="a-heading" id="review-heading">Review the survey</h2>
    <p>Approve the report to move this installation to design, or reject it and schedule a new visit.</p>
    {!decision ? <div className="survey-actions"><button className="btn btn-secondary" type="button" onClick={() => setDecision('reject')}>Reject report</button>
      <button className="btn btn-primary" type="button" onClick={() => setDecision('approve')}>Approve report</button></div> :
      <form className="survey-form" onSubmit={event => void submit(event)}>
        {notice && <FormNotice>{notice}</FormNotice>}
        <div className="field"><label className="field-label" htmlFor="review-notes">{decision === 'reject' ? 'Reason for rejection' : 'Review notes'} {decision === 'approve' && <span className="opt">Optional</span>}</label>
          <div className="control control-area"><textarea id="review-notes" maxLength={2000} required={decision === 'reject'} value={notes} onChange={event => setNotes(event.target.value)} /></div></div>
        <div className="survey-actions"><button className="btn btn-quiet" type="button" onClick={() => { setDecision(null); setNotice(null); }}>Cancel</button>
          <button className={`btn ${decision === 'reject' ? 'btn-danger' : 'btn-primary'}`} type="submit" disabled={mutation.isPending}>{mutation.isPending ? 'Saving…' : decision === 'reject' ? 'Confirm rejection' : 'Confirm approval'}</button></div>
      </form>}
  </section>;
}
