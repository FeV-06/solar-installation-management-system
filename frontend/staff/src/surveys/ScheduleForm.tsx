import { useState, type FormEvent } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { CalendarClock, ChevronDown } from 'lucide-react';
import { fetchTechnicians, rescheduleSurvey, scheduleSurvey, SURVEYS_KEY, type Survey } from '../api/surveys';
import { ApiError } from '../api/errors';
import { Icon } from '../components/Icon';
import { FormNotice, SubmitButton } from '../components/SubmitButton';
import { QueryView } from '../states/QueryView';

function localDateTime(iso?: string) {
  if (!iso) return '';
  const date = new Date(iso);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** Schedule a new visit or change a scheduled visit. Date input is local to the browser; API receives UTC. */
export function ScheduleForm({ installationId, existing, onCancel }: { installationId: number; existing?: Survey; onCancel?: () => void }) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [technicianId, setTechnicianId] = useState(existing ? String(existing.technicianId) : '');
  const [scheduledAt, setScheduledAt] = useState(localDateTime(existing?.scheduledAt));
  const [notice, setNotice] = useState<string | null>(null);
  const technicians = useQuery({ queryKey: ['technicians', 'active'], queryFn: ({ signal }) => fetchTechnicians(signal) });
  const mutation = useMutation({ mutationFn: (body: { technicianId: number; scheduledAt: string }) => existing
    ? rescheduleSurvey(existing.id, body) : scheduleSurvey(installationId, body) });

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (mutation.isPending) return;
    setNotice(null);
    const date = new Date(scheduledAt);
    if (!technicianId || !scheduledAt || Number.isNaN(date.getTime())) { setNotice('Choose a technician and a valid appointment.'); return; }
    try {
      const saved = await mutation.mutateAsync({ technicianId: Number(technicianId), scheduledAt: date.toISOString() });
      await queryClient.invalidateQueries({ queryKey: SURVEYS_KEY });
      void queryClient.invalidateQueries({ queryKey: ['installation', installationId] });
      if (existing) onCancel?.(); else navigate(`/surveys/${saved.id}`);
    } catch (error) {
      setNotice(error instanceof ApiError ? error.message : 'Could not save the appointment. Try again.');
      if (error instanceof ApiError && error.kind === 'conflict') void queryClient.invalidateQueries({ queryKey: SURVEYS_KEY });
    }
  };

  return <section className="survey-panel" aria-labelledby="schedule-heading">
    <h2 className="a-heading" id="schedule-heading">{existing ? 'Change appointment' : 'Schedule a survey'}</h2>
    <p>Assign an active technician and set the visit time. Times use your device’s time zone.</p>
    <QueryView query={technicians} what="the technicians">
      {people => people.length === 0 ? <div className="survey-empty"><p>No active technicians are available.</p><Link className="link" to="/users">Create or reactivate a technician</Link></div> :
        <form className="survey-form" onSubmit={event => void submit(event)}>
          {notice && <FormNotice>{notice}</FormNotice>}
          <div className="survey-fields">
            <div className="field"><label className="field-label" htmlFor="survey-technician">Technician</label><div className="control">
              <select id="survey-technician" name="technicianId" required value={technicianId} onChange={event => setTechnicianId(event.target.value)}>
                <option value="">Choose technician</option>{people.map(person => <option key={person.id} value={person.id}>{person.name} · {person.email}</option>)}
              </select>
              <Icon icon={ChevronDown} className="chev" />
            </div></div>
            <div className="field"><label className="field-label" htmlFor="survey-when">Appointment</label><div className="control">
              <input id="survey-when" name="scheduledAt" type="datetime-local" required value={scheduledAt} onChange={event => setScheduledAt(event.target.value)} />
            </div></div>
          </div>
          <div className="survey-actions">{onCancel && <button className="btn btn-quiet" type="button" onClick={onCancel}>Cancel</button>}
            <SubmitButton busy={mutation.isPending}><Icon icon={CalendarClock} />{existing ? 'Save appointment' : 'Schedule survey'}</SubmitButton>
          </div>
        </form>}
    </QueryView>
  </section>;
}
